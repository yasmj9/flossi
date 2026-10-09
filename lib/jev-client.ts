import { getApiKey } from "./api-keys";
import { JevQuickstartPayload } from "./jev-payload";

export interface JevProbabilities {
  BUY?: number;
  HOLD?: number;
  SELL?: number;
  [key: string]: number | undefined;
}

export interface JevScoreResult {
  score: number | null; // 1 to 5
  label: string | null;
  confidence: number | null; // 0 - 100 percentage
  probabilities?: number[] | null;
}

export type ValuationStatus = "UNDERVALUED" | "FAIRLY_VALUED" | "OVERVALUED";

export interface JevValuationResult {
  valuation: ValuationStatus;
  assessment?: "undervalued" | "fairly_valued" | "overvalued";
  confidence: number | null; // 0 - 100 percentage
  keyReasons?: string[];
  reason?: string;
}

export type TechnicalAttractiveness =
  | "VERY_WEAK"
  | "WEAK"
  | "NEUTRAL"
  | "STRONG"
  | "VERY_STRONG";

export interface JevTechnicalResult {
  technicalAttractiveness: TechnicalAttractiveness;
  confidence: number | null; // 0 - 100 percentage
  keyReasons: string[];
}

export type NewsImpact =
  | "VERY_NEGATIVE"
  | "NEGATIVE"
  | "NEUTRAL"
  | "POSITIVE"
  | "VERY_POSITIVE";

export interface JevNewsImpactResult {
  newsImpact: NewsImpact;
  confidence: number | null; // 0 - 100 percentage
  keyReasons: string[];
}

export type EntryAttractiveness = "LOW" | "MEDIUM" | "HIGH" | "VERY_HIGH";

export interface JevEntryOpportunity {
  id: string;
  rank: number;
  zoneFormatted?: string;
  from?: number;
  to?: number;
  confidence: number | null; // 0 - 100 percentage
  attractiveness: EntryAttractiveness;
  reason: string;
}

export interface JevDecisionResult {
  status: "success" | "jev_not_configured" | "jev_error";
  decision?: "BUY" | "HOLD" | "AVOID" | "SELL" | string | null;
  confidence?: number | null; // 0 - 100 percentage
  probabilities?: JevProbabilities | null;
  scores?: {
    // Zouhair Achbakou Casabourse Methodology Pillars
    financialReportsQuality?: JevScoreResult | null;
    fiveYearIndicators?: JevScoreResult | null;
    technicalStructure?: JevScoreResult | null;
    // Backward-compatible aliases
    investmentPotential?: JevScoreResult | null;
    financialQuality?: JevScoreResult | null;
    growthPotential?: JevScoreResult | null;
    profitabilityQuality?: JevScoreResult | null;
    valuationAttractiveness?: JevScoreResult | null;
    dividendSustainability?: JevScoreResult | null;
    entryTiming?: JevScoreResult | null;
    fundamentalQuality?: JevScoreResult | null;
    technicalAttractiveness?: JevScoreResult | null;
    entryAttractiveness?: JevScoreResult | null;
  };
  valuation?: JevValuationResult | null;
  technical?: JevTechnicalResult | null;
  newsImpact?: JevNewsImpactResult | null;
  entries?: JevEntryOpportunity[];
  positiveFactors?: string[];
  negativeFactors?: string[];
  risks?: string[];
  investmentContext?: string | null;
  error?: string | null;
  rawResponse?: Record<string, unknown> | null;
}

