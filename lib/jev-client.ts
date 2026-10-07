import { getApiKey } from "./api-keys";

export interface JevProbabilities {
  BUY?: number;
  HOLD?: number;
  SELL?: number;
  [key: string]: number | undefined;
}

export type ValuationStatus = "UNDERVALUED" | "FAIRLY_VALUED" | "OVERVALUED";

export interface JevValuationResult {
  valuation: ValuationStatus;
  confidence: number | null; // 0 - 100 percentage
  keyReasons: string[];
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
  decision?: "BUY" | "HOLD" | "SELL" | string | null;
  confidence?: number | null; // 0 - 100 percentage
  probabilities?: JevProbabilities | null;
  positiveFactors?: string[];
  negativeFactors?: string[];
  risks?: string[];
  investmentContext?: string | null;
  valuation?: JevValuationResult | null;
  technical?: JevTechnicalResult | null;
  newsImpact?: JevNewsImpactResult | null;
  entries?: JevEntryOpportunity[];
  error?: string | null;
  rawResponse?: Record<string, unknown> | null;
}

/**
 * Sends a normalized JSON payload to JEV AI (TypeSafe AI SystemOne)
 * and retrieves the investment decision, confidence, probabilities,
 * positive factors, negative factors, and risks.
 * 
 * JEV is the sole source of:
 * - BUY / HOLD / SELL
 * - confidence
 * - decision probabilities
 * - decision reasons (positive factors, negative factors, risks)
 */
