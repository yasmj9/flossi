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
    fundamental_quality: {
      type: "score";
      instructions: string;
      criteria: string[];
    };
    valuation_attractiveness: {
      type: "score";
      instructions: string;
      criteria: string[];
    };
    technical_attractiveness: {
      type: "score";
      instructions: string;
      criteria: string[];
    };
    entry_attractiveness: {
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
          "Based only on the provided company fundamentals, valuation, technical structure, financial statements, five-year ratios, cash flow, and recent news, what is the most appropriate investment decision right now? Consider both upside potential and downside risk. Do not assume missing information is positive.",
        criteria: {
          BUY: "The available evidence is sufficiently favorable to justify opening or increasing an investment position at the current price or near a credible entry zone.",
          HOLD: "The evidence is mixed, incomplete, fairly valued, or not attractive enough for a new purchase, but does not strongly justify selling.",
          SELL: "The available evidence shows sufficiently unfavorable fundamentals, valuation, technical structure, news, or risk to justify reducing or avoiding the position.",
        },
      },
      fundamental_quality: {
        type: "score",
        instructions:
          "Assess the overall fundamental quality of the company using the balance sheet, income statement, cash flow, profitability, growth, debt, equity, and five-year financial evolution.",
        criteria: [
          "Very weak fundamentals with significant deterioration or financial weakness",
          "Weak fundamentals with several important concerns",
          "Mixed or average fundamentals with both strengths and weaknesses",
          "Strong fundamentals with healthy profitability, balance sheet, and financial trends",
          "Excellent fundamentals with consistently strong profitability, cash generation, balance sheet quality, and historical improvement",
        ],
      },
      valuation_attractiveness: {
        type: "score",
        instructions:
          "Assess how attractive the current stock valuation is using current PER, historical PER, EPS, EPS trend, ROE, dividend yield, payout ratio, earnings growth, and current price. Do not treat a low PER alone as sufficient evidence of undervaluation.",
        criteria: [
          "Very unattractive valuation or clearly overvalued relative to available evidence",
          "Unattractive valuation with limited margin of safety",
          "Approximately fairly valued or valuation evidence is mixed",
          "Attractive valuation with a reasonable margin of safety",
          "Very attractive valuation with strong evidence of undervaluation and favorable fundamentals",
        ],
      },
      technical_attractiveness: {
        type: "score",
        instructions:
          "Assess the current technical attractiveness using trend, support, resistance, breakout or retest status, volume context, volatility, and distance from major support and resistance.",
        criteria: [
          "Very weak technical structure with significant downside risk",
          "Weak technical structure",
          "Neutral or mixed technical structure",
          "Strong technical structure",
          "Very strong technical structure with outstanding momentum and support",
        ],
      },
      entry_attractiveness: {
        type: "score",
        instructions:
          "Assess the attractiveness of entering or accumulating a position at the current price or near immediate support.",
        criteria: [
          "Very low entry attractiveness with elevated risk",
          "Low entry attractiveness with limited margin of safety",
          "Moderate entry attractiveness requiring selective sizing",
          "Attractive entry opportunity with solid downside buffer",
          "Very attractive entry opportunity with strong risk-reward asymmetry",
        ],
      },
    },
  };
}
