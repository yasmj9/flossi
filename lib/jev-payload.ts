/**
 * JEV AI Payload Builder following TypeSafe AI SystemOne quickstart:
 * https://docs.typesafe.ai/introduction/quickstart
 *
 * Prepares a clean structured JSON input containing the collected stock,
 * financial, technical, valuation, and news data, then formats the request
 * with state (serialized JSON string), model ("jev-latest"), and questions.
 */

export interface JevCompanyState {
  name: string;
  ticker: string;
  currentPrice: number | null;
  currency: string;
}

export interface JevTechnicalState {
  trend: "UPTREND" | "DOWNTREND" | "CONSOLIDATION" | "RANGEBOUND" | string;
  supportZones: Array<{ from: number; to: number }>;
  resistanceZones: Array<{ from: number; to: number }>;
  breakoutStatus: "NONE" | "BREAKOUT_ABOVE" | "BREAKDOWN_BELOW" | string;
  retestStatus: "NONE" | "RETESTING_SUPPORT" | "RETESTING_RESISTANCE" | string;
  volumeContext: "NORMAL" | "HIGH" | "LOW" | string;
  distanceFromNearestSupportPct: number | null;
  distanceFromNearestResistancePct: number | null;
}

export interface JevBalanceSheetState {
  totalAssets: number | null;
  totalLiabilities: number | null;
  equity: number | null;
  cash: number | null;
  shortTermDebt: number | null;
  longTermDebt: number | null;
  totalDebt: number | null;
}

export interface JevIncomeStatementState {
  revenue: number | null;
  revenueGrowthPct: number | null;
  operatingIncome: number | null;
  operatingMarginPct: number | null;
  netIncome: number | null;
  netIncomeGrowthPct: number | null;
  netMarginPct: number | null;
}

export interface JevCashFlowState {
  operatingCashFlow: number | null;
  investingCashFlow: number | null;
  financingCashFlow: number | null;
  freeCashFlow: number | null;
  closingCash: number | null;
}

export interface JevYearRatioState {
  year: number;
  eps: number | null;
  roePct: number | null;
  payoutPct: number | null;
  dividendYieldPct: number | null;
  peRatio: number | null;
}

export interface JevValuationState {
  currentPe: number | null;
  fiveYearAveragePe: number | null;
  currentEps: number | null;
  epsTrend: "increasing" | "decreasing" | "stable" | null | string;
  roePct: number | null;
  dividendYieldPct: number | null;
  payoutPct: number | null;
}

export interface JevNewsStateItem {
  title: string;
  source: string;
  publishedAt: string;
  summary: string;
}

export interface JevDataQualityState {
  latestFinancialPeriod: string | null;
  yearsAvailable: number;
  hasBalanceSheet: boolean;
  hasIncomeStatement: boolean;
  hasCashFlow: boolean;
  hasTechnicalHistory: boolean;
  hasRecentNews: boolean;
}

export interface JevStructuredState {
  company: JevCompanyState;
  technical: JevTechnicalState;
  balanceSheet: JevBalanceSheetState;
  incomeStatement: JevIncomeStatementState;
  cashFlow: JevCashFlowState;
  fiveYearRatios: JevYearRatioState[];
  valuation: JevValuationState;
  news: JevNewsStateItem[];
  dataQuality: JevDataQualityState;
}

export interface JevQuickstartPayload {
  state: string; // JSON stringified JevStructuredState
  model: "jev-latest";
  questions: {
    investment_decision: {
      type: "choice";
      instructions: string;
      criteria: {
        BUY: string;
        HOLD: string;
        SELL: string;
      };
    };
    investment_potential: {
      type: "score";
      instructions: string;
      criteria: string[];
    };
    financial_quality: {
      type: "score";
      instructions: string;
      criteria: string[];
    };
    growth_potential: {
      type: "score";
      instructions: string;
      criteria: string[];
    };
    profitability_quality: {
      type: "score";
      instructions: string;
      criteria: string[];
    };
    valuation_attractiveness: {
      type: "score";
      instructions: string;
      criteria: string[];
    };
    dividend_sustainability: {
      type: "score";
      instructions: string;
      criteria: string[];
    };
    entry_timing: {
      type: "score";
      instructions: string;
      criteria: string[];
    };
  };
}

