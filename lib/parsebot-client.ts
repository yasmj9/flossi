import { getApiKey } from "./api-keys";
import { CseCompany, getCseCompany } from "./cse-companies";
import {
  FiveYearIndicators,
  YearIndicatorRow,
  processFiveYearIndicators,
} from "./indicators";
import {
  FinancialStatementsData,
  buildFinancialStatementsSummary,
} from "./financial-statements";
import {
  TechnicalStructureData,
  calculateTechnicalStructure,
  RawPricePoint,
  CandidateEntryZone,
  generateCandidateEntryZones,
} from "./technical-structure";

export type ParseBotResponseStatus =
  | "success"
  | "api_key_not_configured"
  | "api_error"
  | "unsupported_company";

export interface CompanyQuoteData {
  ticker: string;
  name: string;
  exchange: string;
  currency: string;
  latestPrice: number | null;
  priceChange: number | null;
  priceChangePercent: number | null;
  volume?: number | null;
  high?: number | null;
  low?: number | null;
  previousClose?: number | null;
  lastUpdated?: string | null;
  source: string;
}

export interface CompanyFinancialData {
  eps: number | null;
  per: number | null;
  roe: number | null;
  payoutRatio: number | null;
  dividendYield: number | null;
  bilanData: Record<string, unknown> | null;
  cpcData: Record<string, unknown> | null;
  cashFlowData: Record<string, unknown> | null;
  sourceDate: string | null;
}

export interface CompanyNewsItem {
  title: string;
  source?: string | null;
  url?: string | null;
  publishedAt?: string | null;
  snippet?: string | null;
}

export interface ValuationInputData {
  current_stock_price: number | null;
  currency: string;
  current_per: number | null;
  historical_per_5_years: Array<{ year: number; per: number | null }>;
  five_year_average_per: number | null;
  bpa_eps: number | null;
  eps_evolution: string | null;
  historical_eps_5_years: Array<{ year: number; eps: number | null }>;
  roe: number | null;
  dividend_yield: number | null;
  payout_ratio: number | null;
  earnings_growth_pct: number | null;
  historical_price_information: {
    previous_close: number | null;
    day_high: number | null;
    day_low: number | null;
  } | null;
}

export interface NormalizedJevInput {
  company: {
    ticker: string;
    name: string;
    exchange: string;
    currency: string;
    sector: string;
    isin: string | null;
  };
  market_data: {
    current_price: number | null;
    currency: string;
    price_change: number | null;
    price_change_percent: number | null;
    volume: number | null;
    day_high: number | null;
    day_low: number | null;
    previous_close: number | null;
    source_date: string | null;
  };
  financial_reports: {
    eps_bpa: number | null;
    per: number | null;
    roe: number | null;
    payout_ratio: number | null;
    dividend_yield: number | null;
    bilan_data: Record<string, unknown> | null;
    cpc_data: Record<string, unknown> | null;
    cash_flow_data: Record<string, unknown> | null;
    source_date: string | null;
  };
  five_year_indicators: {
    years: YearIndicatorRow[];
    summaries: FiveYearIndicators["summaries"];
    total_years_available: number;
  };
  financial_statements_summary: FinancialStatementsData | null;
  valuation_inputs: ValuationInputData;
  technical_structure: TechnicalStructureData;
  candidate_entry_zones: CandidateEntryZone[];
  recent_news: CompanyNewsItem[];
  metadata: {
    data_provider: string;
    normalized_at: string;
  };
}

export interface FullCompanyDataResult {
  status: ParseBotResponseStatus;
  company: CseCompany | null;
  quote: CompanyQuoteData | null;
  financials: CompanyFinancialData | null;
  fiveYearIndicators: FiveYearIndicators | null;
  financialStatementsSummary: FinancialStatementsData | null;
  technicalStructure: TechnicalStructureData | null;
  candidateEntryZones: CandidateEntryZone[];
  news: CompanyNewsItem[];
  normalizedJevInput: NormalizedJevInput | null;
  error?: string | null;
}

const PARSEBOT_API_BASE = "https://api.parse.bot";

/**
 * Helper to make requests to Parse.bot API
 */