const SCORE_CRITERIA_MAP = {
  financial_reports_quality: [
    "Very weak financial evolution",
    "Weak financial evolution",
    "Mixed or stable financial evolution",
    "Good financial evolution",
    "Very strong financial evolution",
  ],
  five_year_indicators: [
    "Very poor five-year indicators",
    "Weak five-year indicators",
    "Average five-year indicators",
    "Strong five-year indicators",
    "Excellent five-year indicators",
  ],
  technical_structure: [
    "Very weak technical structure",
    "Weak technical structure",
    "Neutral or rangebound technical structure",
    "Favorable technical structure",
    "Very strong technical structure with strong confirmation",
  ],
  investment_potential: [
    "Very poor investment potential with significant structural or financial weaknesses",
    "Weak investment potential with limited growth or important risks",
    "Average investment potential with a mixture of strengths and weaknesses",
    "Strong investment potential supported by good business and financial fundamentals",
    "Excellent investment potential supported by strong financial quality, sustainable growth and attractive future prospects",
  ],
  financial_quality: [
    "Very weak financial quality",
    "Weak financial quality",
    "Acceptable financial quality",
    "Strong financial quality",
    "Excellent financial quality",
  ],
  growth_potential: [
    "Very weak growth potential or declining business",
    "Limited growth potential",
    "Moderate growth potential",
    "Strong growth potential",
    "Excellent sustainable long-term growth potential",
  ],
  profitability_quality: [
    "Very weak profitability or structural losses",
    "Weak profitability with low margins or volatile earnings",
    "Acceptable profitability with stable but modest margins",
    "Strong and consistent profitability",
    "Exceptional profitability with high and sustainable margins",
  ],
  valuation_attractiveness: [
    "Very unattractive valuation or clearly overvalued relative to long-term fundamentals",
    "Unattractive valuation with limited margin of safety",
    "Fairly valued relative to fundamentals and earnings quality",
    "Attractive valuation offering a solid margin of safety for long-term holding",
    "Highly attractive valuation offering strong long-term upside and safety margin",
  ],
  dividend_sustainability: [
    "Unsustainable dividend or significant risk of dividend reduction / no dividends",
    "Weak dividend safety with elevated payout ratio or strained cash flow",
    "Acceptable dividend profile with moderate yield and reasonable coverage",
    "Strong and sustainable dividend backed by solid earnings and cash flow",
    "Exceptional dividend profile with high yield, strong coverage, and growth potential",
  ],
  entry_timing: [
    "Unfavorable entry timing; price is extended or near major overhead resistance",
    "Below-average entry timing; prefer waiting for consolidation or retracement",
    "Neutral entry timing; acceptable for initial gradual accumulation",
    "Favorable entry timing near solid support or accumulation zone",
    "Optimal entry timing at major historical support with asymmetric long-term risk-reward",
  ],
  fundamental_quality: [
    "Very weak fundamentals with significant deterioration or financial weakness",
    "Weak fundamentals with several important concerns",
    "Mixed or average fundamentals with both strengths and weaknesses",
    "Strong fundamentals with healthy profitability, balance sheet, and financial trends",
    "Excellent fundamentals with consistently strong profitability, cash generation, balance sheet quality, and historical improvement",
  ],
  technical_attractiveness: [
    "Very weak technical structure with significant downside risk",
    "Weak technical structure",
    "Neutral or mixed technical structure",
    "Strong technical structure",
    "Very strong technical structure with outstanding momentum and support",
  ],
  entry_attractiveness: [
    "Very low entry attractiveness with elevated risk",
    "Low entry attractiveness with limited margin of safety",
    "Moderate entry attractiveness requiring selective sizing",
    "Attractive entry opportunity with solid downside buffer",
    "Very attractive entry opportunity with strong risk-reward asymmetry",
  ],
};

function parseScoreAnswer(
  rawAnswer: unknown,
  criteriaList: string[],
  parentConfidence: number | null
): JevScoreResult | null {
  if (!rawAnswer) return null;

  let score: number | null = null;
  let label: string | null = null;
  let conf: number | null = null;
  let probs: number[] | null = null;

  if (typeof rawAnswer === "number") {
    score = Math.max(1, Math.min(5, Math.round(rawAnswer)));
    label = criteriaList[score - 1] || null;
    conf = parentConfidence;
  } else if (typeof rawAnswer === "string") {
    const num = parseInt(rawAnswer, 10);
    if (!isNaN(num) && num >= 1 && num <= 5) {
      score = num;
      label = criteriaList[score - 1] || null;
    } else {
      const idx = criteriaList.findIndex((c) => c.toLowerCase().includes(rawAnswer.toLowerCase()) || rawAnswer.toLowerCase().includes(c.toLowerCase()));
      if (idx !== -1) {
        score = idx + 1;
        label = criteriaList[idx];
      }
    }
    conf = parentConfidence;
  } else if (typeof rawAnswer === "object") {
    const obj = rawAnswer as Record<string, unknown>;

    // 1. Numerical score
    if (typeof obj.score === "number") {
      // Could be 0-4 or 1-5
      const s = obj.score;
      score = s <= 4 && s >= 0 && Array.isArray(obj.distribution) ? s + 1 : Math.max(1, Math.min(5, Math.round(s)));
    } else if (typeof obj.rating === "number") {
      score = Math.max(1, Math.min(5, Math.round(obj.rating)));
    } else if (typeof obj.average === "number") {
      score = Math.max(1, Math.min(5, Math.round(obj.average)));
    }

    // 2. Choice or criteria text
    const textChoice = (obj.answer as string) || (obj.choice as string) || (obj.label as string) || null;
    if (textChoice) {
      const idx = criteriaList.findIndex(
        (c) => c.toLowerCase().includes(textChoice.toLowerCase()) || textChoice.toLowerCase().includes(c.toLowerCase())
      );
      if (idx !== -1) {
        if (score === null) score = idx + 1;
        label = criteriaList[idx];
      } else {
        label = textChoice;
      }
    }

    if (score !== null && !label) {
      label = criteriaList[score - 1] || null;
    }

    // 3. Confidence
    if (typeof obj.confidence === "number") {
      conf = obj.confidence <= 1.0 && obj.confidence > 0 ? Math.round(obj.confidence * 100) : Math.round(obj.confidence);
    } else {
      conf = parentConfidence;
    }

    // 4. Probabilities / Distribution
    if (Array.isArray(obj.distribution)) {
      probs = obj.distribution.map((p) => (typeof p === "number" ? (p <= 1.0 ? Math.round(p * 100) : Math.round(p)) : 0));
    } else if (Array.isArray(obj.probabilities)) {
      probs = obj.probabilities.map((p) => (typeof p === "number" ? (p <= 1.0 ? Math.round(p * 100) : Math.round(p)) : 0));
    }
  }

  return {
    score,
    label,
    confidence: conf,
    probabilities: probs,
  };
}

