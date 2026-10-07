/**
 * Types and objective calculation helpers for 5-Year Key Indicators:
 * - BPA / EPS
 * - ROE %
 * - Payout Ratio %
 * - Dividend Yield %
 * - PER / P/E
 */

export interface YearIndicatorRow {
  year: number;
  bpa: number | null;
  roe: number | null;
  payoutRatio: number | null;
  dividendYield: number | null;
  per: number | null;
}

export type IndicatorTrend = "increasing" | "decreasing" | "stable" | null;

export interface IndicatorSummary {
  name: string;
  key: keyof Omit<YearIndicatorRow, "year">;
  unit: string;
  latestValue: number | null;
  fiveYearAverage: number | null;
  trend: IndicatorTrend;
}

export interface FiveYearIndicators {
  years: YearIndicatorRow[];
  summaries: {
    bpa: IndicatorSummary;
    roe: IndicatorSummary;
    payoutRatio: IndicatorSummary;
    dividendYield: IndicatorSummary;
    per: IndicatorSummary;
  };
  totalYearsAvailable: number;
}

/**
 * Objective average calculation from available numbers.
 * Ignores nulls; returns null if no valid numbers.
 */
export function calculateAverage(values: (number | null | undefined)[]): number | null {
  const valid = values.filter((v): v is number => typeof v === "number" && !isNaN(v));
  if (valid.length === 0) return null;
  const sum = valid.reduce((acc, curr) => acc + curr, 0);
  return Number((sum / valid.length).toFixed(2));
}

/**
 * Objective trend calculation across chronologically ordered values.
 * Uses factual percentage delta between earliest and latest available data points.
 * Relative threshold of ±5% defines increasing or decreasing; otherwise stable.
 */
export function calculateTrend(
  chronologicalValues: (number | null | undefined)[]
): IndicatorTrend {
  const valid = chronologicalValues.filter(
    (v): v is number => typeof v === "number" && !isNaN(v)
  );

  if (valid.length < 2) {
    return null;
  }

  const first = valid[0];
  const last = valid[valid.length - 1];

  if (first === 0) {
    const absDiff = last - first;
    if (absDiff > 0.05) return "increasing";
    if (absDiff < -0.05) return "decreasing";
    return "stable";
  }

  const relativeDelta = (last - first) / Math.abs(first);

  if (relativeDelta > 0.05) {
    return "increasing";
  } else if (relativeDelta < -0.05) {
    return "decreasing";
  } else {
    return "stable";
  }
}

/**
 * Calculates objective missing values when underlying financial metrics are available:
 * - ROE = (Net Income / Total Equity) * 100
 * - Payout Ratio = (Dividend Per Share / EPS) * 100 or (Total Dividends / Net Income) * 100
 * - PER = Share Price / EPS
 * - Dividend Yield = (Dividend Per Share / Share Price) * 100
 * 
 * Never invents missing data. If underlying data is not present, leaves field as null.
 */
export function calculateObjectiveMetrics(params: {
  eps?: number | null;
  price?: number | null;
  dps?: number | null;
  netIncome?: number | null;
  equity?: number | null;
  totalDividends?: number | null;
}): {
  bpa: number | null;
  roe: number | null;
  payoutRatio: number | null;
  dividendYield: number | null;
  per: number | null;
} {
  const { eps, price, dps, netIncome, equity, totalDividends } = params;

  // BPA
  const bpa = typeof eps === "number" && !isNaN(eps) ? eps : null;

  // ROE % = (Net Income / Equity) * 100
  let roe: number | null = null;
  if (typeof netIncome === "number" && typeof equity === "number" && equity !== 0) {
    roe = Number(((netIncome / equity) * 100).toFixed(2));
  }

  // Payout % = (DPS / EPS) * 100 or (Total Dividends / Net Income) * 100
  let payoutRatio: number | null = null;
  if (typeof dps === "number" && typeof eps === "number" && eps !== 0) {
    payoutRatio = Number(((dps / eps) * 100).toFixed(2));
  } else if (typeof totalDividends === "number" && typeof netIncome === "number" && netIncome !== 0) {
    payoutRatio = Number(((totalDividends / netIncome) * 100).toFixed(2));
  }

  // PER = Price / EPS
  let per: number | null = null;
  if (typeof price === "number" && typeof eps === "number" && eps > 0) {
    per = Number((price / eps).toFixed(2));
  }

  // Dividend Yield % = (DPS / Price) * 100
  let dividendYield: number | null = null;
  if (typeof dps === "number" && typeof price === "number" && price > 0) {
    dividendYield = Number(((dps / price) * 100).toFixed(2));
  }

  return { bpa, roe, payoutRatio, dividendYield, per };
}

/**
 * Builds the complete 5-Year Key Indicators structure with summaries and trends.
 * Rows are chronologically sorted (oldest to newest).
 */
export function processFiveYearIndicators(
  rawYears: YearIndicatorRow[]
): FiveYearIndicators {
  // Sort chronologically ascending
  const sortedYears = [...rawYears]
    .filter((y) => typeof y.year === "number" && y.year > 2000)
    .sort((a, b) => a.year - b.year)
    .slice(-5); // keep at most the last 5 available years

  const bpaVals = sortedYears.map((y) => y.bpa);
  const roeVals = sortedYears.map((y) => y.roe);
  const payoutVals = sortedYears.map((y) => y.payoutRatio);
  const divYieldVals = sortedYears.map((y) => y.dividendYield);
  const perVals = sortedYears.map((y) => y.per);

  const getLatest = (vals: (number | null)[]) => {
    const valid = vals.filter((v): v is number => typeof v === "number" && !isNaN(v));
    return valid.length > 0 ? valid[valid.length - 1] : null;
  };

  return {
    years: sortedYears,
    totalYearsAvailable: sortedYears.length,
    summaries: {
      bpa: {
        name: "BPA / EPS",
        key: "bpa",
        unit: "MAD",
        latestValue: getLatest(bpaVals),
        fiveYearAverage: calculateAverage(bpaVals),
        trend: calculateTrend(bpaVals),
      },
      roe: {
        name: "ROE",
        key: "roe",
        unit: "%",
        latestValue: getLatest(roeVals),
        fiveYearAverage: calculateAverage(roeVals),
        trend: calculateTrend(roeVals),
      },
      payoutRatio: {
        name: "Payout Ratio",
        key: "payoutRatio",
        unit: "%",
        latestValue: getLatest(payoutVals),
        fiveYearAverage: calculateAverage(payoutVals),
        trend: calculateTrend(payoutVals),
      },
      dividendYield: {
        name: "Dividend Yield",
        key: "dividendYield",
        unit: "%",
        latestValue: getLatest(divYieldVals),
        fiveYearAverage: calculateAverage(divYieldVals),
        trend: calculateTrend(divYieldVals),
      },
      per: {
        name: "PER / P/E",
        key: "per",
        unit: "x",
        latestValue: getLatest(perVals),
        fiveYearAverage: calculateAverage(perVals),
        trend: calculateTrend(perVals),
      },
    },
  };
}
