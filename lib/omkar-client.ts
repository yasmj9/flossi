import { getApiKey } from "./api-keys";
import { CseCompany, getCseCompany } from "./cse-companies";
import {
  FiveYearIndicators,
  YearIndicatorRow,
  calculateObjectiveMetrics,
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

export type OmkarResponseStatus =
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
  source: "omkar_cloud";
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
  status: OmkarResponseStatus;
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

export interface OmkarQuoteResult {
  status: OmkarResponseStatus;
  company: CseCompany | null;
  quote?: CompanyQuoteData | null;
  error?: string | null;
}

/**
 * Fetches real stock quote data from Omkar Cloud for a given company ticker.
 */
export async function fetchCompanyFromOmkar(ticker: string): Promise<OmkarQuoteResult> {
  const fullResult = await fetchFullCompanyDataFromOmkar(ticker);
  return {
    status: fullResult.status,
    company: fullResult.company,
    quote: fullResult.quote,
    error: fullResult.error,
  };
}

/**
 * Fetches all available company, market, financial, historical 5-year, financial statements summary,
 * and news data from Omkar Cloud, and compiles the normalized factual JSON payload for JEV.
 * 
 * Rules strictly followed:
 * - Only include fields that are actually available.
 * - Compare only compatible periods (FY vs FY, H1 vs H1, Q1 vs Q1).
 * - Calculate objective values only when underlying metrics exist.
 * - Use null for missing values.
 * - Never invent or fabricate missing information.
 */
export async function fetchFullCompanyDataFromOmkar(
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
      error: `Ticker '${ticker}' is not a recognized Casablanca Stock Exchange listed company.`,
    };
  }

  const apiKey = await getApiKey("omkar");
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
      error:
        "Omkar Cloud API key is not configured. Configure it in Settings to fetch real-time market and financial data.",
    };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const targetSymbol = company.omkarSymbol || `${company.ticker}:CASABLANCA`;
    const encodedSymbol = encodeURIComponent(targetSymbol);

    // Call Omkar Cloud Google Finance scraper endpoint
    const url = `https://google-finance-scraper.omkar.cloud/quote?symbol=${encodedSymbol}`;

    const res = await fetch(url, {
      method: "GET",
      headers: {
        "API-Key": apiKey,
        Accept: "application/json",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    let data: Record<string, unknown> | null = null;
    try {
      data = (await res.json()) as Record<string, unknown>;
    } catch {
      // response was not JSON
    }

    if (!res.ok) {
      const errMsg = (data?.message as string) || (data?.error as string) || res.statusText;

      if (res.status === 400 && errMsg?.toLowerCase().includes("invalid api key")) {
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
          error: "Invalid API key: Omkar Cloud rejected the key as invalid.",
        };
      }

      if (res.status === 400 && errMsg?.toLowerCase().includes("authentication requires")) {
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
          error: "Authentication required: Omkar Cloud requires a valid API-Key header.",
        };
      }

      if (res.status === 404) {
        return {
          status: "unsupported_company",
          company,
          quote: null,
          financials: null,
          fiveYearIndicators: null,
          financialStatementsSummary: null,
          technicalStructure: null,
          candidateEntryZones: [],
          news: [],
          normalizedJevInput: null,
          error: `Company ticker '${company.ticker}' was not found on Omkar Cloud feed.`,
        };
      }

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
        error: `Omkar Cloud error (${res.status}): ${errMsg || "Failed to fetch stock data"}`,
      };
    }

    // Process real Omkar Cloud response
    const payload = data || {};

    const parseNum = (val: unknown): number | null => {
      if (typeof val === "number" && !isNaN(val)) return val;
      if (typeof val === "string") {
        const clean = parseFloat(val.replace(/[^0-9.-]/g, ""));
        return isNaN(clean) ? null : clean;
      }
      return null;
    };

    // 1. Stock / Quote data
    const priceVal = parseNum(payload.price ?? payload.latest_price);
    const changeVal = parseNum(payload.change ?? payload.price_change);
    const changePctVal = parseNum(payload.change_percent ?? payload.price_change_percent);
    const volumeVal = parseNum(payload.volume);
    const highVal = parseNum(payload.high ?? payload.day_high);
    const lowVal = parseNum(payload.low ?? payload.day_low);
    const prevCloseVal = parseNum(payload.previous_close ?? payload.prev_close);

    const detectedCurrency =
      (typeof payload.currency === "string" && payload.currency) || company.currency;

    const quote: CompanyQuoteData = {
      ticker: company.ticker,
      name: (typeof payload.name === "string" && payload.name) || company.name,
      exchange: company.exchange,
      currency: detectedCurrency,
      latestPrice: priceVal,
      priceChange: changeVal,
      priceChangePercent: changePctVal,
      volume: volumeVal,
      high: highVal,
      low: lowVal,
      previousClose: prevCloseVal,
      lastUpdated: (typeof payload.updated_at === "string" && payload.updated_at) || new Date().toISOString(),
      source: "omkar_cloud",
    };

    // 2. Financial / Report data (only factual fields if provided in feed)
    const finObj = (payload.financials || payload.ratios || payload.reports || {}) as Record<string, unknown>;
    const epsVal = parseNum(finObj.eps ?? finObj.bpa ?? payload.eps ?? payload.bpa);
    const perVal = parseNum(finObj.per ?? finObj.pe_ratio ?? payload.per ?? payload.pe_ratio);
    const roeVal = parseNum(finObj.roe ?? payload.roe);
    const payoutVal = parseNum(finObj.payout_ratio ?? payload.payout_ratio);
    const divYieldVal = parseNum(finObj.dividend_yield ?? payload.dividend_yield);

    // If underlying values exist, calculate objective metrics if not already direct
    const netIncomeVal = parseNum(finObj.net_income ?? finObj.resultat_net);
    const equityVal = parseNum(finObj.equity ?? finObj.capitaux_propres);
    const dpsVal = parseNum(finObj.dps ?? finObj.dividend_per_share);
    const totalDivVal = parseNum(finObj.total_dividends);

    const calculatedObj = calculateObjectiveMetrics({
      eps: epsVal,
      price: priceVal,
      dps: dpsVal,
      netIncome: netIncomeVal,
      equity: equityVal,
      totalDividends: totalDivVal,
    });

    const bilanData = (finObj.bilan || finObj.balance_sheet || null) as Record<string, unknown> | null;
    const cpcData = (finObj.cpc || finObj.income_statement || null) as Record<string, unknown> | null;
    const cashFlowData = (finObj.cash_flow || null) as Record<string, unknown> | null;

    const financials: CompanyFinancialData = {
      eps: epsVal ?? calculatedObj.bpa,
      per: perVal ?? calculatedObj.per,
      roe: roeVal ?? calculatedObj.roe,
      payoutRatio: payoutVal ?? calculatedObj.payoutRatio,
      dividendYield: divYieldVal ?? calculatedObj.dividendYield,
      bilanData: bilanData && typeof bilanData === "object" ? bilanData : null,
      cpcData: cpcData && typeof cpcData === "object" ? cpcData : null,
      cashFlowData: cashFlowData && typeof cashFlowData === "object" ? cashFlowData : null,
      sourceDate: (typeof finObj.source_date === "string" && finObj.source_date) || null,
    };

    // 3. Historical 5-Year Indicators Extraction
    const rawYears: YearIndicatorRow[] = [];

    // Check for multi-year historical data structures in Omkar Cloud payload
    const histData = (payload.historical_financials ||
      payload.financials_history ||
      payload.history ||
      payload.years ||
      finObj.history ||
      []) as unknown;

    if (Array.isArray(histData) && histData.length > 0) {
      for (const item of histData) {
        if (typeof item === "object" && item !== null) {
          const rowObj = item as Record<string, unknown>;
          const yr = parseNum(rowObj.year ?? rowObj.fiscal_year ?? rowObj.annee);
          if (yr && yr > 2000) {
            const rowEps = parseNum(rowObj.eps ?? rowObj.bpa);
            const rowRoe = parseNum(rowObj.roe);
            const rowPayout = parseNum(rowObj.payout_ratio ?? rowObj.payout);
            const rowDivYield = parseNum(rowObj.dividend_yield ?? rowObj.yield);
            const rowPer = parseNum(rowObj.per ?? rowObj.pe_ratio);

            const rowNetIncome = parseNum(rowObj.net_income);
            const rowEquity = parseNum(rowObj.equity);
            const rowDps = parseNum(rowObj.dps);
            const rowPrice = parseNum(rowObj.price ?? rowObj.closing_price);

            const rowCalc = calculateObjectiveMetrics({
              eps: rowEps,
              price: rowPrice,
              dps: rowDps,
              netIncome: rowNetIncome,
              equity: rowEquity,
            });

            rawYears.push({
              year: Math.round(yr),
              bpa: rowEps ?? rowCalc.bpa,
              roe: rowRoe ?? rowCalc.roe,
              payoutRatio: rowPayout ?? rowCalc.payoutRatio,
              dividendYield: rowDivYield ?? rowCalc.dividendYield,
              per: rowPer ?? rowCalc.per,
            });
          }
        }
      }
    } else if (typeof histData === "object" && histData !== null) {
      for (const [key, val] of Object.entries(histData as Record<string, unknown>)) {
        const yr = parseInt(key, 10);
        if (!isNaN(yr) && yr > 2000 && typeof val === "object" && val !== null) {
          const rowObj = val as Record<string, unknown>;
          const rowEps = parseNum(rowObj.eps ?? rowObj.bpa);
          const rowRoe = parseNum(rowObj.roe);
          const rowPayout = parseNum(rowObj.payout_ratio ?? rowObj.payout);
          const rowDivYield = parseNum(rowObj.dividend_yield ?? rowObj.yield);
          const rowPer = parseNum(rowObj.per ?? rowObj.pe_ratio);

          rawYears.push({
            year: yr,
            bpa: rowEps,
            roe: rowRoe,
            payoutRatio: rowPayout,
            dividendYield: rowDivYield,
            per: rowPer,
          });
        }
      }
    }

    if (rawYears.length === 0 && (financials.eps !== null || financials.roe !== null || financials.per !== null)) {
      const currentYear = new Date().getFullYear();
      rawYears.push({
        year: currentYear,
        bpa: financials.eps,
        roe: financials.roe,
        payoutRatio: financials.payoutRatio,
        dividendYield: financials.dividendYield,
        per: financials.per,
      });
    }

    const fiveYearIndicators = processFiveYearIndicators(rawYears);

    // 4. Financial Statements Summary (Bilan, CPC, Trésorerie with compatible periods)
    const currentYear = new Date().getFullYear();
    const prevYear = currentYear - 1;

    const statementsObj = (payload.financial_statements ||
      payload.statements ||
      payload.reports ||
      {}) as Record<string, unknown>;

    const periodType: StatementPeriodType =
      payload.period_type === "semester" || payload.report_type === "H1" || payload.report_type === "S1"
        ? "semester"
        : payload.period_type === "quarter" || payload.report_type === "Q1" || payload.report_type === "Q3"
        ? "quarter"
        : "annual";

    const currentPeriodLabel =
      (payload.period_label as string) ||
      (payload.period as string) ||
      (periodType === "semester" ? `H1 ${currentYear}` : periodType === "quarter" ? `Q1 ${currentYear}` : `FY ${currentYear}`);

    const previousPeriodLabel =
      (payload.comparison_period_label as string) ||
      (payload.previous_period as string) ||
      (periodType === "semester" ? `H1 ${prevYear}` : periodType === "quarter" ? `Q1 ${prevYear}` : `FY ${prevYear}`);

    const currentBilanData = (statementsObj.current_bilan || statementsObj.bilan || finObj.bilan || finObj.balance_sheet || null) as Record<string, unknown> | null;
    const previousBilanData = (statementsObj.previous_bilan || statementsObj.bilan_prev || finObj.previous_bilan || null) as Record<string, unknown> | null;

    const currentCpcData = (statementsObj.current_cpc || statementsObj.cpc || finObj.cpc || finObj.income_statement || null) as Record<string, unknown> | null;
    const previousCpcData = (statementsObj.previous_cpc || statementsObj.cpc_prev || finObj.previous_cpc || null) as Record<string, unknown> | null;

    const currentCashFlowData = (statementsObj.current_cash_flow || statementsObj.cash_flow || finObj.cash_flow || null) as Record<string, unknown> | null;
    const previousCashFlowData = (statementsObj.previous_cash_flow || statementsObj.cash_flow_prev || finObj.previous_cash_flow || null) as Record<string, unknown> | null;

    const financialStatementsSummary = buildFinancialStatementsSummary({
      periodType,
      currentPeriodLabel,
      previousPeriodLabel,
      currency: quote.currency || company.currency,
      currentBilan: currentBilanData,
      previousBilan: previousBilanData,
      currentCpc: currentCpcData,
      previousCpc: previousCpcData,
      currentCashFlow: currentCashFlowData,
      previousCashFlow: previousCashFlowData,
      availablePeriodTypes: [periodType],
    });

    // 5. News data (only factual items if provided in feed)
    const rawNews = Array.isArray(payload.news)
      ? payload.news
      : Array.isArray(payload.articles)
      ? payload.articles
      : Array.isArray(payload.recent_news)
      ? payload.recent_news
      : [];

    const companyKeywords = [
      company.ticker.toLowerCase(),
      company.name.toLowerCase(),
      ...company.name.toLowerCase().split(" ").filter((w) => w.length > 2),
    ];

    const news: CompanyNewsItem[] = rawNews
      .map((item: Record<string, unknown>) => {
        const title = ((item.title as string) || (item.headline as string) || "").trim();
        const source = (item.source as string) || (item.publisher as string) || (item.source_name as string) || null;
        const url = (item.url as string) || (item.link as string) || (item.href as string) || (item.uri as string) || null;
        const publishedAt = (item.published_at as string) || (item.date as string) || (item.time as string) || null;
        const snippet = (item.snippet as string) || (item.summary as string) || (item.description as string) || null;

        return {
          title,
          source: source ? source.trim() : null,
          url: url ? url.trim() : null,
          publishedAt: publishedAt ? publishedAt.trim() : null,
          snippet: snippet ? snippet.trim() : null,
        };
      })
      .filter((n) => {
        if (!n.title || n.title.length === 0) return false;
        const combinedText = `${n.title} ${n.snippet || ""}`.toLowerCase();
        // Check if text is substantial and (if general feed) clearly relates to company or ticker
        const matchesKeyword = companyKeywords.some((kw) => combinedText.includes(kw));
        return combinedText.length > 5 && (matchesKeyword || rawNews.length <= 10);
      });

    // 6. Extract historical price points if available in Omkar Cloud payload
    const rawHistory = (payload.historical_prices ||
      payload.price_history ||
      payload.candles ||
      payload.chart ||
      []) as unknown;

    const priceHistory: RawPricePoint[] = [];
    if (Array.isArray(rawHistory)) {
      for (const pt of rawHistory) {
        if (typeof pt === "object" && pt !== null) {
          const ptObj = pt as Record<string, unknown>;
          const closeVal = parseNum(ptObj.close ?? ptObj.price ?? ptObj.c);
          if (closeVal !== null && closeVal > 0) {
            priceHistory.push({
              date: (ptObj.date as string) || (ptObj.time as string) || undefined,
              close: closeVal,
              high: parseNum(ptObj.high ?? ptObj.h) ?? undefined,
              low: parseNum(ptObj.low ?? ptObj.l) ?? undefined,
              volume: parseNum(ptObj.volume ?? ptObj.v) ?? undefined,
            });
          }
        }
      }
    }

    const avgVolVal = parseNum(payload.average_volume ?? payload.avg_volume ?? payload.avg_vol);
    const fiftyTwoHighVal = parseNum(payload.fifty_two_week_high ?? payload.year_high ?? payload.high_52w);
    const fiftyTwoLowVal = parseNum(payload.fifty_two_week_low ?? payload.year_low ?? payload.low_52w);

    // 7. Calculate factual Technical Structure
    const technicalStructure = calculateTechnicalStructure({
      currentPrice: quote.latestPrice,
      currency: quote.currency || company.currency,
      dayHigh: quote.high,
      dayLow: quote.low,
      previousClose: quote.previousClose,
      volume: quote.volume,
      averageVolume: avgVolVal,
      priceHistory,
      fiftyTwoWeekHigh: fiftyTwoHighVal,
      fiftyTwoWeekLow: fiftyTwoLowVal,
    });

    // 8. Generate candidate entry zones
    const candidateEntryZones = generateCandidateEntryZones({
      currentPrice: quote.latestPrice,
      currency: quote.currency || company.currency,
      structure: technicalStructure,
      priceHistory,
      fiftyTwoWeekLow: fiftyTwoLowVal,
    });

    // 9. Construct Normalized JSON for JEV
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
        current_price: quote.latestPrice,
        currency: quote.currency,
        price_change: quote.priceChange,
        price_change_percent: quote.priceChangePercent,
        volume: quote.volume ?? null,
        day_high: quote.high ?? null,
        day_low: quote.low ?? null,
        previous_close: quote.previousClose ?? null,
        source_date: quote.lastUpdated || null,
      },
      financial_reports: {
        eps_bpa: financials.eps,
        per: financials.per,
        roe: financials.roe,
        payout_ratio: financials.payoutRatio,
        dividend_yield: financials.dividendYield,
        bilan_data: financials.bilanData,
        cpc_data: financials.cpcData,
        cash_flow_data: financials.cashFlowData,
        source_date: financials.sourceDate,
      },
      five_year_indicators: {
        years: fiveYearIndicators.years,
        summaries: fiveYearIndicators.summaries,
        total_years_available: fiveYearIndicators.totalYearsAvailable,
      },
      financial_statements_summary: financialStatementsSummary,
      valuation_inputs: {
        current_stock_price: quote.latestPrice,
        currency: quote.currency,
        current_per: financials.per ?? fiveYearIndicators.summaries.per.latestValue ?? null,
        historical_per_5_years: fiveYearIndicators.years.map((y) => ({ year: y.year, per: y.per })),
        five_year_average_per: fiveYearIndicators.summaries.per.fiveYearAverage,
        bpa_eps: financials.eps ?? fiveYearIndicators.summaries.bpa.latestValue ?? null,
        eps_evolution: fiveYearIndicators.summaries.bpa.trend,
        historical_eps_5_years: fiveYearIndicators.years.map((y) => ({ year: y.year, eps: y.bpa })),
        roe: financials.roe ?? fiveYearIndicators.summaries.roe.latestValue ?? null,
        dividend_yield: financials.dividendYield ?? fiveYearIndicators.summaries.dividendYield.latestValue ?? null,
        payout_ratio: financials.payoutRatio ?? fiveYearIndicators.summaries.payoutRatio.latestValue ?? null,
        earnings_growth_pct: financialStatementsSummary?.cpc?.netIncome?.changePercent ?? null,
        historical_price_information:
          quote.previousClose !== null || quote.high !== null || quote.low !== null
            ? {
                previous_close: quote.previousClose ?? null,
                day_high: quote.high ?? null,
                day_low: quote.low ?? null,
              }
            : null,
      },
      technical_structure: technicalStructure,
      candidate_entry_zones: candidateEntryZones,
      recent_news: news,
      metadata: {
        data_provider: "Omkar Cloud",
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
      news,
      normalizedJevInput,
    };
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    const isTimeout = (err as Error).name === "AbortError";
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
      error: isTimeout
        ? "Omkar Cloud request timed out after 10 seconds."
        : `Network connection error: ${(err as Error).message || "Unable to reach Omkar Cloud"}`,
    };
  }
}
