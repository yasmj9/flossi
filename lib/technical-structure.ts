export interface PriceZone {
  low: number;
  high: number;
  formatted: string;
}

export interface TechnicalStructureData {
  trend: "Uptrend" | "Downtrend" | "Consolidation" | "Neutral" | "Unavailable";
  supportZone: PriceZone | null;
  resistanceZone: PriceZone | null;
  breakoutStatus: "Breakout" | "Breakdown" | "Retest" | "Within Range" | "Unavailable";
  breakdownStatus: boolean | null;
  retestStatus: boolean | null;
  volumeContext: "Above Average" | "Average" | "Below Average" | "Unavailable";
  recentVolatility: "Low" | "Moderate" | "High" | "Unavailable";
  distanceFromSupportPct: number | null; // e.g. +3.2%
  distanceFromResistancePct: number | null; // e.g. -2.5%
  nearestSupportMid: number | null;
  nearestResistanceMid: number | null;
  historicalPointsAvailable: number;
  dataQuality: "sufficient" | "partial" | "insufficient";
}

export interface RawPricePoint {
  date?: string;
  close: number;
  high?: number;
  low?: number;
  volume?: number;
}

/**
 * Calculates factual technical structure indicators from available market quotes and historical price points.
 * 
 * Rules:
 * - Calculate objective values only.
 * - Never invent or fabricate price or volume data.
 * - Support and resistance represented as zones (e.g. 480–485 MAD).
 * - Distances calculated factually as percentages from the zone boundary or midpoint.
 * - If insufficient data, returns factual Unavailable / null values.
 */
export interface CandidateEntryZone {
  id: string;
  from: number;
  to: number;
  formatted: string;
  type: "support" | "breakout_retest" | "pullback_consolidation" | "major_floor";
  description: string;
}

/**
 * Identifies up to 3 credible candidate entry zones based strictly on factual technical structures.
 * Rules:
 * - Does not invent entry zones when technical data is insufficient.
 * - If only 1 or 2 credible zones exist, returns only those.
 * - Does not rank or decide which entry is best (JEV evaluates attractiveness, confidence, ranking).
 */
export function generateCandidateEntryZones(params: {
  currentPrice: number | null;
  currency: string;
  structure: TechnicalStructureData;
  priceHistory?: RawPricePoint[] | null;
  fiftyTwoWeekLow?: number | null;
}): CandidateEntryZone[] {
  const { currentPrice, currency, structure, priceHistory, fiftyTwoWeekLow } = params;

  if (!currentPrice || currentPrice <= 0 || structure.dataQuality === "insufficient") {
    return [];
  }

  const zones: CandidateEntryZone[] = [];

  // Candidate Zone 1: Nearest Primary Support Zone
  if (structure.supportZone) {
    zones.push({
      id: "zone_1",
      from: structure.supportZone.low,
      to: structure.supportZone.high,
      formatted: `${structure.supportZone.low}–${structure.supportZone.high} ${currency}`,
      type: "support",
      description: "Primary technical support zone",
    });
  }

  // Candidate Zone 2: Breakout Retest or Resistance Conversion Zone
  if (structure.resistanceZone && (structure.breakoutStatus === "Breakout" || structure.breakoutStatus === "Retest")) {
    zones.push({
      id: "zone_2",
      from: structure.resistanceZone.low,
      to: structure.resistanceZone.high,
      formatted: `${structure.resistanceZone.low}–${structure.resistanceZone.high} ${currency}`,
      type: "breakout_retest",
      description: "Breakout level retest & confirmation zone",
    });
  } else if (structure.resistanceZone && currentPrice < structure.resistanceZone.low) {
    // If not breaking out, check if there is a secondary consolidation level below current price
    const validHistory = Array.isArray(priceHistory)
      ? priceHistory.filter((p) => p && typeof p.close === "number" && p.close > 0)
      : [];

    if (validHistory.length >= 8) {
      const lows = validHistory.map((p) => (typeof p.low === "number" ? p.low : p.close));
      const subSupports = lows.filter(
        (l) => l < (structure.supportZone ? structure.supportZone.low * 0.99 : currentPrice)
      );
      if (subSupports.length > 0) {
        subSupports.sort((a, b) => b - a);
        const secondLow = subSupports[0];
        const span = Math.max(secondLow * 0.012, 1);
        const lowBound = Math.round((secondLow - span / 2) * 10) / 10;
        const highBound = Math.round((secondLow + span / 2) * 10) / 10;

        zones.push({
          id: "zone_2",
          from: lowBound,
          to: highBound,
          formatted: `${lowBound}–${highBound} ${currency}`,
          type: "pullback_consolidation",
          description: "Secondary consolidation pullback zone",
        });
      }
    }
  }

  // Candidate Zone 3: Major Long-Term Floor or Deep Support
  if (zones.length < 3) {
    let floorCandidate: number | null = null;
    if (fiftyTwoWeekLow && (!structure.supportZone || fiftyTwoWeekLow < structure.supportZone.low * 0.96)) {
      floorCandidate = fiftyTwoWeekLow;
    }

    if (floorCandidate !== null && floorCandidate < currentPrice) {
      const span = Math.max(floorCandidate * 0.012, 1);
      const lowBound = Math.round((floorCandidate - span / 2) * 10) / 10;
      const highBound = Math.round((floorCandidate + span / 2) * 10) / 10;

      // Avoid duplicates
      const isDuplicate = zones.some(
        (z) => Math.abs(z.from - lowBound) / lowBound < 0.01
      );

      if (!isDuplicate) {
        zones.push({
          id: `zone_${zones.length + 1}`,
          from: lowBound,
          to: highBound,
          formatted: `${lowBound}–${highBound} ${currency}`,
          type: "major_floor",
          description: "Major long-term factual floor zone",
        });
      }
    }
  }

  // Return up to 3 candidate zones
  return zones.slice(0, 3);
}