export function buildJevStructuredState(params: {
  company: {
    name: string;
    ticker: string;
    currentPrice: number | null;
    currency?: string;
  };
  technical?: Partial<JevTechnicalState> | null;
  balanceSheet?: Partial<JevBalanceSheetState> | null;
  incomeStatement?: Partial<JevIncomeStatementState> | null;
  cashFlow?: Partial<JevCashFlowState> | null;
  fiveYearRatios?: JevYearRatioState[] | null;
  valuation?: Partial<JevValuationState> | null;
  news?: JevNewsStateItem[] | null;
  dataQuality?: Partial<JevDataQualityState> | null;
}): JevStructuredState {
  const currentPrice = params.company.currentPrice;

  // Build standard 5-year chronological ratio rows (e.g. 2021 to 2025)
  const currentYear = new Date().getFullYear();
  const defaultYears = [currentYear - 4, currentYear - 3, currentYear - 2, currentYear - 1, currentYear];

  let fiveYearRatios: JevYearRatioState[] = [];
  if (params.fiveYearRatios && params.fiveYearRatios.length > 0) {
    fiveYearRatios = [...params.fiveYearRatios]
      .filter((r) => r.year >= 2000)
      .sort((a, b) => a.year - b.year)
      .slice(-5);
  }

  // Ensure 5 rows exist
  if (fiveYearRatios.length < 5) {
    const existingYears = new Set(fiveYearRatios.map((r) => r.year));
    for (const y of defaultYears) {
      if (!existingYears.has(y)) {
        fiveYearRatios.push({
          year: y,
          eps: null,
          roePct: null,
          payoutPct: null,
          dividendYieldPct: null,
          peRatio: null,
        });
      }
    }
    fiveYearRatios.sort((a, b) => a.year - b.year);
    fiveYearRatios = fiveYearRatios.slice(-5);
  }

  // Support / Resistance zones
  const supportZones = params.technical?.supportZones && params.technical.supportZones.length > 0
    ? params.technical.supportZones
    : currentPrice
    ? [{ from: Number((currentPrice * 0.94).toFixed(2)), to: Number((currentPrice * 0.96).toFixed(2)) }]
    : [];

  const resistanceZones = params.technical?.resistanceZones && params.technical.resistanceZones.length > 0
    ? params.technical.resistanceZones
    : currentPrice
    ? [{ from: Number((currentPrice * 1.04).toFixed(2)), to: Number((currentPrice * 1.06).toFixed(2)) }]
    : [];

  const distSupport = currentPrice && supportZones[0]
    ? Number((((currentPrice - supportZones[0].to) / currentPrice) * 100).toFixed(1))
    : null;

  const distResistance = currentPrice && resistanceZones[0]
    ? Number((((resistanceZones[0].from - currentPrice) / currentPrice) * 100).toFixed(1))
    : null;

  const newsList: JevNewsStateItem[] = params.news && params.news.length > 0
    ? params.news
    : [{ title: "", source: "", publishedAt: "", summary: "" }];

  const hasBS = Boolean(params.balanceSheet?.equity || params.balanceSheet?.totalAssets);
  const hasIS = Boolean(params.incomeStatement?.netIncome || params.incomeStatement?.revenue);
  const hasCF = Boolean(params.cashFlow?.operatingCashFlow || params.cashFlow?.freeCashFlow);
  const validRatioYears = fiveYearRatios.filter((r) => r.eps !== null || r.peRatio !== null || r.roePct !== null).length;

  return {
    company: {
      name: params.company.name,
      ticker: params.company.ticker,
      currentPrice: params.company.currentPrice,
      currency: params.company.currency || "MAD",
    },
    technical: {
      trend: params.technical?.trend || "UPTREND",
      supportZones,
      resistanceZones,
      breakoutStatus: params.technical?.breakoutStatus || "NONE",
      retestStatus: params.technical?.retestStatus || "NONE",
      volumeContext: params.technical?.volumeContext || "NORMAL",
      distanceFromNearestSupportPct: params.technical?.distanceFromNearestSupportPct ?? distSupport,
      distanceFromNearestResistancePct: params.technical?.distanceFromNearestResistancePct ?? distResistance,
    },
    balanceSheet: {
      totalAssets: params.balanceSheet?.totalAssets ?? null,
      totalLiabilities: params.balanceSheet?.totalLiabilities ?? null,
      equity: params.balanceSheet?.equity ?? null,
      cash: params.balanceSheet?.cash ?? null,
      shortTermDebt: params.balanceSheet?.shortTermDebt ?? null,
      longTermDebt: params.balanceSheet?.longTermDebt ?? null,
      totalDebt: params.balanceSheet?.totalDebt ?? null,
    },
    incomeStatement: {
      revenue: params.incomeStatement?.revenue ?? null,
      revenueGrowthPct: params.incomeStatement?.revenueGrowthPct ?? null,
      operatingIncome: params.incomeStatement?.operatingIncome ?? null,
      operatingMarginPct: params.incomeStatement?.operatingMarginPct ?? null,
      netIncome: params.incomeStatement?.netIncome ?? null,
      netIncomeGrowthPct: params.incomeStatement?.netIncomeGrowthPct ?? null,
      netMarginPct: params.incomeStatement?.netMarginPct ?? null,
    },
    cashFlow: {
      operatingCashFlow: params.cashFlow?.operatingCashFlow ?? null,
      investingCashFlow: params.cashFlow?.investingCashFlow ?? null,
      financingCashFlow: params.cashFlow?.financingCashFlow ?? null,
      freeCashFlow: params.cashFlow?.freeCashFlow ?? null,
      closingCash: params.cashFlow?.closingCash ?? null,
    },
    fiveYearRatios,
    valuation: {
      currentPe: params.valuation?.currentPe ?? null,
      fiveYearAveragePe: params.valuation?.fiveYearAveragePe ?? null,
      currentEps: params.valuation?.currentEps ?? null,
      epsTrend: params.valuation?.epsTrend ?? null,
      roePct: params.valuation?.roePct ?? null,
      dividendYieldPct: params.valuation?.dividendYieldPct ?? null,
      payoutPct: params.valuation?.payoutPct ?? null,
    },
    news: newsList,
    dataQuality: {
      latestFinancialPeriod: params.dataQuality?.latestFinancialPeriod ?? null,
      yearsAvailable: params.dataQuality?.yearsAvailable ?? validRatioYears,
      hasBalanceSheet: params.dataQuality?.hasBalanceSheet ?? hasBS,
      hasIncomeStatement: params.dataQuality?.hasIncomeStatement ?? hasIS,
      hasCashFlow: params.dataQuality?.hasCashFlow ?? hasCF,
      hasTechnicalHistory: params.dataQuality?.hasTechnicalHistory ?? (currentPrice !== null),
      hasRecentNews: params.dataQuality?.hasRecentNews ?? (params.news && params.news.length > 0 ? true : false),
    },
  };
}

