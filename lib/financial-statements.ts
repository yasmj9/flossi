/**
 * Financial Statements Summary for Casablanca Stock Exchange listed companies.
 * Handles Bilan, CPC, and Trésorerie with compatible period comparisons.
 * 
 * Rules:
 * - Compare only compatible periods (FY vs FY, H1 vs H1, Q1 vs Q1).
 * - Green only for clearly favorable factual changes.
 * - Red only for clearly unfavorable factual changes.
 * - Neutral gray when meaning is not obvious.
 * - Never invent missing financial data.
 */

export type StatementPeriodType = "annual" | "semester" | "quarter";

export type MetricPolarity = "higher_is_better" | "lower_is_better" | "neutral";

export type ChangeSentiment = "favorable" | "unfavorable" | "neutral";

export interface StatementMetric {
  key: string;
  label: string;
  currentValue: number | null;
  previousValue: number | null;
  changePercent: number | null;
  unit: string;
  polarity: MetricPolarity;
  sentiment: ChangeSentiment;
}

export interface BilanSummary {
  periodLabel: string;
  comparisonPeriodLabel: string;
  totalAssets: StatementMetric;
  totalLiabilities: StatementMetric;
  equity: StatementMetric;
  cash: StatementMetric;
  receivables: StatementMetric;
  inventory: StatementMetric;
  shortTermDebt: StatementMetric;
  longTermDebt: StatementMetric;
  totalDebt: StatementMetric;
}

export interface CpcSummary {
  periodLabel: string;
  comparisonPeriodLabel: string;
  revenue: StatementMetric;
  operatingIncome: StatementMetric;
  ebitda: StatementMetric;
  financialResult: StatementMetric;
  profitBeforeTax: StatementMetric;
  netIncome: StatementMetric;
  // Objective calculated metrics
  revenueGrowth: StatementMetric;
  operatingMargin: StatementMetric;
  netMargin: StatementMetric;
  netIncomeGrowth: StatementMetric;
}

export interface TresorerieSummary {
  periodLabel: string;
  comparisonPeriodLabel: string;
  operatingCashFlow: StatementMetric;
  investingCashFlow: StatementMetric;
  financingCashFlow: StatementMetric;
  freeCashFlow: StatementMetric;
  openingCash: StatementMetric;
  closingCash: StatementMetric;
}

export interface FinancialStatementsData {
  periodType: StatementPeriodType;
  periodLabel: string; // e.g. "FY 2025"
  comparisonPeriodLabel: string; // e.g. "FY 2024"
  currency: string;
  bilan: BilanSummary;
  cpc: CpcSummary;
  tresorerie: TresorerieSummary;
  availablePeriodTypes: StatementPeriodType[];
}

/**
 * Objective change percentage calculation between two comparable periods.
 */
export function calculateChangePercent(
  curr: number | null | undefined,
  prev: number | null | undefined
): number | null {
  if (
    curr === null ||
    curr === undefined ||
    isNaN(curr) ||
    prev === null ||
    prev === undefined ||
    isNaN(prev) ||
    prev === 0
  ) {
    return null;
  }
  const delta = ((curr - prev) / Math.abs(prev)) * 100;
  return Number(delta.toFixed(2));
}

/**
 * Determines factual sentiment based on polarity:
 * - higher_is_better: > 0 => favorable (green), < 0 => unfavorable (red)
 * - lower_is_better: < 0 => favorable (green), > 0 => unfavorable (red)
 * - neutral: always neutral (gray)
 */
export function determineSentiment(
  changePercent: number | null,
  polarity: MetricPolarity
): ChangeSentiment {
  if (changePercent === null || isNaN(changePercent) || changePercent === 0) {
    return "neutral";
  }
  if (polarity === "neutral") {
    return "neutral";
  }
  if (polarity === "higher_is_better") {
    return changePercent > 0 ? "favorable" : "unfavorable";
  }
  if (polarity === "lower_is_better") {
    return changePercent < 0 ? "favorable" : "unfavorable";
  }
  return "neutral";
}

/**
 * Constructs a single StatementMetric with objective change % and sentiment.
 */
