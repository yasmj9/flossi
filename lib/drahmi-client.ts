import { getApiKey } from "./api-keys";
import { CseCompany, getCseCompany } from "./cse-companies";
import {
  YearIndicatorRow,
  processFiveYearIndicators,
} from "./indicators";
import {
  FinancialStatementsData,
  StatementPeriodType,
  buildFinancialStatementsSummary,
} from "./financial-statements";
import {
  TechnicalStructureData,
  calculateTechnicalStructure,
  RawPricePoint,
  CandidateEntryZone,
  generateCandidateEntryZones,
} from "./technical-structure";
import {
  CompanyQuoteData,
  CompanyFinancialData,
  CompanyNewsItem,
  ValuationInputData,
  NormalizedJevInput,
  FullCompanyDataResult,
} from "./omkar-client";

const DRAHMI_API_BASE = "https://api.drahmi.app/api/v1";

/**
 * Standard fetch helper for Drahmi API
 */
async function drahmiFetch<T>(
  endpoint: string,
  apiKey: string,
  params?: Record<string, string | number>
): Promise<{ ok: boolean; status: number; data: T | null; error?: string }> {
  const url = new URL(`${DRAHMI_API_BASE}${endpoint}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null) {
        url.searchParams.set(k, String(v));
      }
    }
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  try {
    const res = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "X-API-Key": apiKey,
        Accept: "application/json",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    let parsedData: unknown = null;
    try {
      parsedData = await res.json();
    } catch {
      // response wasn't JSON
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
        ? "Drahmi API request timed out."
        : (err as Error).message || "Network error contacting Drahmi API";
    return { ok: false, status: 0, data: null, error: msg };
  }
}

/**
 * Fetches basic quote data from Drahmi for a CSE stock ticker
 */
export async function fetchCompanyFromDrahmi(ticker: string): Promise<{
  status: "success" | "api_key_not_configured" | "api_error" | "unsupported_company";
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

  const apiKey = await getApiKey("drahmi");
  if (!apiKey) {
    return {
      status: "api_key_not_configured",
      company,
      error: "Drahmi API key is not configured. Configure it in Settings.",
    };
  }

  const res = await drahmiFetch<Record<string, unknown>>(
    `/stocks/${encodeURIComponent(company.ticker)}`,
    apiKey
  );

  if (!res.ok || !res.data) {
    return {
      status: "api_error",
      company,
      error: res.error || `Failed to fetch quote for ${company.ticker} from Drahmi API.`,
    };
  }

  const raw = res.data;
  const quote: CompanyQuoteData = {
    ticker: company.ticker,
    name: (raw.name as string) || company.name,
    exchange: (raw.exchange as string) || company.exchange,
    currency: (raw.currency as string) || company.currency,
    latestPrice: typeof raw.price === "number" ? raw.price : null,
    priceChange: typeof raw.change === "number" ? raw.change : null,
    priceChangePercent:
      typeof raw.changePercent === "number"
        ? raw.changePercent
        : typeof raw.price === "number" && typeof raw.change === "number" && raw.price > 0
        ? Number(((raw.change / (raw.price - raw.change)) * 100).toFixed(2))
        : null,
    volume: typeof raw.volume24h === "number" ? raw.volume24h : typeof raw.volume === "number" ? raw.volume : null,
    high: typeof raw.week52High === "number" ? raw.week52High : typeof raw.high === "number" ? raw.high : null,
    low: typeof raw.week52Low === "number" ? raw.week52Low : typeof raw.low === "number" ? raw.low : null,
    previousClose:
      typeof raw.price === "number" && typeof raw.change === "number"
        ? Number((raw.price - raw.change).toFixed(2))
        : null,
    lastUpdated: (raw.updatedAt as string) || new Date().toISOString(),
    source: "omkar_cloud", // compatible with existing UI interface
  };

  return {
    status: "success",
    company,
    quote,
  };
}

/**
 * Fetches comprehensive company, market, financial, news, and technical data
 * from Drahmi API for Casablanca Stock Exchange listed companies.
 */
export async function fetchFullCompanyDataFromDrahmi(
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

  const apiKey = await getApiKey("drahmi");
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
      error: "Drahmi API key is not configured. Configure it in Settings to fetch Casablanca stock data.",
    };
  }

  // Fetch all endpoints in parallel
  const [
    stockRes,
    historyRes,
    dividendsRes,
    financialsSummaryRes,
    fundamentalsRes,
    newsRes,
    technicalsRes,
    signalsRes,
    riskRes,
  ] = await Promise.all([
    drahmiFetch<Record<string, unknown>>(`/stocks/${encodeURIComponent(company.ticker)}`, apiKey),
    drahmiFetch<Record<string, unknown> | Array<unknown>>(`/stocks/${encodeURIComponent(company.ticker)}/history`, apiKey, { range: "1Y" }),
    drahmiFetch<Array<Record<string, unknown>> | Record<string, unknown>>(`/stocks/${encodeURIComponent(company.ticker)}/dividends`, apiKey),
    drahmiFetch<Record<string, unknown>>(`/stocks/${encodeURIComponent(company.ticker)}/financials/summary`, apiKey),
    drahmiFetch<Record<string, unknown> | Array<unknown>>(`/stocks/${encodeURIComponent(company.ticker)}/fundamentals`, apiKey),
    drahmiFetch<Record<string, unknown> | Array<unknown>>(`/stocks/${encodeURIComponent(company.ticker)}/news`, apiKey, { pageSize: 15 }),
    drahmiFetch<Record<string, unknown>>(`/intelligence/stocks/${encodeURIComponent(company.ticker)}/technicals`, apiKey, { range: "3M" }),
    drahmiFetch<Record<string, unknown>>(`/intelligence/stocks/${encodeURIComponent(company.ticker)}/signals`, apiKey, { range: "3M" }),
    drahmiFetch<Record<string, unknown>>(`/intelligence/stocks/${encodeURIComponent(company.ticker)}/risk`, apiKey, { range: "6M", benchmark: "MASI" }),
  ]);

  if (!stockRes.ok || !stockRes.data) {
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
      error: stockRes.error || `Drahmi API error fetching stock '${company.ticker}'.`,
    };
  }

  const stockData = stockRes.data;

  // 1. Process Quote Data
  const currentPrice = typeof stockData.price === "number" ? stockData.price : null;
  const priceChange = typeof stockData.change === "number" ? stockData.change : null;
  const priceChangePct =
    typeof stockData.changePercent === "number"
      ? stockData.changePercent
      : currentPrice !== null && priceChange !== null && currentPrice > 0
      ? Number(((priceChange / (currentPrice - priceChange)) * 100).toFixed(2))
      : null;

  const quote: CompanyQuoteData = {
    ticker: company.ticker,
    name: (stockData.name as string) || company.name,
    exchange: (stockData.exchange as string) || company.exchange,
    currency: (stockData.currency as string) || company.currency,
    latestPrice: currentPrice,
    priceChange: priceChange,
    priceChangePercent: priceChangePct,
    volume: typeof stockData.volume24h === "number" ? stockData.volume24h : typeof stockData.volume === "number" ? stockData.volume : null,
    high: typeof stockData.week52High === "number" ? stockData.week52High : typeof stockData.high === "number" ? stockData.high : null,
    low: typeof stockData.week52Low === "number" ? stockData.week52Low : typeof stockData.low === "number" ? stockData.low : null,
    previousClose:
      currentPrice !== null && priceChange !== null
        ? Number((currentPrice - priceChange).toFixed(2))
        : null,
    lastUpdated: (stockData.updatedAt as string) || new Date().toISOString(),
    source: "omkar_cloud",
  };

  // 2. Process Price History & Technical Structure
  let rawPricePoints: RawPricePoint[] = [];
  if (historyRes.ok && historyRes.data) {
    const rawHistory = historyRes.data;
    let pointsArray: unknown[] = [];
    if (Array.isArray(rawHistory)) {
      pointsArray = rawHistory;
    } else if (typeof rawHistory === "object" && rawHistory !== null) {
      const obj = rawHistory as Record<string, unknown>;
      if (Array.isArray(obj.points)) pointsArray = obj.points;
      else if (Array.isArray(obj.data)) pointsArray = obj.data;
      else if (Array.isArray(obj.history)) pointsArray = obj.history;
    }

    rawPricePoints = pointsArray
      .map((p) => {
        if (!p || typeof p !== "object") return null;
        const pt = p as Record<string, unknown>;
        const close = typeof pt.close === "number" ? pt.close : typeof pt.price === "number" ? pt.price : null;
        if (close === null) return null;
        return {
          date: String(pt.date || pt.timestamp || pt.time || ""),
          close,
          high: typeof pt.high === "number" ? pt.high : close,
          low: typeof pt.low === "number" ? pt.low : close,
          volume: typeof pt.volume === "number" ? pt.volume : undefined,
        } as RawPricePoint;
      })
      .filter((pt): pt is RawPricePoint => pt !== null);
  }

  // If no history returned but current price exists, create baseline point
  if (rawPricePoints.length === 0 && currentPrice !== null) {
    rawPricePoints = [
      {
        date: new Date().toISOString().split("T")[0],
        close: currentPrice,
        high: quote.high || currentPrice,
        low: quote.low || currentPrice,
      },
    ];
  }

  // Calculate technical structure (support, resistance, pivot point, trend, etc.)
  const technicalStructure: TechnicalStructureData = calculateTechnicalStructure({
    currentPrice: quote.latestPrice,
    currency: quote.currency || company.currency,
    dayHigh: quote.high,
    dayLow: quote.low,
    previousClose: quote.previousClose,
    volume: quote.volume,
    priceHistory: rawPricePoints,
    fiftyTwoWeekHigh: quote.high,
    fiftyTwoWeekLow: quote.low,
  });

  const candidateEntryZones: CandidateEntryZone[] = generateCandidateEntryZones({
    currentPrice: quote.latestPrice,
    currency: quote.currency || company.currency,
    structure: technicalStructure,
    priceHistory: rawPricePoints,
    fiftyTwoWeekLow: quote.low,
  });

  // 3. Process Dividends & Key Indicators
  const currentPer = typeof stockData.peRatio === "number" ? stockData.peRatio : null;
  const currentDividendYield = typeof stockData.dividendYield === "number" ? stockData.dividendYield : null;

  // Process historical indicators
  const currentYear = new Date().getFullYear();
  const yearlyRows: YearIndicatorRow[] = [];

  // Parse dividends to get historical dividend yields
  let rawDividends: Array<Record<string, unknown>> = [];
  if (dividendsRes.ok && dividendsRes.data) {
    if (Array.isArray(dividendsRes.data)) {
      rawDividends = dividendsRes.data as Array<Record<string, unknown>>;
    } else if (typeof dividendsRes.data === "object" && dividendsRes.data !== null) {
      const obj = dividendsRes.data as Record<string, unknown>;
      if (Array.isArray(obj.dividends)) rawDividends = obj.dividends as Array<Record<string, unknown>>;
      else if (Array.isArray(obj.data)) rawDividends = obj.data as Array<Record<string, unknown>>;
    }
  }

  // Parse fundamentals
  let rawFundamentals: Array<Record<string, unknown>> = [];
  if (fundamentalsRes.ok && fundamentalsRes.data) {
    if (Array.isArray(fundamentalsRes.data)) {
      rawFundamentals = fundamentalsRes.data as Array<Record<string, unknown>>;
    } else if (typeof fundamentalsRes.data === "object" && fundamentalsRes.data !== null) {
      const obj = fundamentalsRes.data as Record<string, unknown>;
      if (Array.isArray(obj.fundamentals)) rawFundamentals = obj.fundamentals as Array<Record<string, unknown>>;
      else if (Array.isArray(obj.data)) rawFundamentals = obj.data as Array<Record<string, unknown>>;
      else if (Array.isArray(obj.periods)) rawFundamentals = obj.periods as Array<Record<string, unknown>>;
      else rawFundamentals = [obj];
    }
  }

  // Build historical rows (currentYear - 4 to currentYear)
  for (let offset = 4; offset >= 0; offset--) {
    const yr = currentYear - offset;
    const isLatestYear = offset === 0;

    // Find fundamental row matching year
    const matchedFund = rawFundamentals.find((f) => {
      const fDate = String(f.fiscalPeriodEnd || f.asOfDate || f.period || f.year || "");
      return fDate.includes(String(yr));
    });

    // Find dividends matching year
    const matchedDivs = rawDividends.filter((d) => {
      const dDate = String(d.exDate || d.paymentDate || d.date || "");
      return dDate.includes(String(yr));
    });
    const totalDivAmount = matchedDivs.reduce((acc, curr) => {
      return acc + (typeof curr.amount === "number" ? curr.amount : 0);
    }, 0);

    const bpa = matchedFund && typeof matchedFund.eps === "number"
      ? matchedFund.eps
      : matchedFund && typeof matchedFund.bpa === "number"
      ? matchedFund.bpa
      : null;

    const per = isLatestYear && currentPer !== null
      ? currentPer
      : matchedFund && typeof matchedFund.per === "number"
      ? matchedFund.per
      : matchedFund && typeof matchedFund.peRatio === "number"
      ? matchedFund.peRatio
      : null;

    const roe = matchedFund && typeof matchedFund.roe === "number"
      ? matchedFund.roe
      : null;

    const divYield = isLatestYear && currentDividendYield !== null
      ? currentDividendYield
      : matchedFund && typeof matchedFund.dividendYield === "number"
      ? matchedFund.dividendYield
      : totalDivAmount > 0 && currentPrice !== null && currentPrice > 0
      ? Number(((totalDivAmount / currentPrice) * 100).toFixed(2))
      : null;

    const payoutRatio = matchedFund && typeof matchedFund.payoutRatio === "number"
      ? matchedFund.payoutRatio
      : bpa !== null && bpa > 0 && totalDivAmount > 0
      ? Number(((totalDivAmount / bpa) * 100).toFixed(2))
      : null;

    if (isLatestYear || bpa !== null || per !== null || roe !== null || divYield !== null) {
      yearlyRows.push({
        year: yr,
        bpa: bpa !== null ? Number(bpa.toFixed(2)) : null,
        roe: roe !== null ? Number(roe.toFixed(2)) : null,
        payoutRatio: payoutRatio !== null ? Number(payoutRatio.toFixed(2)) : null,
        dividendYield: divYield !== null ? Number(divYield.toFixed(2)) : null,
        per: per !== null ? Number(per.toFixed(2)) : null,
      });
    }
  }

  // Ensure current year exists
  if (!yearlyRows.some((r) => r.year === currentYear)) {
    yearlyRows.push({
      year: currentYear,
      bpa: null,
      roe: null,
      payoutRatio: null,
      dividendYield: currentDividendYield,
      per: currentPer,
    });
  }

  const fiveYearIndicators = processFiveYearIndicators(yearlyRows);

  // 4. Financial Statements Summary
  const prevYear = currentYear - 1;
  const periodType: StatementPeriodType = "annual";
  const currentPeriodLabel = `FY ${currentYear}`;
  const previousPeriodLabel = `FY ${prevYear}`;

  let currentCpcData: Record<string, unknown> | null = null;
  let currentBilanData: Record<string, unknown> | null = null;
  if (financialsSummaryRes.ok && financialsSummaryRes.data) {
    const fsData = financialsSummaryRes.data;
    const latest = (fsData.latest as Record<string, unknown>) || {};
    currentCpcData = {
      revenue: typeof latest.revenue === "number" ? latest.revenue : null,
      net_income: typeof latest.netIncome === "number" ? latest.netIncome : null,
      operating_income: typeof latest.operatingIncome === "number" ? latest.operatingIncome : null,
    };
    currentBilanData = {
      total_assets: typeof latest.totalAssets === "number" ? latest.totalAssets : null,
      equity: typeof latest.totalEquity === "number" ? latest.totalEquity : null,
    };
  }

  const financialStatementsSummary: FinancialStatementsData = buildFinancialStatementsSummary({
    periodType,
    currentPeriodLabel,
    previousPeriodLabel,
    currency: quote.currency || company.currency,
    currentBilan: currentBilanData,
    currentCpc: currentCpcData,
    availablePeriodTypes: [periodType],
  });

  // 5. Recent News
  let rawNewsList: unknown[] = [];
  if (newsRes.ok && newsRes.data) {
    if (Array.isArray(newsRes.data)) rawNewsList = newsRes.data;
    else if (typeof newsRes.data === "object" && newsRes.data !== null) {
      const obj = newsRes.data as Record<string, unknown>;
      if (Array.isArray(obj.items)) rawNewsList = obj.items;
      else if (Array.isArray(obj.news)) rawNewsList = obj.news;
      else if (Array.isArray(obj.data)) rawNewsList = obj.data;
    }
  }

  const newsItems: CompanyNewsItem[] = [];
  for (const item of rawNewsList.slice(0, 10)) {
    if (item && typeof item === "object") {
      const n = item as Record<string, unknown>;
      const title = String(n.title || n.headline || "").trim();
      if (title) {
        newsItems.push({
          title,
          source: (n.source as string) || (n.publisher as string) || "Drahmi News",
          url: (n.url as string) || (n.link as string) || null,
          publishedAt: (n.publishedAt as string) || (n.date as string) || null,
          snippet: (n.snippet as string) || (n.summary as string) || null,
        });
      }
    }
  }

  const latestEps = fiveYearIndicators.summaries.bpa.latestValue;
  const latestRoe = fiveYearIndicators.summaries.roe.latestValue;
  const latestPayout = fiveYearIndicators.summaries.payoutRatio.latestValue;

  const financials: CompanyFinancialData = {
    eps: latestEps,
    per: currentPer ?? fiveYearIndicators.summaries.per.latestValue,
    roe: latestRoe,
    payoutRatio: latestPayout,
    dividendYield: currentDividendYield ?? fiveYearIndicators.summaries.dividendYield.latestValue,
    bilanData: currentBilanData,
    cpcData: currentCpcData,
    cashFlowData: null,
    sourceDate: quote.lastUpdated || new Date().toISOString(),
  };

  // 6. Structured Valuation Inputs
  const valuationInputs: ValuationInputData = {
    current_stock_price: currentPrice,
    currency: company.currency,
    current_per: financials.per,
    historical_per_5_years: fiveYearIndicators.years.map((y) => ({
      year: y.year,
      per: y.per,
    })),
    five_year_average_per: fiveYearIndicators.summaries.per.fiveYearAverage,
    bpa_eps: latestEps,
    eps_evolution: fiveYearIndicators.summaries.bpa.trend,
    historical_eps_5_years: fiveYearIndicators.years.map((y) => ({
      year: y.year,
      eps: y.bpa,
    })),
    roe: latestRoe,
    dividend_yield: financials.dividendYield,
    payout_ratio: latestPayout,
    earnings_growth_pct: financialStatementsSummary?.cpc?.netIncome?.changePercent ?? null,
    historical_price_information: {
      previous_close: quote.previousClose ?? null,
      day_high: quote.high ?? null,
      day_low: quote.low ?? null,
    },
  };

  // 7. Clean Structured JSON Input for JEV AI
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
      price_change: quote.priceChange ?? null,
      price_change_percent: quote.priceChangePercent ?? null,
      volume: quote.volume ?? null,
      day_high: quote.high ?? null,
      day_low: quote.low ?? null,
      previous_close: quote.previousClose ?? null,
      source_date: quote.lastUpdated || new Date().toISOString(),
    },
    financial_reports: {
      eps_bpa: latestEps,
      per: financials.per,
      roe: latestRoe,
      payout_ratio: latestPayout,
      dividend_yield: financials.dividendYield,
      bilan_data: currentBilanData,
      cpc_data: currentCpcData,
      cash_flow_data: null,
      source_date: quote.lastUpdated || new Date().toISOString(),
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
      data_provider: "Drahmi API (api.drahmi.app)",
      normalized_at: new Date().toISOString(),
    },
  };

  // Add signals & risk intelligence into metadata if present
  if (signalsRes.ok && signalsRes.data) {
    const sigData = (signalsRes.data as Record<string, unknown>).data || signalsRes.data;
    if (typeof sigData === "object" && sigData !== null) {
      (normalizedJevInput as unknown as Record<string, unknown>).technical_signals =
        (sigData as Record<string, unknown>).signals || sigData;
    }
  }

  if (riskRes.ok && riskRes.data) {
    const rData = (riskRes.data as Record<string, unknown>).data || riskRes.data;
    if (typeof rData === "object" && rData !== null) {
      (normalizedJevInput as unknown as Record<string, unknown>).risk_intelligence = rData;
    }
  }

  if (technicalsRes.ok && technicalsRes.data) {
    const tData = (technicalsRes.data as Record<string, unknown>).data || technicalsRes.data;
    if (typeof tData === "object" && tData !== null) {
      (normalizedJevInput as unknown as Record<string, unknown>).technical_indicators = tData;
    }
  }

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