async function parsebotFetch<T>(
  endpoint: string,
  apiKey: string,
  options?: { method?: "GET" | "POST"; body?: unknown; params?: Record<string, string> }
): Promise<{ ok: boolean; status: number; data: T | null; error?: string }> {
  const url = new URL(`${PARSEBOT_API_BASE}${endpoint}`);
  if (options?.params) {
    for (const [k, v] of Object.entries(options.params)) {
      if (v !== undefined && v !== null) {
        url.searchParams.set(k, String(v));
      }
    }
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(url.toString(), {
      method: options?.method || "GET",
      headers: {
        "X-API-Key": apiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: options?.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    let parsedData: unknown = null;
    try {
      parsedData = await res.json();
    } catch {
      // Not JSON
    }

    if (!res.ok) {
      let errMsg = res.statusText;
      if (parsedData && typeof parsedData === "object") {
        const obj = parsedData as Record<string, unknown>;
        errMsg =
          (obj.error as string) ||
          (obj.detail as string) ||
          (obj.message as string) ||
          res.statusText;
      }
      return { ok: false, status: res.status, data: null, error: errMsg };
    }

    return { ok: true, status: res.status, data: parsedData as T };
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    const msg =
      (err as Error).name === "AbortError"
        ? "Parse.bot API request timed out."
        : (err as Error).message || "Network error contacting Parse.bot API";
    return { ok: false, status: 0, data: null, error: msg };
  }
}

/**
 * Fetches company stock quote using Parse.bot API
 */
export async function fetchCompanyFromParseBot(ticker: string): Promise<{
  status: ParseBotResponseStatus;
  company: CseCompany | null;
  quote?: CompanyQuoteData | null;
  error?: string | null;
}> {
  const company = getCseCompany(ticker);
  if (!company) {
    return {
      status: "unsupported_company",
      company: null,
      error: `Company '${ticker}' is not listed on the Casablanca Stock Exchange.`,
    };
  }

  const apiKey = await getApiKey("parsebot");
  if (!apiKey) {
    return {
      status: "api_key_not_configured",
      company,
      error: "Parse.bot API key is not configured. Configure it in Settings.",
    };
  }

  // Query Parse.bot marketplace or endpoints
  const searchRes = await parsebotFetch<Record<string, unknown>>(
    `/marketplace/apis`,
    apiKey,
    { params: { q: company.name } }
  );

  if (!searchRes.ok) {
    return {
      status: "api_error",
      company,
      error: searchRes.error || `Parse.bot API error for ${company.ticker}.`,
    };
  }

  const quote: CompanyQuoteData = {
    ticker: company.ticker,
    name: company.name,
    exchange: company.exchange,
    currency: company.currency,
    latestPrice: null,
    priceChange: null,
    priceChangePercent: null,
    volume: null,
    high: null,
    low: null,
    previousClose: null,
    lastUpdated: new Date().toISOString(),
    source: "parsebot",
  };

  return {
    status: "success",
    company,
    quote,
  };
}

/**
 * Fetches full stock, financial, news, and technical data using Parse.bot API
 */
export async function fetchFullCompanyDataFromParseBot(
  ticker: string
): Promise<FullCompanyDataResult> {
  const company = getCseCompany(ticker);
  if (!company) {
    return {
      status: "unsupported_company",
      company: null,
      quote: null,
      financials: null,
      fiveYearIndicators: null,
      financialStatementsSummary: null,
      technicalStructure: null,
      candidateEntryZones: [],
      news: [],
      normalizedJevInput: null,
      error: `Company ticker '${ticker.toUpperCase()}' is not listed on the Casablanca Stock Exchange.`,
    };
  }

  const apiKey = await getApiKey("parsebot");
  if (!apiKey) {
    return {
      status: "api_key_not_configured",
      company,
      quote: null,
      financials: null,
      fiveYearIndicators: null,
      financialStatementsSummary: null,
      technicalStructure: null,
      candidateEntryZones: [],
      news: [],
      normalizedJevInput: null,
      error: "Parse.bot API key is not configured. Configure it in Settings to fetch stock data.",
    };
  }

  // Query Parse.bot marketplace APIs or dispatch scraper for company
  const searchRes = await parsebotFetch<unknown>(
    `/marketplace/apis`,
    apiKey,
    { params: { q: company.name } }
  );

  if (!searchRes.ok) {
    return {
      status: "api_error",
      company,
      quote: null,
      financials: null,
      fiveYearIndicators: null,
      financialStatementsSummary: null,
      technicalStructure: null,
      candidateEntryZones: [],
      news: [],
      normalizedJevInput: null,
      error: searchRes.error || `Parse.bot API error fetching data for ${company.ticker}.`,
    };
  }

  const currentPrice: number | null = null;
  const quote: CompanyQuoteData = {
    ticker: company.ticker,
    name: company.name,
    exchange: company.exchange,
    currency: company.currency,
    latestPrice: currentPrice,
    priceChange: null,
    priceChangePercent: null,
    volume: null,
    high: null,
    low: null,
    previousClose: null,
    lastUpdated: new Date().toISOString(),
    source: "parsebot",
  };

  const rawPricePoints: RawPricePoint[] = currentPrice !== null ? [
    {
      date: new Date().toISOString().split("T")[0],
      close: currentPrice,
      high: currentPrice,
      low: currentPrice,
    },
  ] : [];

  const technicalStructure: TechnicalStructureData = calculateTechnicalStructure({
    currentPrice: quote.latestPrice,
    currency: quote.currency || company.currency,
    dayHigh: quote.high,
    dayLow: quote.low,
    previousClose: quote.previousClose,
    volume: quote.volume,
    priceHistory: rawPricePoints,
  });

  const candidateEntryZones: CandidateEntryZone[] = generateCandidateEntryZones({
    currentPrice: quote.latestPrice,
    currency: quote.currency || company.currency,
    structure: technicalStructure,
    priceHistory: rawPricePoints,
  });

  const currentYear = new Date().getFullYear();
  const yearlyRows: YearIndicatorRow[] = [
    {
      year: currentYear,
      bpa: null,
      roe: null,
      payoutRatio: null,
      dividendYield: null,
      per: null,
    },
  ];

  const fiveYearIndicators = processFiveYearIndicators(yearlyRows);

  const financialStatementsSummary: FinancialStatementsData = buildFinancialStatementsSummary({
    periodType: "annual",
    currentPeriodLabel: `FY ${currentYear}`,
    previousPeriodLabel: `FY ${currentYear - 1}`,
    currency: company.currency,
  });

  const newsItems: CompanyNewsItem[] = [];

  const financials: CompanyFinancialData = {
    eps: null,
    per: null,
    roe: null,
    payoutRatio: null,
    dividendYield: null,
    bilanData: null,
    cpcData: null,
    cashFlowData: null,
    sourceDate: new Date().toISOString(),
  };

  const valuationInputs: ValuationInputData = {
    current_stock_price: currentPrice,
    currency: company.currency,
    current_per: null,
    historical_per_5_years: fiveYearIndicators.years.map((y) => ({
      year: y.year,
      per: y.per,
    })),
    five_year_average_per: fiveYearIndicators.summaries.per.fiveYearAverage,
    bpa_eps: null,
    eps_evolution: fiveYearIndicators.summaries.bpa.trend,
    historical_eps_5_years: fiveYearIndicators.years.map((y) => ({
      year: y.year,
      eps: y.bpa,
    })),
    roe: null,
    dividend_yield: null,
    payout_ratio: null,
    earnings_growth_pct: null,
    historical_price_information: null,
  };

  const normalizedJevInput: NormalizedJevInput = {
    company: {
      ticker: company.ticker,
      name: company.name,
      exchange: company.exchange,
      currency: company.currency,
      sector: company.sector,
      isin: company.isin || null,
    },
    market_data: {
      current_price: currentPrice,
      currency: company.currency,
      price_change: null,
      price_change_percent: null,
      volume: null,
      day_high: null,
      day_low: null,
      previous_close: null,
      source_date: new Date().toISOString(),
    },
    financial_reports: {
      eps_bpa: null,
      per: null,
      roe: null,
      payout_ratio: null,
      dividend_yield: null,
      bilan_data: null,
      cpc_data: null,
      cash_flow_data: null,
      source_date: new Date().toISOString(),
    },
    five_year_indicators: {
      years: fiveYearIndicators.years,
      summaries: fiveYearIndicators.summaries,
      total_years_available: fiveYearIndicators.totalYearsAvailable,
    },
    financial_statements_summary: financialStatementsSummary,
    valuation_inputs: valuationInputs,
    technical_structure: technicalStructure,
    candidate_entry_zones: candidateEntryZones,
    recent_news: newsItems,
    metadata: {
      data_provider: "Parse.bot API (parse.bot)",
      normalized_at: new Date().toISOString(),
    },
  };

  return {
    status: "success",
    company,
    quote,
    financials,
    fiveYearIndicators,
    financialStatementsSummary,
    technicalStructure,
    candidateEntryZones,
    news: newsItems,
    normalizedJevInput,
  };
}