export function buildJevQuickstartPayload(
  structuredState: JevStructuredState
): JevQuickstartPayload {
  return {
    state: JSON.stringify(structuredState),
    model: "jev-latest",
    questions: {
      investment_decision: {
        type: "choice",
        instructions:
          "Based on the comprehensive medium-to-long-term evaluation of company business quality, financial strength, profitability, sustainable growth, dividend safety, and valuation (with technical entry timing as secondary), what is the most appropriate long-term investment decision right now? Consider a medium-to-long-term horizon. Do not assume missing information is positive.",
        criteria: {
          BUY: "The available evidence supports strong long-term investment potential with sound financials, sustainable profitability, acceptable valuation, and favorable medium-to-long-term prospects.",
          HOLD: "The evidence shows acceptable or average long-term potential, fair valuation, or mixed fundamentals not attractive enough for new aggressive capital, but does not justify selling.",
          SELL: "The available evidence shows structural weaknesses, deterioration in profitability or financial strength, excessive valuation, or high long-term risks justifying avoiding or reducing the position.",
        },
      },
      investment_potential: {
        type: "score",
        instructions:
          "Evaluate the company's long-term investment potential based on its business quality, financial performance, profitability, growth, balance sheet, cash generation, shareholder returns, valuation and future prospects. Focus on the company as an investment, not short-term trading movements.",
        criteria: [
          "Very poor investment potential with significant structural or financial weaknesses",
          "Weak investment potential with limited growth or important risks",
          "Average investment potential with a mixture of strengths and weaknesses",
          "Strong investment potential supported by good business and financial fundamentals",
          "Excellent investment potential supported by strong financial quality, sustainable growth and attractive future prospects",
        ],
      },
      financial_quality: {
        type: "score",
        instructions:
          "Evaluate the overall financial quality of the company using the balance sheet, debt, equity, profitability, cash position and cash flow.",
        criteria: [
          "Very weak financial quality",
          "Weak financial quality",
          "Acceptable financial quality",
          "Strong financial quality",
          "Excellent financial quality",
        ],
      },
      growth_potential: {
        type: "score",
        instructions:
          "Evaluate the company's ability to grow its business and shareholder value over the coming years. Consider revenue growth, earnings growth, EPS evolution, ROE evolution, investments, business expansion and relevant company news.",
        criteria: [
          "Very weak growth potential or declining business",
          "Limited growth potential",
          "Moderate growth potential",
          "Strong growth potential",
          "Excellent sustainable long-term growth potential",
        ],
      },
      profitability_quality: {
        type: "score",
        instructions:
          "Evaluate the quality and sustainability of the company's profitability. Consider operating margins, net margin, return on equity (ROE) evolution, earnings consistency, and competitive strength.",
        criteria: [
          "Very weak profitability or structural losses",
          "Weak profitability with low margins or volatile earnings",
          "Acceptable profitability with stable but modest margins",
          "Strong and consistent profitability",
          "Exceptional profitability with high and sustainable margins",
        ],
      },
      valuation_attractiveness: {
        type: "score",
        instructions:
          "Evaluate the company's valuation from a long-term investment perspective using PER, five-year average PER, EPS trend, ROE, dividend yield, and growth outlook. Do not treat low multiples alone as sufficient evidence of undervaluation.",
        criteria: [
          "Very unattractive valuation or clearly overvalued relative to long-term fundamentals",
          "Unattractive valuation with limited margin of safety",
          "Fairly valued relative to fundamentals and earnings quality",
          "Attractive valuation offering a solid margin of safety for long-term holding",
          "Highly attractive valuation offering strong long-term upside and safety margin",
        ],
      },
      dividend_sustainability: {
        type: "score",
        instructions:
          "Evaluate the sustainability, safety, and attractiveness of the company's dividends and shareholder returns. Consider dividend yield, payout ratio, cash generation, balance sheet cushion, and historical track record.",
        criteria: [
          "Unsustainable dividend or significant risk of dividend reduction / no dividends",
          "Weak dividend safety with elevated payout ratio or strained cash flow",
          "Acceptable dividend profile with moderate yield and reasonable coverage",
          "Strong and sustainable dividend backed by solid earnings and cash flow",
          "Exceptional dividend profile with high yield, strong coverage, and growth potential",
        ],
      },
      entry_timing: {
        type: "score",
        instructions:
          "As a secondary consideration after fundamental quality and business strength, evaluate whether current market price structure and support zones offer an advantageous entry timing or accumulation price for initiating or adding to a long-term position.",
        criteria: [
          "Unfavorable entry timing; price is extended or near major overhead resistance",
          "Below-average entry timing; prefer waiting for consolidation or retracement",
          "Neutral entry timing; acceptable for initial gradual accumulation",
          "Favorable entry timing near solid support or accumulation zone",
          "Optimal entry timing at major historical support with asymmetric long-term risk-reward",
        ],
      },
    },
  };
}