export function makeMetric(params: {
  key: string;
  label: string;
  curr: number | null | undefined;
  prev: number | null | undefined;
  unit?: string;
  polarity?: MetricPolarity;
  forcedChangePercent?: number | null;
}): StatementMetric {
  const {
    key,
    label,
    curr = null,
    prev = null,
    unit = "MAD",
    polarity = "neutral",
    forcedChangePercent,
  } = params;

  const validCurr = typeof curr === "number" && !isNaN(curr) ? curr : null;
  const validPrev = typeof prev === "number" && !isNaN(prev) ? prev : null;

  const changePct =
    forcedChangePercent !== undefined
      ? forcedChangePercent
      : calculateChangePercent(validCurr, validPrev);

  const sentiment = determineSentiment(changePct, polarity);

  return {
    key,
    label,
    currentValue: validCurr,
    previousValue: validPrev,
    changePercent: changePct,
    unit,
    polarity,
    sentiment,
  };
}

/**
 * Formats a currency or percentage value cleanly (e.g. 920.0M MAD, 14.2%).
 */
export function formatFinancialValue(
  value: number | null | undefined,
  unit = "MAD"
): string {
  if (value === null || value === undefined || isNaN(value)) {
    return "—";
  }

  if (unit === "%") {
    return `${value.toFixed(2)}%`;
  }

  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";

  if (abs >= 1_000_000_000) {
    return `${sign}${(abs / 1_000_000_000).toFixed(2)}B ${unit}`;
  }
  if (abs >= 1_000_000) {
    return `${sign}${(abs / 1_000_000).toFixed(1)}M ${unit}`;
  }
  if (abs >= 1_000) {
    return `${sign}${(abs / 1_000).toFixed(1)}K ${unit}`;
  }
  return `${sign}${abs.toFixed(2)} ${unit}`;
}

/**
 * Builds the complete Bilan, CPC, and Trésorerie summaries from raw period data.
 */