export function calculateTechnicalStructure(params: {
  currentPrice: number | null;
  currency: string;
  dayHigh?: number | null;
  dayLow?: number | null;
  previousClose?: number | null;
  volume?: number | null;
  averageVolume?: number | null;
  priceHistory?: RawPricePoint[] | null;
  fiftyTwoWeekHigh?: number | null;
  fiftyTwoWeekLow?: number | null;
}): TechnicalStructureData {
  const {
    currentPrice,
    currency,
    dayHigh,
    dayLow,
    previousClose,
    volume,
    averageVolume,
    priceHistory,
    fiftyTwoWeekHigh,
    fiftyTwoWeekLow,
  } = params;

  if (currentPrice === null || isNaN(currentPrice) || currentPrice <= 0) {
    return {
      trend: "Unavailable",
      supportZone: null,
      resistanceZone: null,
      breakoutStatus: "Unavailable",
      breakdownStatus: null,
      retestStatus: null,
      volumeContext: "Unavailable",
      recentVolatility: "Unavailable",
      distanceFromSupportPct: null,
      distanceFromResistancePct: null,
      nearestSupportMid: null,
      nearestResistanceMid: null,
      historicalPointsAvailable: 0,
      dataQuality: "insufficient",
    };
  }

  // Collect factual historical or intraday price references
  const validHistory = Array.isArray(priceHistory)
    ? priceHistory.filter((p) => p && typeof p.close === "number" && !isNaN(p.close) && p.close > 0)
    : [];

  const pointsCount = validHistory.length;

  // 1. Determine Support & Resistance Zones
  // Support & Resistance should preferably be represented as zones: e.g. 480–485 MAD
  let supportZone: PriceZone | null = null;
  let resistanceZone: PriceZone | null = null;

  if (pointsCount >= 5) {
    // We have factual historical points (e.g., daily series)
    const highs = validHistory.map((p) => (typeof p.high === "number" ? p.high : p.close));
    const lows = validHistory.map((p) => (typeof p.low === "number" ? p.low : p.close));

    // Find local swing lows below current price for support
    const candidateSupports = lows.filter((l) => l < currentPrice);
    // Find local swing highs above current price for resistance
    const candidateResistances = highs.filter((h) => h > currentPrice);

    if (candidateSupports.length > 0) {
      // Nearest support level is the highest swing low below current price
      candidateSupports.sort((a, b) => b - a);
      const nearestLow = candidateSupports[0];
      // Zone span: 1% to 1.5% cluster around level
      const span = Math.max(nearestLow * 0.012, 1);
      const lowBound = Math.round((nearestLow - span / 2) * 10) / 10;
      const highBound = Math.round((nearestLow + span / 2) * 10) / 10;
      supportZone = {
        low: lowBound,
        high: highBound,
        formatted: `${lowBound}–${highBound} ${currency}`,
      };
    }

    if (candidateResistances.length > 0) {
      // Nearest resistance is lowest swing high above current price
      candidateResistances.sort((a, b) => a - b);
      const nearestHigh = candidateResistances[0];
      const span = Math.max(nearestHigh * 0.012, 1);
      const lowBound = Math.round((nearestHigh - span / 2) * 10) / 10;
      const highBound = Math.round((nearestHigh + span / 2) * 10) / 10;
      resistanceZone = {
        low: lowBound,
        high: highBound,
        formatted: `${lowBound}–${highBound} ${currency}`,
      };
    }
  }

  // Fallback to factual quote levels (52w range / intraday low-high / previous close)
  if (!supportZone) {
    let baseSupport: number | null = null;
    if (dayLow !== null && dayLow !== undefined && dayLow < currentPrice) {
      baseSupport = dayLow;
    } else if (fiftyTwoWeekLow !== null && fiftyTwoWeekLow !== undefined && fiftyTwoWeekLow < currentPrice) {
      // 52-week low provides a long-term factual floor
      baseSupport = fiftyTwoWeekLow;
    } else if (previousClose !== null && previousClose !== undefined && previousClose < currentPrice) {
      baseSupport = previousClose;
    }

    if (baseSupport !== null) {
      const span = Math.max(baseSupport * 0.01, 1);
      const lowBound = Math.round((baseSupport - span / 2) * 10) / 10;
      const highBound = Math.round((baseSupport + span / 2) * 10) / 10;
      supportZone = {
        low: lowBound,
        high: highBound,
        formatted: `${lowBound}–${highBound} ${currency}`,
      };
    }
  }

  if (!resistanceZone) {
    let baseResistance: number | null = null;
    if (dayHigh !== null && dayHigh !== undefined && dayHigh > currentPrice) {
      baseResistance = dayHigh;
    } else if (fiftyTwoWeekHigh !== null && fiftyTwoWeekHigh !== undefined && fiftyTwoWeekHigh > currentPrice) {
      baseResistance = fiftyTwoWeekHigh;
    } else if (previousClose !== null && previousClose !== undefined && previousClose > currentPrice) {
      baseResistance = previousClose;
    }

    if (baseResistance !== null) {
      const span = Math.max(baseResistance * 0.01, 1);
      const lowBound = Math.round((baseResistance - span / 2) * 10) / 10;
      const highBound = Math.round((baseResistance + span / 2) * 10) / 10;
      resistanceZone = {
        low: lowBound,
        high: highBound,
        formatted: `${lowBound}–${highBound} ${currency}`,
      };
    }
  }

  // 2. Trend Determination (Factual)
  let trend: TechnicalStructureData["trend"] = "Unavailable";
  if (pointsCount >= 5) {
    const closes = validHistory.map((p) => p.close);
    const firstQuarter = closes.slice(0, Math.ceil(closes.length / 3));
    const lastQuarter = closes.slice(-Math.ceil(closes.length / 3));
    const avgFirst = firstQuarter.reduce((a, b) => a + b, 0) / firstQuarter.length;
    const avgLast = lastQuarter.reduce((a, b) => a + b, 0) / lastQuarter.length;

    const changePct = ((avgLast - avgFirst) / avgFirst) * 100;
    if (changePct > 2.0) {
      trend = "Uptrend";
    } else if (changePct < -2.0) {
      trend = "Downtrend";
    } else {
      trend = "Consolidation";
    }
  } else if (previousClose !== null && previousClose !== undefined && previousClose > 0) {
    const diffPct = ((currentPrice - previousClose) / previousClose) * 100;
    if (diffPct > 0.5) trend = "Uptrend";
    else if (diffPct < -0.5) trend = "Downtrend";
    else trend = "Neutral";
  }

  // 3. Volatility Context
  let recentVolatility: TechnicalStructureData["recentVolatility"] = "Unavailable";
  if (dayHigh && dayLow && dayLow > 0) {
    const intradayRangePct = ((dayHigh - dayLow) / dayLow) * 100;
    if (intradayRangePct > 3.0) recentVolatility = "High";
    else if (intradayRangePct > 1.2) recentVolatility = "Moderate";
    else recentVolatility = "Low";
  } else if (pointsCount >= 5) {
    const closes = validHistory.map((p) => p.close);
    const returns: number[] = [];
    for (let i = 1; i < closes.length; i++) {
      returns.push(Math.abs((closes[i] - closes[i - 1]) / closes[i - 1]) * 100);
    }
    const avgDailyMove = returns.reduce((a, b) => a + b, 0) / returns.length;
    if (avgDailyMove > 2.0) recentVolatility = "High";
    else if (avgDailyMove > 0.8) recentVolatility = "Moderate";
    else recentVolatility = "Low";
  }

  // 4. Volume Context
  let volumeContext: TechnicalStructureData["volumeContext"] = "Unavailable";
  if (volume !== null && volume !== undefined && volume > 0) {
    if (averageVolume !== null && averageVolume !== undefined && averageVolume > 0) {
      const volRatio = volume / averageVolume;
      if (volRatio > 1.25) volumeContext = "Above Average";
      else if (volRatio < 0.75) volumeContext = "Below Average";
      else volumeContext = "Average";
    } else {
      volumeContext = "Average";
    }
  }

  // 5. Breakout / Breakdown / Retest Status
  let breakoutStatus: TechnicalStructureData["breakoutStatus"] = "Within Range";
  let breakdownStatus: boolean | null = false;
  let retestStatus: boolean | null = false;

  if (resistanceZone && currentPrice > resistanceZone.high) {
    breakoutStatus = "Breakout";
  } else if (supportZone && currentPrice < supportZone.low) {
    breakoutStatus = "Breakdown";
    breakdownStatus = true;
  } else if (
    supportZone &&
    currentPrice >= supportZone.low &&
    currentPrice <= supportZone.high * 1.01
  ) {
    breakoutStatus = "Retest";
    retestStatus = true;
  } else if (
    resistanceZone &&
    currentPrice <= resistanceZone.high &&
    currentPrice >= resistanceZone.low * 0.99
  ) {
    breakoutStatus = "Retest";
    retestStatus = true;
  }

  // 6. Distance from nearest Support & Resistance
  let distanceFromSupportPct: number | null = null;
  let nearestSupportMid: number | null = null;
  if (supportZone) {
    nearestSupportMid = Math.round(((supportZone.low + supportZone.high) / 2) * 100) / 100;
    // Distance from the upper bound of support to current price
    distanceFromSupportPct =
      Math.round(((currentPrice - supportZone.high) / supportZone.high) * 1000) / 10;
  }

  let distanceFromResistancePct: number | null = null;
  let nearestResistanceMid: number | null = null;
  if (resistanceZone) {
    nearestResistanceMid = Math.round(((resistanceZone.low + resistanceZone.high) / 2) * 100) / 100;
    // Distance from current price to the lower bound of resistance
    distanceFromResistancePct =
      Math.round(((currentPrice - resistanceZone.low) / resistanceZone.low) * 1000) / 10;
  }

  const dataQuality: TechnicalStructureData["dataQuality"] =
    supportZone && resistanceZone ? "sufficient" : supportZone || resistanceZone ? "partial" : "insufficient";

  return {
    trend,
    supportZone,
    resistanceZone,
    breakoutStatus,
    breakdownStatus,
    retestStatus,
    volumeContext,
    recentVolatility,
    distanceFromSupportPct,
    distanceFromResistancePct,
    nearestSupportMid,
    nearestResistanceMid,
    historicalPointsAvailable: pointsCount,
    dataQuality,
  };
}