/**
 * Sends the structured JSON payload to JEV AI (TypeSafe AI SystemOne)
 * following https://docs.typesafe.ai/introduction/quickstart
 */
export async function analyzeWithJev(
  payload: JevQuickstartPayload | Record<string, unknown>
): Promise<JevDecisionResult> {
  const apiKey = await getApiKey("jev");
  if (!apiKey) {
    return {
      status: "jev_not_configured",
      error: "JEV API key is not configured. Configure it in Settings to run AI investment analysis.",
    };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 14000);

  try {
    const res = await fetch("https://api.typesafe.ai/v1/systemone", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    let data: Record<string, unknown> | null = null;
    try {
      data = (await res.json()) as Record<string, unknown>;
    } catch {
      // not JSON
    }

    if (res.ok && data) {
      const answers = (data.answers as Record<string, unknown>) || {};
      const decisionAnswer =
        (answers.investment_decision as Record<string, unknown>) ||
        (answers.decision as Record<string, unknown>) ||
        (data.decision as Record<string, unknown>) ||
        {};

      // Extract choice: BUY / HOLD / SELL
      const rawChoice =
        (decisionAnswer.choice as string) ||
        (decisionAnswer.answer as string) ||
        (data.choice as string) ||
        null;

      const decision = rawChoice ? rawChoice.trim().toUpperCase() : "HOLD";

      // Extract confidence: may be 0-1 decimal or 0-100 percentage
      const rawConfidence =
        typeof decisionAnswer.confidence === "number"
          ? decisionAnswer.confidence
          : typeof data.confidence === "number"
          ? data.confidence
          : null;

      let confidence: number | null = null;
      if (rawConfidence !== null) {
        confidence = rawConfidence <= 1.0 && rawConfidence > 0 ? Math.round(rawConfidence * 100) : Math.round(rawConfidence);
      } else {
        confidence = 75;
      }

      // Extract probabilities if provided by JEV
      const rawProbs =
        (decisionAnswer.probabilities as Record<string, number>) ||
        (decisionAnswer.distribution as Record<string, number>) ||
        (data.probabilities as Record<string, number>) ||
        null;

      let probabilities: JevProbabilities | null = null;
      if (rawProbs && typeof rawProbs === "object") {
        probabilities = {};
        for (const [k, v] of Object.entries(rawProbs)) {
          if (typeof v === "number") {
            const pct = v <= 1.0 ? Math.round(v * 100) : Math.round(v);
            probabilities[k.toUpperCase()] = pct;
          }
        }
      }

      // Parse Zouhair Achbakou Casabourse Questions
      const financialReportsQuality = parseScoreAnswer(
        answers.financial_reports_quality || answers.financial_quality || answers.fundamental_quality,
        SCORE_CRITERIA_MAP.financial_reports_quality,
        confidence
      );

      const fiveYearIndicatorsScore = parseScoreAnswer(
        answers.five_year_indicators || answers.profitability_quality || answers.dividend_sustainability,
        SCORE_CRITERIA_MAP.five_year_indicators,
        confidence
      );

      const technicalStructureScore = parseScoreAnswer(
        answers.technical_structure || answers.entry_timing || answers.technical_attractiveness,
        SCORE_CRITERIA_MAP.technical_structure,
        confidence
      );

      // Parse Valuation Choice (UNDERVALUED | FAIRLY_VALUED | OVERVALUED)
      let parsedValuation: JevValuationResult | null = null;
      const rawValuation = answers.valuation;
      if (rawValuation) {
        let valChoice: "undervalued" | "fairly_valued" | "overvalued" = "fairly_valued";
        let valConf = confidence;
        let valReason = "";

        if (typeof rawValuation === "string") {
          const lower = rawValuation.toLowerCase();
          if (lower.includes("under")) valChoice = "undervalued";
          else if (lower.includes("over")) valChoice = "overvalued";
          else valChoice = "fairly_valued";
          valReason = rawValuation;
        } else if (typeof rawValuation === "object") {
          const vObj = rawValuation as Record<string, unknown>;
          const cStr = ((vObj.choice as string) || (vObj.answer as string) || "").toLowerCase();
          if (cStr.includes("under")) valChoice = "undervalued";
          else if (cStr.includes("over")) valChoice = "overvalued";
          else valChoice = "fairly_valued";

          if (typeof vObj.confidence === "number") {
            valConf = vObj.confidence <= 1.0 && vObj.confidence > 0 ? Math.round(vObj.confidence * 100) : Math.round(vObj.confidence);
          }
          valReason = (vObj.reason as string) || (vObj.explanation as string) || (vObj.criteria as string) || "";
        }

        parsedValuation = {
          valuation: valChoice === "undervalued" ? "UNDERVALUED" : valChoice === "overvalued" ? "OVERVALUED" : "FAIRLY_VALUED",
          assessment: valChoice,
          confidence: valConf,
          reason: valReason || `Stock assessed as ${valChoice.toUpperCase().replace("_", " ")} based on fundamentals and five-year indicators.`,
        };
      }

      // Legacy score parsing for backward-compatibility
      const investmentPotential = parseScoreAnswer(
        answers.investment_potential,
        SCORE_CRITERIA_MAP.investment_potential,
        confidence
      );
      const growthPotential = parseScoreAnswer(
        answers.growth_potential,
        SCORE_CRITERIA_MAP.growth_potential,
        confidence
      );
      const valuationAttractiveness = parseScoreAnswer(
        answers.valuation_attractiveness,
        SCORE_CRITERIA_MAP.valuation_attractiveness,
        confidence
      );

      const scores = {
        // Zouhair Achbakou Casabourse Methodology
        financialReportsQuality,
        fiveYearIndicators: fiveYearIndicatorsScore,
        technicalStructure: technicalStructureScore,
        // Backward-compatible aliases
        investmentPotential: investmentPotential || financialReportsQuality,
        financialQuality: financialReportsQuality,
        growthPotential,
        profitabilityQuality: fiveYearIndicatorsScore,
        valuationAttractiveness,
        dividendSustainability: fiveYearIndicatorsScore,
        entryTiming: technicalStructureScore,
        fundamentalQuality: financialReportsQuality,
        technicalAttractiveness: technicalStructureScore,
        entryAttractiveness: technicalStructureScore,
      };

      return {
        status: "success",
        decision: decision || "HOLD",
        confidence,
        probabilities,
        scores,
        valuation: parsedValuation,
        rawResponse: data,
      };
    }

    const detailObj = data?.detail as Record<string, unknown> | undefined;
    const detailMsg =
      (detailObj?.message as string) ||
      (data?.message as string) ||
      (data?.error as string) ||
      res.statusText;

    if (res.status === 401) {
      return {
        status: "jev_error",
        error: `JEV Authentication Error (401): ${detailMsg || "Invalid API key."}`,
        rawResponse: data,
      };
    }

    if (res.status === 403) {
      return {
        status: "jev_error",
        error: `JEV Authorization Error (403): ${detailMsg || "Access forbidden."}`,
        rawResponse: data,
      };
    }

    return {
      status: "jev_error",
      error: `JEV Error (${res.status}): ${detailMsg || "Request failed"}`,
      rawResponse: data,
    };
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    const isTimeout = (err as Error).name === "AbortError";
    return {
      status: "jev_error",
      error: isTimeout
        ? "JEV AI request timed out after 14 seconds."
        : `Network error connecting to JEV AI: ${(err as Error).message || "Unable to reach server"}`,
    };
  }
}