export function buildFinancialStatementsSummary(params: {
  periodType: StatementPeriodType;
  currentPeriodLabel: string;
  previousPeriodLabel: string;
  currency?: string;
  currentBilan?: Record<string, unknown> | null;
  previousBilan?: Record<string, unknown> | null;
  currentCpc?: Record<string, unknown> | null;
  previousCpc?: Record<string, unknown> | null;
  currentCashFlow?: Record<string, unknown> | null;
  previousCashFlow?: Record<string, unknown> | null;
  availablePeriodTypes?: StatementPeriodType[];
}): FinancialStatementsData {
  const {
    periodType,
    currentPeriodLabel,
    previousPeriodLabel,
    currency = "MAD",
    currentBilan = {},
    previousBilan = {},
    currentCpc = {},
    previousCpc = {},
    currentCashFlow = {},
    previousCashFlow = {},
    availablePeriodTypes = [periodType],
  } = params;

  const parseNum = (val: unknown): number | null => {
    if (typeof val === "number" && !isNaN(val)) return val;
    if (typeof val === "string") {
      const clean = parseFloat(val.replace(/[^0-9.-]/g, ""));
      return isNaN(clean) ? null : clean;
    }
    return null;
  };

  const getB = (obj: Record<string, unknown> | null | undefined, ...keys: string[]) => {
    if (!obj) return null;
    for (const k of keys) {
      if (k in obj) {
        const parsed = parseNum(obj[k]);
        if (parsed !== null) return parsed;
      }
    }
    return null;
  };

  // 1. BILAN
  // Current values
  const currAssets = getB(currentBilan, "total_assets", "actif_total", "total_actif", "assets");
  const prevAssets = getB(previousBilan, "total_assets", "actif_total", "total_actif", "assets");

  const currLiabilities = getB(currentBilan, "total_liabilities", "passif_total", "total_passif", "liabilities");
  const prevLiabilities = getB(previousBilan, "total_liabilities", "passif_total", "total_passif", "liabilities");

  const currEquity = getB(currentBilan, "equity", "capitaux_propres", "total_equity");
  const prevEquity = getB(previousBilan, "equity", "capitaux_propres", "total_equity");

  const currCash = getB(currentBilan, "cash", "tresorerie_actif", "cash_equivalents", "cash_and_equivalents");
  const prevCash = getB(previousBilan, "cash", "tresorerie_actif", "cash_equivalents", "cash_and_equivalents");

  const currReceivables = getB(currentBilan, "receivables", "creances_clients", "accounts_receivable");
  const prevReceivables = getB(previousBilan, "receivables", "creances_clients", "accounts_receivable");

  const currInventory = getB(currentBilan, "inventory", "stocks", "inventories");
  const prevInventory = getB(previousBilan, "inventory", "stocks", "inventories");

  const currStDebt = getB(currentBilan, "short_term_debt", "dettes_court_terme", "dettes_financieres_ct");
  const prevStDebt = getB(previousBilan, "short_term_debt", "dettes_court_terme", "dettes_financieres_ct");

  const currLtDebt = getB(currentBilan, "long_term_debt", "dettes_long_terme", "dettes_financieres_lt");
  const prevLtDebt = getB(previousBilan, "long_term_debt", "dettes_long_terme", "dettes_financieres_lt");

  // Objective Total Debt = shortTermDebt + longTermDebt if not directly given
  let currTotalDebt = getB(currentBilan, "total_debt", "dettes_financieres", "dettes_financieres_totales");
  if (currTotalDebt === null && currStDebt !== null && currLtDebt !== null) {
    currTotalDebt = currStDebt + currLtDebt;
  }

  let prevTotalDebt = getB(previousBilan, "total_debt", "dettes_financieres", "dettes_financieres_totales");
  if (prevTotalDebt === null && prevStDebt !== null && prevLtDebt !== null) {
    prevTotalDebt = prevStDebt + prevLtDebt;
  }

  const bilan: BilanSummary = {
    periodLabel: currentPeriodLabel,
    comparisonPeriodLabel: previousPeriodLabel,
    totalAssets: makeMetric({
      key: "totalAssets",
      label: "Total Assets",
      curr: currAssets,
      prev: prevAssets,
      unit: currency,
      polarity: "neutral",
    }),
    totalLiabilities: makeMetric({
      key: "totalLiabilities",
      label: "Total Liabilities",
      curr: currLiabilities,
      prev: prevLiabilities,
      unit: currency,
      polarity: "neutral",
    }),
    equity: makeMetric({
      key: "equity",
      label: "Equity",
      curr: currEquity,
      prev: prevEquity,
      unit: currency,
      polarity: "higher_is_better",
    }),
    cash: makeMetric({
      key: "cash",
      label: "Cash & Equivalents",
      curr: currCash,
      prev: prevCash,
      unit: currency,
      polarity: "higher_is_better",
    }),
    receivables: makeMetric({
      key: "receivables",
      label: "Receivables",
      curr: currReceivables,
      prev: prevReceivables,
      unit: currency,
      polarity: "neutral",
    }),
    inventory: makeMetric({
      key: "inventory",
      label: "Inventory",
      curr: currInventory,
      prev: prevInventory,
      unit: currency,
      polarity: "neutral",
    }),
    shortTermDebt: makeMetric({
      key: "shortTermDebt",
      label: "Short-Term Debt",
      curr: currStDebt,
      prev: prevStDebt,
      unit: currency,
      polarity: "lower_is_better",
    }),
    longTermDebt: makeMetric({
      key: "longTermDebt",
      label: "Long-Term Debt",
      curr: currLtDebt,
      prev: prevLtDebt,
      unit: currency,
      polarity: "lower_is_better",
    }),
    totalDebt: makeMetric({
      key: "totalDebt",
      label: "Total Debt",
      curr: currTotalDebt,
      prev: prevTotalDebt,
      unit: currency,
      polarity: "lower_is_better",
    }),
  };

  // 2. CPC
  const currRevenue = getB(currentCpc, "revenue", "chiffre_affaires", "ca", "sales");
  const prevRevenue = getB(previousCpc, "revenue", "chiffre_affaires", "ca", "sales");

  const currOperatingIncome = getB(currentCpc, "operating_income", "resultat_exploitation", "rex", "ebit");
  const prevOperatingIncome = getB(previousCpc, "operating_income", "resultat_exploitation", "rex", "ebit");

  const currEbitda = getB(currentCpc, "ebitda", "ebe", "excedent_brut_exploitation");
  const prevEbitda = getB(previousCpc, "ebitda", "ebe", "excedent_brut_exploitation");

  const currFinancialResult = getB(currentCpc, "financial_result", "resultat_financier");
  const prevFinancialResult = getB(previousCpc, "financial_result", "resultat_financier");

  const currPbt = getB(currentCpc, "profit_before_tax", "resultat_courant", "resultat_avant_impot", "ebt");
  const prevPbt = getB(previousCpc, "profit_before_tax", "resultat_courant", "resultat_avant_impot", "ebt");

  const currNetIncome = getB(currentCpc, "net_income", "resultat_net", "rn");
  const prevNetIncome = getB(previousCpc, "net_income", "resultat_net", "rn");

  // Objective values calculation
  // Revenue growth %
  const revenueGrowthPct = calculateChangePercent(currRevenue, prevRevenue);

  // Operating margin % = (Operating income / Revenue) * 100
  const currOpMargin =
    currOperatingIncome !== null && currRevenue !== null && currRevenue !== 0
      ? Number(((currOperatingIncome / currRevenue) * 100).toFixed(2))
      : null;
  const prevOpMargin =
    prevOperatingIncome !== null && prevRevenue !== null && prevRevenue !== 0
      ? Number(((prevOperatingIncome / prevRevenue) * 100).toFixed(2))
      : null;

  // Net margin % = (Net income / Revenue) * 100
  const currNetMargin =
    currNetIncome !== null && currRevenue !== null && currRevenue !== 0
      ? Number(((currNetIncome / currRevenue) * 100).toFixed(2))
      : null;
  const prevNetMargin =
    prevNetIncome !== null && prevRevenue !== null && prevRevenue !== 0
      ? Number(((prevNetIncome / prevRevenue) * 100).toFixed(2))
      : null;

  // Net income growth %
  const netIncomeGrowthPct = calculateChangePercent(currNetIncome, prevNetIncome);

  const cpc: CpcSummary = {
    periodLabel: currentPeriodLabel,
    comparisonPeriodLabel: previousPeriodLabel,
    revenue: makeMetric({
      key: "revenue",
      label: "Revenue",
      curr: currRevenue,
      prev: prevRevenue,
      unit: currency,
      polarity: "higher_is_better",
    }),
    operatingIncome: makeMetric({
      key: "operatingIncome",
      label: "Operating Income",
      curr: currOperatingIncome,
      prev: prevOperatingIncome,
      unit: currency,
      polarity: "higher_is_better",
    }),
    ebitda: makeMetric({
      key: "ebitda",
      label: "EBITDA",
      curr: currEbitda,
      prev: prevEbitda,
      unit: currency,
      polarity: "higher_is_better",
    }),
    financialResult: makeMetric({
      key: "financialResult",
      label: "Financial Result",
      curr: currFinancialResult,
      prev: prevFinancialResult,
      unit: currency,
      polarity: "neutral",
    }),
    profitBeforeTax: makeMetric({
      key: "profitBeforeTax",
      label: "Profit Before Tax",
      curr: currPbt,
      prev: prevPbt,
      unit: currency,
      polarity: "higher_is_better",
    }),
    netIncome: makeMetric({
      key: "netIncome",
      label: "Net Income",
      curr: currNetIncome,
      prev: prevNetIncome,
      unit: currency,
      polarity: "higher_is_better",
    }),
    revenueGrowth: makeMetric({
      key: "revenueGrowth",
      label: "Revenue Growth",
      curr: revenueGrowthPct,
      prev: null,
      unit: "%",
      polarity: "higher_is_better",
      forcedChangePercent: revenueGrowthPct,
    }),
    operatingMargin: makeMetric({
      key: "operatingMargin",
      label: "Operating Margin",
      curr: currOpMargin,
      prev: prevOpMargin,
      unit: "%",
      polarity: "higher_is_better",
    }),
    netMargin: makeMetric({
      key: "netMargin",
      label: "Net Margin",
      curr: currNetMargin,
      prev: prevNetMargin,
      unit: "%",
      polarity: "higher_is_better",
    }),
    netIncomeGrowth: makeMetric({
      key: "netIncomeGrowth",
      label: "Net Income Growth",
      curr: netIncomeGrowthPct,
      prev: null,
      unit: "%",
      polarity: "higher_is_better",
      forcedChangePercent: netIncomeGrowthPct,
    }),
  };

  // 3. TRÉSORERIE
  const currOcf = getB(currentCashFlow, "operating_cash_flow", "flux_activite", "cash_from_operations", "cfo");
  const prevOcf = getB(previousCashFlow, "operating_cash_flow", "flux_activite", "cash_from_operations", "cfo");

  const currIcf = getB(currentCashFlow, "investing_cash_flow", "flux_investissement", "cash_from_investing", "cfi");
  const prevIcf = getB(previousCashFlow, "investing_cash_flow", "flux_investissement", "cash_from_investing", "cfi");

  const currFcfFlow = getB(currentCashFlow, "financing_cash_flow", "flux_financement", "cash_from_financing", "cff");
  const prevFcfFlow = getB(previousCashFlow, "financing_cash_flow", "flux_financement", "cash_from_financing", "cff");

  // Objective Free Cash Flow: Operating Cash Flow - Capex (or OCF + ICF if capex not isolated)
  const currCapex = getB(currentCashFlow, "capex", "investissements", "capital_expenditures");
  const prevCapex = getB(previousCashFlow, "capex", "investissements", "capital_expenditures");

  let currFcf = getB(currentCashFlow, "free_cash_flow", "fcf");
  if (currFcf === null && currOcf !== null) {
    if (currCapex !== null) {
      currFcf = currOcf - Math.abs(currCapex);
    } else if (currIcf !== null) {
      // ICF is typically negative for investments
      currFcf = currOcf + currIcf;
    }
  }

  let prevFcf = getB(previousCashFlow, "free_cash_flow", "fcf");
  if (prevFcf === null && prevOcf !== null) {
    if (prevCapex !== null) {
      prevFcf = prevOcf - Math.abs(prevCapex);
    } else if (prevIcf !== null) {
      prevFcf = prevOcf + prevIcf;
    }
  }

  const currOpeningCash = getB(currentCashFlow, "opening_cash", "tresorerie_ouverture", "beginning_cash");
  const prevOpeningCash = getB(previousCashFlow, "opening_cash", "tresorerie_ouverture", "beginning_cash");

  const currClosingCash = getB(currentCashFlow, "closing_cash", "tresorerie_cloture", "ending_cash");
  const prevClosingCash = getB(previousCashFlow, "closing_cash", "tresorerie_cloture", "ending_cash");

  const tresorerie: TresorerieSummary = {
    periodLabel: currentPeriodLabel,
    comparisonPeriodLabel: previousPeriodLabel,
    operatingCashFlow: makeMetric({
      key: "operatingCashFlow",
      label: "Operating Cash Flow",
      curr: currOcf,
      prev: prevOcf,
      unit: currency,
      polarity: "higher_is_better",
    }),
    investingCashFlow: makeMetric({
      key: "investingCashFlow",
      label: "Investing Cash Flow",
      curr: currIcf,
      prev: prevIcf,
      unit: currency,
      polarity: "neutral",
    }),
    financingCashFlow: makeMetric({
      key: "financingCashFlow",
      label: "Financing Cash Flow",
      curr: currFcfFlow,
      prev: prevFcfFlow,
      unit: currency,
      polarity: "neutral",
    }),
    freeCashFlow: makeMetric({
      key: "freeCashFlow",
      label: "Free Cash Flow",
      curr: currFcf,
      prev: prevFcf,
      unit: currency,
      polarity: "higher_is_better",
    }),
    openingCash: makeMetric({
      key: "openingCash",
      label: "Opening Cash",
      curr: currOpeningCash,
      prev: prevOpeningCash,
      unit: currency,
      polarity: "neutral",
    }),
    closingCash: makeMetric({
      key: "closingCash",
      label: "Closing Cash",
      curr: currClosingCash,
      prev: prevClosingCash,
      unit: currency,
      polarity: "higher_is_better",
    }),
  };

  return {
    periodType,
    periodLabel: currentPeriodLabel,
    comparisonPeriodLabel: previousPeriodLabel,
    currency,
    bilan,
    cpc,
    tresorerie,
    availablePeriodTypes,
  };
}