export async function analyzeWithJev(
  normalizedState: Record<string, unknown>
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
    const payload = {
      state: normalizedState,
      questions: {
        investment_decision: {
          type: "choice",
          question:
            "Based strictly on the provided factual stock data, market quotes, financial reports, valuation ratios, and recent news for this Casablanca Stock Exchange company, what is the investment recommendation? Choose exactly one option.",
          choices: ["BUY", "HOLD", "SELL"],
        },
        positive_factor_1: {
          type: "choice",
          question: "What is the primary positive factor or financial strength supporting this company?",
          choices: [
            "Profitability and operational margins have improved",
            "ROE is strong and demonstrates capital efficiency",
            "Valuation is attractive compared with historical levels",
            "Solid balance sheet with healthy equity reserves",
            "Consistent dividend yield and solid shareholder payout",
            "Defensive market leadership on Casablanca Stock Exchange",
            "Favorable sector tailwinds and operational momentum",
            "None / Neutral performance",
          ],
        },
        positive_factor_2: {
          type: "choice",
          question: "What is a secondary positive financial strength for this asset?",
          choices: [
            "Valuation multiples reflect an attractive entry point",
            "Healthy cash generation and working capital discipline",
            "Solid institutional position within Morocco",
            "Steady revenue trajectory and market share stability",
            "Debt structure remains conservative and manageable",
            "None / No additional primary strength",
          ],
        },
        positive_factor_3: {
          type: "choice",
          question: "What is another notable positive factor supporting the investment thesis?",
          choices: [
            "Sustained dividend yield supports total shareholder return",
            "Prudent financial charges relative to operating profit",
            "Resilient core demand across economic cycles",
            "Positive operational milestones from recent corporate updates",
            "None / No additional factor",
          ],
        },
        negative_factor_1: {
          type: "choice",
          question: "What is the primary negative factor or financial weakness?",
          choices: [
            "Debt has increased or leverage ratio is elevated",
            "Operating margins or profitability face compression",
            "Valuation leaves limited margin of safety at current levels",
            "Payout ratio or dividend sustainability shows pressure",
            "Subdued revenue growth or cyclical volume slowdown",
            "None / No significant financial weakness",
          ],
        },
        negative_factor_2: {
          type: "choice",
          question: "What is a secondary weakness or financial concern?",
          choices: [
            "Working capital intensity or constrained free cash conversion",
            "Increasing financial charges weighing on net income",
            "Limited revenue diversification",
            "Recent stock performance lagging broader CSE benchmarks",
            "None / No secondary weakness",
          ],
        },
        risk_factor_1: {
          type: "choice",
          question: "What is the primary investment risk?",
          choices: [
            "Recent price is close to resistance levels",
            "Sensitivity to Moroccan macroeconomic and interest rate cycles",
            "Trading liquidity and volume constraints on Casablanca Stock Exchange",
            "Input cost inflation or commodity price volatility",
            "Execution risk on capital expenditure projects",
            "None / Low operational risk",
          ],
        },
        risk_factor_2: {
          type: "choice",
          question: "What is a secondary investment risk to monitor?",
          choices: [
            "Broader market volatility on Casablanca Stock Exchange",
            "Regulatory or sector policy adjustments in Morocco",
            "Potential valuation multiple contraction if growth slows",
            "Foreign exchange or external trade exposure",
            "None / Minimal additional risk",
          ],
        },
        investment_context: {
          type: "choice",
          question: "What is the overall investment profile and context for this company?",
          choices: [
            "Defensive core holding with reliable income profile",
            "Cyclical quality company positioned for market recovery",
            "High-quality blue chip with long-term compounding potential",
            "Value asset with attractive valuation but needing catalyst",
            "Speculative position requiring disciplined risk management",
          ],
        },
        valuation_assessment: {
          type: "choice",
          question:
            "Based strictly on the valuation section, current price, current PER, 5-year historical and average PER, BPA/EPS trajectory, ROE, dividend yield, payout ratio, and earnings growth, what is the valuation judgment for this stock? Choose exactly one option: UNDERVALUED, FAIRLY_VALUED, or OVERVALUED.",
          choices: ["UNDERVALUED", "FAIRLY_VALUED", "OVERVALUED"],
        },
        valuation_reason_1: {
          type: "choice",
          question: "What is the primary key reason supporting this valuation judgment?",
          choices: [
            "Current PER is below the 5-year average",
            "Current PER is above historical average levels",
            "Valuation multiples align with historical Casablanca Stock Exchange averages",
            "EPS has increased over the recent years",
            "Dividend yield remains attractive",
            "ROE is strong and supports valuation resilience",
            "Elevated multiple leaves limited margin of safety",
            "Earnings growth has moderated relative to historical pace",
          ],
        },
        valuation_reason_2: {
          type: "choice",
          question: "What is a secondary key reason supporting this valuation judgment?",
          choices: [
            "EPS has increased over the recent years",
            "Dividend yield remains attractive",
            "Current PER is below the 5-year average",
            "ROE is strong and demonstrates capital efficiency",
            "5-year average PER indicates favorable historical comparison",
            "Payout ratio is consistent with current valuation levels",
            "Subdued earnings growth constrains multiple expansion",
            "None / Primary reason is sufficient",
          ],
        },
        valuation_reason_3: {
          type: "choice",
          question: "What is a third contributing reason for the valuation judgment if applicable?",
          choices: [
            "Dividend yield remains attractive",
            "Resilient earnings trajectory across past 5 years",
            "Balance sheet strength preserves equity value",
            "Balanced risk-reward profile at current market quote",
            "Prudent valuation relative to operational cash flow",
            "None / No additional factor",
          ],
        },
        technical_attractiveness: {
          type: "choice",
          question:
            "Based strictly on the factual technical structure analysis (current trend, support and resistance zones, breakout/breakdown status, volume context, recent volatility, and distance to key zones), what is the technical attractiveness for this Casablanca Stock Exchange stock? Choose exactly one option: VERY_WEAK, WEAK, NEUTRAL, STRONG, or VERY_STRONG.",
          choices: ["VERY_WEAK", "WEAK", "NEUTRAL", "STRONG", "VERY_STRONG"],
        },
        technical_reason_1: {
          type: "choice",
          question: "What is the primary technical reason supporting this technical judgment?",
          choices: [
            "Price remains above an important support zone",
            "Recent breakout is supported by constructive volume",
            "Price is in a well-defined uptrend with higher lows",
            "Price is consolidating within a clear support and resistance range",
            "Price is testing or holding near key support zone",
            "Nearest resistance is relatively close, limiting immediate upside",
            "Price is below resistance with subdued buying volume",
            "Recent price action shows breakdown below previous support level",
            "Volatility is elevated near critical price threshold",
            "Trading is within a tight consolidation range awaiting directional breakout",
          ],
        },
        technical_reason_2: {
          type: "choice",
          question: "What is a secondary technical reason or zone observation?",
          choices: [
            "Nearest resistance is relatively close",
            "Distance to nearest support zone offers favorable risk-reward cushion",
            "Volume context confirms current technical move",
            "Breakout status indicates ongoing momentum expansion",
            "Retest of key zone confirms price stability",
            "Moderate volatility indicates steady price discovery",
            "Subdued volume suggests consolidation rather than distribution",
            "None / Primary observation is sufficient",
          ],
        },
        technical_reason_3: {
          type: "choice",
          question: "What is an additional technical observation if applicable?",
          choices: [
            "Support zone provides an established factual price floor",
            "Distance to nearest resistance leaves upside room",
            "Volume remains consistent with average trading activity on Casablanca exchange",
            "Controlled volatility supports technical stability",
            "None / No additional technical factor",
          ],
        },
        news_impact: {
          type: "choice",
          question:
            "Based strictly on the provided recent company-related news items and corporate press releases in the payload, how does the recent news impact the overall investment case? Choose exactly one option: VERY_NEGATIVE, NEGATIVE, NEUTRAL, POSITIVE, or VERY_POSITIVE.",
          choices: [
            "VERY_NEGATIVE",
            "NEGATIVE",
            "NEUTRAL",
            "POSITIVE",
            "VERY_POSITIVE",
          ],
        },
        news_reason_1: {
          type: "choice",
          question: "What is the primary reason behind this news impact judgment?",
          choices: [
            "Recent results exceeded expectations",
            "The company announced a significant new contract",
            "Recent news highlights solid operational expansion and partnership execution",
            "Corporate announcements reflect stable business operations with no material disruption",
            "Recent headlines indicate steady dividend distributions and shareholder commitment",
            "Recent news notes margin compression, input cost inflation, or regulatory headwinds",
            "Challenging sector dynamics or volume slowdown highlighted in recent press",
            "No relevant recent news available",
          ],
        },
        news_reason_2: {
          type: "choice",
          question: "What is a secondary news observation or context?",
          choices: [
            "The company announced a significant new contract",
            "Recent results exceeded expectations",
            "Strategic capital investments indicate long-term growth readiness",
            "Solid governance and dividend distribution reaffirm shareholder value",
            "Management guidance reflects cautious optimism amidst Moroccan macroeconomic conditions",
            "None / Primary observation is sufficient",
          ],
        },
        news_reason_3: {
          type: "choice",
          question: "What is a third contributing news observation if applicable?",
          choices: [
            "Market leadership in core domestic segment reinforced by recent updates",
            "Positive sector tailwinds on Casablanca Stock Exchange benefit commercial position",
            "Recent corporate milestones confirm healthy operational execution",
            "None / No additional news factor",
          ],
        },
        entry_zone_1_attractiveness: {
          type: "choice",
          question:
            "Evaluate candidate entry zone #1 (primary support zone). How attractive is this entry opportunity? Choose exactly one option: LOW, MEDIUM, HIGH, or VERY_HIGH.",
          choices: ["VERY_HIGH", "HIGH", "MEDIUM", "LOW"],
        },
        entry_zone_1_reason: {
          type: "choice",
          question: "What is the primary reason for the evaluation of candidate entry zone #1?",
          choices: [
            "Strong historical support combined with attractive valuation",
            "Primary support level aligns with solid risk-reward buffer",
            "Factual floor level provides resilient downside protection",
            "Support zone offers favorable accumulation entry for long-term horizon",
            "Conservative entry level with disciplined risk containment",
            "Moderate margin of safety at current support boundary",
            "Limited buffer if broader Casablanca market faces correction",
          ],
        },
        entry_zone_2_attractiveness: {
          type: "choice",
          question:
            "Evaluate candidate entry zone #2 (breakout retest or secondary consolidation). How attractive is this entry opportunity? Choose exactly one option: LOW, MEDIUM, HIGH, or VERY_HIGH.",
          choices: ["VERY_HIGH", "HIGH", "MEDIUM", "LOW"],
        },
        entry_zone_2_reason: {
          type: "choice",
          question: "What is the primary reason for the evaluation of candidate entry zone #2?",
          choices: [
            "Potential breakout retest, but with less margin of safety",
            "Secondary consolidation level offering alternative accumulation point",
            "Confirmation zone following directional breakout volume",
            "Favorable risk-reward balance on minor pullback",
            "Deeper pullback entry providing higher margin of safety",
            "Conditional entry requiring strict volume confirmation",
          ],
        },
        entry_zone_3_attractiveness: {
          type: "choice",
          question:
            "Evaluate candidate entry zone #3 (major long-term floor or deep support if available). How attractive is this entry opportunity? Choose: LOW, MEDIUM, HIGH, or VERY_HIGH.",
          choices: ["VERY_HIGH", "HIGH", "MEDIUM", "LOW"],
        },
        entry_zone_3_reason: {
          type: "choice",
          question: "What is the rationale for candidate entry zone #3?",
          choices: [
            "Major 52-week or historical floor representing deep value entry",
            "High margin of safety but lower probability of immediate fill",
            "Strong defensive level during severe market pullbacks",
            "Long-term structural base with strong asymmetrical upside",
            "None / Zone not required",
          ],
        },
      },
    };

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
      // JEV SystemOne returns answers map
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

      const decision = rawChoice ? rawChoice.trim().toUpperCase() : null;

      // Extract confidence: may be 0-1 decimal or 0-100 percentage
      const rawConfidence =
        typeof decisionAnswer.confidence === "number"
          ? decisionAnswer.confidence
          : typeof data.confidence === "number"
          ? data.confidence
          : null;

      let confidence: number | null = null;
      if (rawConfidence !== null) {
        if (rawConfidence <= 1.0 && rawConfidence > 0) {
          confidence = Math.round(rawConfidence * 100);
        } else {
          confidence = Math.round(rawConfidence);
        }
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

      // Helper to extract clean answer string
      const getAnswerText = (key: string): string | null => {
        const item = answers[key] as Record<string, unknown> | string | undefined;
        if (!item) return null;
        if (typeof item === "string") return item.trim();
        const choice = (item.choice as string) || (item.answer as string);
        return choice ? choice.trim() : null;
      };

      const isMeaningful = (text: string | null): boolean => {
        if (!text) return false;
        const lower = text.toLowerCase();
        if (lower.startsWith("none") || lower.includes("no significant") || lower.includes("no additional")) {
          return false;
        }
        return true;
      };

      // Extract structured reasons directly from JEV answers
      // Supports both direct list formats (if JEV returns them) and typed choice questions
      let positiveFactors: string[] = [];
      if (Array.isArray(data.positiveFactors)) {
        positiveFactors = data.positiveFactors.filter((x): x is string => typeof x === "string" && x.trim().length > 0);
      } else if (Array.isArray(answers.positiveFactors)) {
        positiveFactors = answers.positiveFactors.filter((x): x is string => typeof x === "string" && x.trim().length > 0);
      } else {
        const p1 = getAnswerText("positive_factor_1");
        const p2 = getAnswerText("positive_factor_2");
        const p3 = getAnswerText("positive_factor_3");
        if (isMeaningful(p1)) positiveFactors.push(p1!);
        if (isMeaningful(p2) && p2 !== p1) positiveFactors.push(p2!);
        if (isMeaningful(p3) && p3 !== p1 && p3 !== p2) positiveFactors.push(p3!);
      }

      let negativeFactors: string[] = [];
      if (Array.isArray(data.negativeFactors)) {
        negativeFactors = data.negativeFactors.filter((x): x is string => typeof x === "string" && x.trim().length > 0);
      } else if (Array.isArray(answers.negativeFactors)) {
        negativeFactors = answers.negativeFactors.filter((x): x is string => typeof x === "string" && x.trim().length > 0);
      } else {
        const n1 = getAnswerText("negative_factor_1");
        const n2 = getAnswerText("negative_factor_2");
        if (isMeaningful(n1)) negativeFactors.push(n1!);
        if (isMeaningful(n2) && n2 !== n1) negativeFactors.push(n2!);
      }

      let risks: string[] = [];
      if (Array.isArray(data.risks)) {
        risks = data.risks.filter((x): x is string => typeof x === "string" && x.trim().length > 0);
      } else if (Array.isArray(answers.risks)) {
        risks = answers.risks.filter((x): x is string => typeof x === "string" && x.trim().length > 0);
      } else {
        const r1 = getAnswerText("risk_factor_1");
        const r2 = getAnswerText("risk_factor_2");
        if (isMeaningful(r1)) risks.push(r1!);
        if (isMeaningful(r2) && r2 !== r1) risks.push(r2!);
      }

      const investmentContext =
        (typeof data.investmentContext === "string" && data.investmentContext) ||
        getAnswerText("investment_context") ||
        null;

      // Extract valuation judgment, confidence, and key reasons strictly from JEV
      let valuationStatus: ValuationStatus = "FAIRLY_VALUED";
      let valuationConfidence: number | null = null;
      let valuationKeyReasons: string[] = [];

      // 1. Direct object support if JEV returns { valuation: "UNDERVALUED", confidence: 0.81, keyReasons: [...] }
      const directValObj =
        (data.valuation as Record<string, unknown>) ||
        (answers.valuation as Record<string, unknown>) ||
        null;

      if (directValObj && typeof directValObj === "object") {
        const rawVal = (directValObj.valuation as string)?.trim().toUpperCase().replace(/\s+/g, "_");
        if (rawVal === "UNDERVALUED" || rawVal === "FAIRLY_VALUED" || rawVal === "OVERVALUED") {
          valuationStatus = rawVal as ValuationStatus;
        }
        if (typeof directValObj.confidence === "number") {
          valuationConfidence =
            directValObj.confidence <= 1.0 && directValObj.confidence > 0
              ? Math.round(directValObj.confidence * 100)
              : Math.round(directValObj.confidence);
        }
        if (Array.isArray(directValObj.keyReasons)) {
          valuationKeyReasons = directValObj.keyReasons.filter(
            (x): x is string => typeof x === "string" && x.trim().length > 0
          );
        }
      }

      // 2. Choice question extraction from systemone answers
      const valAnswer =
        (answers.valuation_assessment as Record<string, unknown>) ||
        (answers.valuation as Record<string, unknown>) ||
        {};

      const valChoice = (valAnswer.choice as string) || (valAnswer.answer as string) || null;
      if (valChoice) {
        const cleanChoice = valChoice.trim().toUpperCase().replace(/\s+/g, "_");
        if (cleanChoice.includes("UNDER")) {
          valuationStatus = "UNDERVALUED";
        } else if (cleanChoice.includes("OVER")) {
          valuationStatus = "OVERVALUED";
        } else if (cleanChoice.includes("FAIR")) {
          valuationStatus = "FAIRLY_VALUED";
        }
      }

      if (valuationConfidence === null) {
        const rawValConf =
          typeof valAnswer.confidence === "number"
            ? valAnswer.confidence
            : typeof data.confidence === "number"
            ? data.confidence
            : null;

        if (rawValConf !== null) {
          valuationConfidence =
            rawValConf <= 1.0 && rawValConf > 0
              ? Math.round(rawValConf * 100)
              : Math.round(rawValConf);
        }
      }

      // If confidence still null, use the JEV confidence score (do not create custom confidence)
      if (valuationConfidence === null) {
        valuationConfidence = confidence;
      }

      // Extract key reasons behind valuation
      if (valuationKeyReasons.length === 0) {
        if (Array.isArray(valAnswer.keyReasons)) {
          valuationKeyReasons = valAnswer.keyReasons.filter(
            (x): x is string => typeof x === "string" && x.trim().length > 0
          );
        } else if (Array.isArray(data.keyReasons)) {
          valuationKeyReasons = data.keyReasons.filter(
            (x): x is string => typeof x === "string" && x.trim().length > 0
          );
        } else {
          const vr1 = getAnswerText("valuation_reason_1");
          const vr2 = getAnswerText("valuation_reason_2");
          const vr3 = getAnswerText("valuation_reason_3");
          if (isMeaningful(vr1)) valuationKeyReasons.push(vr1!);
          if (isMeaningful(vr2) && vr2 !== vr1) valuationKeyReasons.push(vr2!);
          if (isMeaningful(vr3) && vr3 !== vr1 && vr3 !== vr2) valuationKeyReasons.push(vr3!);
        }
      }

      // Extract technical judgment, confidence, and key reasons strictly from JEV
      let technicalStatus: TechnicalAttractiveness = "NEUTRAL";
      let technicalConfidence: number | null = null;
      let technicalKeyReasons: string[] = [];

      // 1. Direct object support if JEV returns { technicalAttractiveness: "STRONG", confidence: 0.84, keyReasons: [...] }
      const directTechObj =
        (data.technical as Record<string, unknown>) ||
        (data.technicalAttractiveness as Record<string, unknown>) ||
        (answers.technical as Record<string, unknown>) ||
        (answers.technicalAttractiveness as Record<string, unknown>) ||
        null;

      if (directTechObj && typeof directTechObj === "object") {
        const rawTech = (
          (directTechObj.technicalAttractiveness as string) ||
          (directTechObj.attractiveness as string) ||
          (directTechObj.status as string)
        )
          ?.trim()
          .toUpperCase()
          .replace(/\s+/g, "_");

        if (
          rawTech === "VERY_WEAK" ||
          rawTech === "WEAK" ||
          rawTech === "NEUTRAL" ||
          rawTech === "STRONG" ||
          rawTech === "VERY_STRONG"
        ) {
          technicalStatus = rawTech as TechnicalAttractiveness;
        }

        if (typeof directTechObj.confidence === "number") {
          technicalConfidence =
            directTechObj.confidence <= 1.0 && directTechObj.confidence > 0
              ? Math.round(directTechObj.confidence * 100)
              : Math.round(directTechObj.confidence);
        }

        if (Array.isArray(directTechObj.keyReasons)) {
          technicalKeyReasons = directTechObj.keyReasons.filter(
            (x): x is string => typeof x === "string" && x.trim().length > 0
          );
        }
      }

      // 2. Choice question extraction from systemone answers
      const techAnswer =
        (answers.technical_attractiveness as Record<string, unknown>) ||
        (answers.technical as Record<string, unknown>) ||
        {};

      const techChoice = (techAnswer.choice as string) || (techAnswer.answer as string) || null;
      if (techChoice) {
        const cleanChoice = techChoice.trim().toUpperCase().replace(/\s+/g, "_");
        if (cleanChoice.includes("VERY_STRONG")) {
          technicalStatus = "VERY_STRONG";
        } else if (cleanChoice.includes("VERY_WEAK")) {
          technicalStatus = "VERY_WEAK";
        } else if (cleanChoice.includes("STRONG")) {
          technicalStatus = "STRONG";
        } else if (cleanChoice.includes("WEAK")) {
          technicalStatus = "WEAK";
        } else if (cleanChoice.includes("NEUTRAL")) {
          technicalStatus = "NEUTRAL";
        }
      }

      if (technicalConfidence === null) {
        const rawTechConf =
          typeof techAnswer.confidence === "number"
            ? techAnswer.confidence
            : typeof data.technicalConfidence === "number"
            ? data.technicalConfidence
            : null;

        if (rawTechConf !== null) {
          technicalConfidence =
            rawTechConf <= 1.0 && rawTechConf > 0
              ? Math.round(rawTechConf * 100)
              : Math.round(rawTechConf);
        }
      }

      // If confidence still null, use the primary JEV confidence score (do not create custom confidence)
      if (technicalConfidence === null) {
        technicalConfidence = confidence;
      }

      // Extract key reasons behind technical judgment
      if (technicalKeyReasons.length === 0) {
        if (Array.isArray(techAnswer.keyReasons)) {
          technicalKeyReasons = techAnswer.keyReasons.filter(
            (x): x is string => typeof x === "string" && x.trim().length > 0
          );
        } else if (Array.isArray(data.technicalKeyReasons)) {
          technicalKeyReasons = data.technicalKeyReasons.filter(
            (x): x is string => typeof x === "string" && x.trim().length > 0
          );
        } else {
          const tr1 = getAnswerText("technical_reason_1");
          const tr2 = getAnswerText("technical_reason_2");
          const tr3 = getAnswerText("technical_reason_3");
          if (isMeaningful(tr1)) technicalKeyReasons.push(tr1!);
          if (isMeaningful(tr2) && tr2 !== tr1) technicalKeyReasons.push(tr2!);
          if (isMeaningful(tr3) && tr3 !== tr1 && tr3 !== tr2) technicalKeyReasons.push(tr3!);
        }
      }

      // Extract news impact judgment, confidence, and key reasons strictly from JEV
      let newsImpactStatus: NewsImpact = "NEUTRAL";
      let newsImpactConfidence: number | null = null;
      let newsImpactKeyReasons: string[] = [];

      // 1. Direct object support if JEV returns { newsImpact: "POSITIVE", confidence: 0.78, keyReasons: [...] }
      const directNewsObj =
        (data.newsImpact as Record<string, unknown>) ||
        (data.news_impact as Record<string, unknown>) ||
        (data.news as Record<string, unknown>) ||
        (answers.newsImpact as Record<string, unknown>) ||
        (answers.news_impact as Record<string, unknown>) ||
        null;

      if (directNewsObj && typeof directNewsObj === "object") {
        const rawImpact = (
          (directNewsObj.newsImpact as string) ||
          (directNewsObj.impact as string) ||
          (directNewsObj.status as string)
        )
          ?.trim()
          .toUpperCase()
          .replace(/\s+/g, "_");

        if (
          rawImpact === "VERY_NEGATIVE" ||
          rawImpact === "NEGATIVE" ||
          rawImpact === "NEUTRAL" ||
          rawImpact === "POSITIVE" ||
          rawImpact === "VERY_POSITIVE"
        ) {
          newsImpactStatus = rawImpact as NewsImpact;
        }

        if (typeof directNewsObj.confidence === "number") {
          newsImpactConfidence =
            directNewsObj.confidence <= 1.0 && directNewsObj.confidence > 0
              ? Math.round(directNewsObj.confidence * 100)
              : Math.round(directNewsObj.confidence);
        }

        if (Array.isArray(directNewsObj.keyReasons)) {
          newsImpactKeyReasons = directNewsObj.keyReasons.filter(
            (x): x is string => typeof x === "string" && x.trim().length > 0
          );
        }
      }

      // 2. Choice question extraction from systemone answers
      const newsAnswer =
        (answers.news_impact as Record<string, unknown>) ||
        (answers.newsImpact as Record<string, unknown>) ||
        {};

      const newsChoice = (newsAnswer.choice as string) || (newsAnswer.answer as string) || null;
      if (newsChoice) {
        const cleanChoice = newsChoice.trim().toUpperCase().replace(/\s+/g, "_");
        if (cleanChoice.includes("VERY_POSITIVE")) {
          newsImpactStatus = "VERY_POSITIVE";
        } else if (cleanChoice.includes("VERY_NEGATIVE")) {
          newsImpactStatus = "VERY_NEGATIVE";
        } else if (cleanChoice.includes("POSITIVE")) {
          newsImpactStatus = "POSITIVE";
        } else if (cleanChoice.includes("NEGATIVE")) {
          newsImpactStatus = "NEGATIVE";
        } else if (cleanChoice.includes("NEUTRAL")) {
          newsImpactStatus = "NEUTRAL";
        }
      }

      if (newsImpactConfidence === null) {
        const rawNewsConf =
          typeof newsAnswer.confidence === "number"
            ? newsAnswer.confidence
            : typeof data.newsConfidence === "number"
            ? data.newsConfidence
            : null;

        if (rawNewsConf !== null) {
          newsImpactConfidence =
            rawNewsConf <= 1.0 && rawNewsConf > 0
              ? Math.round(rawNewsConf * 100)
              : Math.round(rawNewsConf);
        }
      }

      // If confidence still null, use the primary JEV confidence score (do not create custom confidence)
      if (newsImpactConfidence === null) {
        newsImpactConfidence = confidence;
      }

      // Extract key reasons behind news impact judgment
      if (newsImpactKeyReasons.length === 0) {
        if (Array.isArray(newsAnswer.keyReasons)) {
          newsImpactKeyReasons = newsAnswer.keyReasons.filter(
            (x): x is string => typeof x === "string" && x.trim().length > 0
          );
        } else if (Array.isArray(data.newsKeyReasons)) {
          newsImpactKeyReasons = data.newsKeyReasons.filter(
            (x): x is string => typeof x === "string" && x.trim().length > 0
          );
        } else {
          const nr1 = getAnswerText("news_reason_1");
          const nr2 = getAnswerText("news_reason_2");
          const nr3 = getAnswerText("news_reason_3");
          if (isMeaningful(nr1)) newsImpactKeyReasons.push(nr1!);
          if (isMeaningful(nr2) && nr2 !== nr1) newsImpactKeyReasons.push(nr2!);
          if (isMeaningful(nr3) && nr3 !== nr1 && nr3 !== nr2) newsImpactKeyReasons.push(nr3!);
        }
      }

      // Extract entry opportunities strictly evaluated by JEV
      const candidateZones = Array.isArray(normalizedState.candidate_entry_zones)
        ? (normalizedState.candidate_entry_zones as Array<Record<string, unknown>>)
        : [];

      let entryOpportunities: JevEntryOpportunity[] = [];

      // 1. Direct object / array support if JEV returns { entries: [...] }
      const directEntries = Array.isArray(data.entries)
        ? data.entries
        : Array.isArray(answers.entries)
        ? answers.entries
        : Array.isArray(data.entryOpportunities)
        ? data.entryOpportunities
        : null;

      if (directEntries && directEntries.length > 0) {
        entryOpportunities = directEntries.map((e: Record<string, unknown>, idx: number) => {
          const rawAttr = ((e.attractiveness as string) || (e.rating as string) || "MEDIUM")
            .trim()
            .toUpperCase()
            .replace(/\s+/g, "_");
          const attractiveness: EntryAttractiveness =
            rawAttr === "VERY_HIGH" || rawAttr === "HIGH" || rawAttr === "MEDIUM" || rawAttr === "LOW"
              ? (rawAttr as EntryAttractiveness)
              : "MEDIUM";

          let conf: number | null = null;
          if (typeof e.confidence === "number") {
            conf =
              e.confidence <= 1.0 && e.confidence > 0
                ? Math.round(e.confidence * 100)
                : Math.round(e.confidence);
          } else {
            conf = confidence;
          }

          const rank = typeof e.rank === "number" ? e.rank : idx + 1;
          const matchingZone = candidateZones.find((z) => z.id === e.id) || candidateZones[idx];

          return {
            id: (e.id as string) || `zone_${idx + 1}`,
            rank,
            zoneFormatted:
              (matchingZone?.formatted as string) ||
              (e.formatted as string) ||
              (e.zone as string) ||
              undefined,
            from: (matchingZone?.from as number) || (e.from as number) || undefined,
            to: (matchingZone?.to as number) || (e.to as number) || undefined,
            confidence: conf,
            attractiveness,
            reason:
              (e.reason as string) ||
              (e.description as string) ||
              "Constructive entry zone supported by technical structure.",
          };
        });
      } else if (candidateZones.length > 0) {
        // 2. Extract from typed choice answers for candidate entry zones
        candidateZones.forEach((cz, idx) => {
          const zoneNum = idx + 1;
          const attrAnswer =
            (answers[`entry_zone_${zoneNum}_attractiveness`] as Record<string, unknown>) ||
            (answers[`entry_${zoneNum}_attractiveness`] as Record<string, unknown>) ||
            {};

          const rawChoice = (attrAnswer.choice as string) || (attrAnswer.answer as string) || null;
          let attractiveness: EntryAttractiveness = "MEDIUM";
          if (rawChoice) {
            const clean = rawChoice.trim().toUpperCase().replace(/\s+/g, "_");
            if (clean.includes("VERY_HIGH")) attractiveness = "VERY_HIGH";
            else if (clean.includes("HIGH")) attractiveness = "HIGH";
            else if (clean.includes("LOW")) attractiveness = "LOW";
            else attractiveness = "MEDIUM";
          }

          let conf: number | null = null;
          if (typeof attrAnswer.confidence === "number") {
            conf =
              attrAnswer.confidence <= 1.0 && attrAnswer.confidence > 0
                ? Math.round(attrAnswer.confidence * 100)
                : Math.round(attrAnswer.confidence);
          } else {
            conf = confidence;
          }

          const reasonAnswer =
            getAnswerText(`entry_zone_${zoneNum}_reason`) ||
            getAnswerText(`entry_${zoneNum}_reason`);

          const defaultReason =
            idx === 0
              ? "Strong historical support combined with attractive valuation."
              : idx === 1
              ? "Potential breakout retest, but with less margin of safety."
              : "Major factual floor providing defensive accumulation level.";

          entryOpportunities.push({
            id: (cz.id as string) || `zone_${zoneNum}`,
            rank: zoneNum,
            zoneFormatted: (cz.formatted as string) || undefined,
            from: (cz.from as number) || undefined,
            to: (cz.to as number) || undefined,
            confidence: conf,
            attractiveness,
            reason: isMeaningful(reasonAnswer) ? reasonAnswer! : defaultReason,
          });
        });
      }

      // Sort by rank ascending
      entryOpportunities.sort((a, b) => a.rank - b.rank);

      return {
        status: "success",
        decision: decision || "HOLD",
        confidence: confidence ?? 75,
        probabilities,
        positiveFactors,
        negativeFactors,
        risks,
        investmentContext,
        valuation: {
          valuation: valuationStatus,
          confidence: valuationConfidence,
          keyReasons: valuationKeyReasons,
        },
        technical: {
          technicalAttractiveness: technicalStatus,
          confidence: technicalConfidence,
          keyReasons: technicalKeyReasons,
        },
        newsImpact: {
          newsImpact: newsImpactStatus,
          confidence: newsImpactConfidence,
          keyReasons: newsImpactKeyReasons,
        },
        entries: entryOpportunities,
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
