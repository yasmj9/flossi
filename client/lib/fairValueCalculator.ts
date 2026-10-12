import {
  ReportType,
  StatementScope,
} from './types';
import { parseFinancialNumber } from './financialMath';

export type ValuationScenarioType = 'conservative' | 'base' | 'optimistic';

export interface ScenarioParameters {
  type: ValuationScenarioType;
  label: string;
  subtitle: string;
  growthRatePercent: number; // e.g. 8 for 8%
  futurePeRatio: number; // e.g. 16 for 16x
}

export interface ScenarioValuationResult {
  type: ValuationScenarioType;
  label: string;
  subtitle: string;
  growthRatePercent: number;
  futurePeRatio: number;
  futureEPS: number; // MAD
  futureStockPrice: number; // MAD
  fairValueMAD: number; // MAD (without dividends)
  fairValueWithDividendsMAD: number | null; // MAD (with dividends discounted)
  targetBuyPriceMAD: number; // MAD (at user desired margin of safety)
  discountToFairValuePercent: number | null; // % relative to current market price
  marginOfSafetyBufferPercent: number | null; // % discount relative to fair value
  projectedAnnualizedReturnPercent: number | null; // CAGR return from current price to future price
  dividendContributionPercent: number | null; // proportion of return or impact from dividends
}

export interface FairValueCalculationResult {
  isCalculable: boolean;
  missingInputs: string[];
  assumptions: {
    baseEPS: number | null;
    epsSourceDescription: string;
    isSemiAnnualEPS: boolean;
    currentStockPriceMAD: number | null;
    investmentHorizonYears: number;
    expectedAnnualGrowthPercent: number | null;
    futurePeRatio: number | null;
    requiredReturnRatePercent: number; // e.g. 10%
    desiredMarginOfSafetyPercent: number; // e.g. 20%
    annualDividendMAD: number | null;
    dividendMode: 'exclude' | 'include';
  };
  baseScenario: ScenarioValuationResult | null;
  conservativeScenario: ScenarioValuationResult | null;
  optimisticScenario: ScenarioValuationResult | null;
  externalFairValueComparison: {
    manualFairValueMAD: number | null;
    calculatedFairValueMAD: number | null;
    differencePercent: number | null;
    divergenceExplanation: string | null;
  };
  valuationAttractiveness: {
    status: 'UNDERVALUED' | 'FAIRLY_VALUED' | 'OVERVALUED' | 'INSUFFICIENT_DATA';
    badgeLabel: string;
    badgeColor: string; // Tailwind styling tokens
    summaryMessage: string;
    actionGuidance: string;
  };
  explanationSteps: {
    stepNumber: number;
    title: string;
    formula: string;
    appliedFormula: string;
    result: string;
    interpretation: string;
  }[];
}

/**
 * Formula A — Future EPS
 * Future EPS = Current EPS × (1 + g)^n
 */
export function calculateFutureEPS(
  currentEPS: number,
  annualGrowthRateDecimal: number,
  years: number
): number {
  if (currentEPS <= 0 || years <= 0) return 0;
  return currentEPS * Math.pow(1 + annualGrowthRateDecimal, years);
}

/**
 * Formula B — Estimated Future Stock Price
 * Future Price = Future EPS × Future P/E
 */
export function calculateFutureStockPrice(
  futureEPS: number,
  futurePeRatio: number
): number {
  if (futureEPS <= 0 || futurePeRatio <= 0) return 0;
  return futureEPS * futurePeRatio;
}

/**
 * Formula C — Estimated Fair Value Today (Forward Earnings Valuation)
 * Without dividends:
 * Fair Value = Future Price / (1 + r)^n
 *
 * With cumulative discounted dividends:
 * If annual dividend d is assumed constant:
 * Fair Value = (Future Price / (1+r)^n) + Sum(t=1..n, d / (1+r)^t)
 */
export function calculateFairValue(
  futurePrice: number,
  requiredReturnDecimal: number,
  years: number,
  annualDividendMAD: number | null = null,
  includeDividends: boolean = false
): { fairValuePure: number; fairValueWithDividends: number | null; totalDividendsDiscounted: number } {
  if (futurePrice <= 0 || requiredReturnDecimal <= -1 || years <= 0) {
    return { fairValuePure: 0, fairValueWithDividends: null, totalDividendsDiscounted: 0 };
  }

  const discountFactorFuturePrice = Math.pow(1 + requiredReturnDecimal, years);
  const fairValuePure = futurePrice / discountFactorFuturePrice;

  if (!includeDividends || annualDividendMAD === null || annualDividendMAD <= 0) {
    return { fairValuePure, fairValueWithDividends: null, totalDividendsDiscounted: 0 };
  }

  // Calculate discounted sum of dividends over n years
  let discountedDividendsSum = 0;
  for (let t = 1; t <= years; t++) {
    discountedDividendsSum += annualDividendMAD / Math.pow(1 + requiredReturnDecimal, t);
  }

  const fairValueWithDividends = fairValuePure + discountedDividendsSum;
  return {
    fairValuePure,
    fairValueWithDividends,
    totalDividendsDiscounted: discountedDividendsSum,
  };
}

/**
 * Formula D — Target Buy Price (Target Entry Price)
 * Target Buy Price = Fair Value × (1 - Margin of Safety)
 */
export function calculateTargetBuyPrice(
  fairValue: number,
  marginOfSafetyDecimal: number
): number {
  if (fairValue <= 0) return 0;
  const clampedMargin = Math.max(0, Math.min(0.9, marginOfSafetyDecimal));
  return fairValue * (1 - clampedMargin);
}

/**
 * Formula E — Discount / Premium to Fair Value (%)
 * Discount = ((Fair Value - Current Price) / Fair Value) × 100
 * A positive number means Current Price is below Fair Value (a discount).
 * A negative number means Current Price is above Fair Value (a premium/overvaluation).
 */
export function calculateDiscountToFairValue(
  fairValue: number,
  currentPrice: number
): number | null {
  if (fairValue <= 0 || currentPrice <= 0) return null;
  return ((fairValue - currentPrice) / fairValue) * 100;
}

/**
 * Projected Annualized Investment Return (CAGR)
 * Rate = ((Future Price / Current Price) ^ (1 / n) - 1) × 100
 */
export function calculateProjectedAnnualReturn(
  currentPrice: number,
  futurePrice: number,
  years: number
): number | null {
  if (currentPrice <= 0 || futurePrice <= 0 || years <= 0) return null;
  const ratio = futurePrice / currentPrice;
  return (Math.pow(ratio, 1 / years) - 1) * 100;
}

/**
 * Evaluates full valuation for a specific scenario
 */
export function evaluateValuationScenario(
  scenarioType: ValuationScenarioType,
  label: string,
  subtitle: string,
  baseEPS: number,
  growthPercent: number,
  futurePe: number,
  horizonYears: number,
  requiredReturnPercent: number,
  marginOfSafetyPercent: number,
  currentPrice: number | null,
  annualDividendMAD: number | null,
  includeDividends: boolean
): ScenarioValuationResult {
  const g = growthPercent / 100;
  const r = requiredReturnPercent / 100;
  const mos = marginOfSafetyPercent / 100;

  const futureEPS = calculateFutureEPS(baseEPS, g, horizonYears);
  const futureStockPrice = calculateFutureStockPrice(futureEPS, futurePe);
  const fairValueCalc = calculateFairValue(
    futureStockPrice,
    r,
    horizonYears,
    annualDividendMAD,
    includeDividends
  );

  const effectiveFairValue = includeDividends && fairValueCalc.fairValueWithDividends !== null
    ? fairValueCalc.fairValueWithDividends
    : fairValueCalc.fairValuePure;

  const targetBuyPriceMAD = calculateTargetBuyPrice(effectiveFairValue, mos);

  const discountToFairValuePercent = currentPrice !== null
    ? calculateDiscountToFairValue(effectiveFairValue, currentPrice)
    : null;

  const marginOfSafetyBufferPercent = discountToFairValuePercent;

  const projectedAnnualizedReturnPercent = currentPrice !== null
    ? calculateProjectedAnnualReturn(currentPrice, futureStockPrice, horizonYears)
    : null;

  const dividendContributionPercent = fairValueCalc.totalDividendsDiscounted > 0 && effectiveFairValue > 0
    ? (fairValueCalc.totalDividendsDiscounted / effectiveFairValue) * 100
    : null;

  return {
    type: scenarioType,
    label,
    subtitle,
    growthRatePercent: growthPercent,
    futurePeRatio: futurePe,
    futureEPS,
    futureStockPrice,
    fairValueMAD: fairValueCalc.fairValuePure,
    fairValueWithDividendsMAD: fairValueCalc.fairValueWithDividends,
    targetBuyPriceMAD,
    discountToFairValuePercent,
    marginOfSafetyBufferPercent,
    projectedAnnualizedReturnPercent,
    dividendContributionPercent,
  };
}

/**
 * Evaluates the entire Fair Value and Margin of Safety model for a given company dataset.
 */
export function calculateFullFairValueAnalysis(params: {
  reportType: ReportType;
  statementScope: StatementScope;
  currentStockPriceRaw: string | number | null | undefined;
  manualEPSRaw: string | number | null | undefined;
  calculatedEPSValue: number | null; // from feature 2
  expectedGrowthRaw: string | number | null | undefined;
  futurePeRatioRaw: string | number | null | undefined;
  requiredReturnRateRaw: string | number | null | undefined;
  desiredMarginOfSafetyRaw: string | number | null | undefined;
  investmentHorizonYearsRaw: string | number | null | undefined;
  dividendPerShareRaw: string | number | null | undefined;
  manualFairValueRaw: string | number | null | undefined;
  dividendMode?: 'exclude' | 'include';
}): FairValueCalculationResult {
  const missingInputs: string[] = [];

  // 1. Current stock price
  const currentStockPrice = parseFinancialNumber(params.currentStockPriceRaw);
  if (currentStockPrice === null || currentStockPrice <= 0) {
    missingInputs.push('Prix actuel de l\'action (MAD)');
  }

  // 2. Base EPS: Prefer annual parent/group share EPS
  // Check if user manually entered EPS or if we have calculated EPS
  const manualEPS = parseFinancialNumber(params.manualEPSRaw);
  let baseEPS: number | null = null;
  let epsSourceDescription = '';
  const isSemiAnnual = params.reportType === 'semiannual';

  if (manualEPS !== null && manualEPS > 0) {
    baseEPS = manualEPS;
    epsSourceDescription = 'BPA manuel renseigné par l\'utilisateur';
  } else if (params.calculatedEPSValue !== null && params.calculatedEPSValue > 0) {
    baseEPS = params.calculatedEPSValue;
    epsSourceDescription = params.statementScope === 'consolidated'
      ? 'BPA calculé à partir du résultat net part du groupe'
      : 'BPA calculé à partir du résultat net social';
  } else {
    baseEPS = null;
    missingInputs.push('Bénéfice net par action (BPA) annuel positif');
  }

  if (isSemiAnnual) {
    missingInputs.push(
      'Données basées sur un rapport semestriel : le modèle de valorisation à terme requiert un BPA annualisé ou 12 mois glissants'
    );
  }

  // 3. Investment Horizon
  const horizonInput = parseFinancialNumber(params.investmentHorizonYearsRaw);
  const investmentHorizonYears = horizonInput !== null && horizonInput > 0 ? horizonInput : 4;

  // 4. Expected Earnings Growth Rate (%)
  const expectedGrowth = parseFinancialNumber(params.expectedGrowthRaw);
  if (expectedGrowth === null) {
    missingInputs.push('Croissance annuelle attendue des bénéfices (%)');
  }

  // 5. Future P/E Ratio
  const futurePeRatio = parseFinancialNumber(params.futurePeRatioRaw);
  if (futurePeRatio === null || futurePeRatio <= 0) {
    missingInputs.push('PER futur estimé (sortie)');
  }

  // 6. Required Return Rate (%)
  const reqReturnInput = parseFinancialNumber(params.requiredReturnRateRaw);
  const requiredReturnRate = reqReturnInput !== null && reqReturnInput > 0 ? reqReturnInput : 10;

  // 7. Desired Margin of Safety (%)
  const mosInput = parseFinancialNumber(params.desiredMarginOfSafetyRaw);
  const desiredMarginOfSafety = mosInput !== null && mosInput >= 0 ? mosInput : 20;

  // 8. Dividend
  const annualDividend = parseFinancialNumber(params.dividendPerShareRaw);
  const dividendMode = params.dividendMode || 'exclude';
  const includeDividends = dividendMode === 'include' && annualDividend !== null && annualDividend > 0;

  // 9. Manual Fair Value
  const manualFairValue = parseFinancialNumber(params.manualFairValueRaw);

  const isCalculable =
    missingInputs.length === 0 &&
    baseEPS !== null &&
    baseEPS > 0 &&
    expectedGrowth !== null &&
    futurePeRatio !== null &&
    futurePeRatio > 0 &&
    !isSemiAnnual;

  const assumptions = {
    baseEPS,
    epsSourceDescription,
    isSemiAnnualEPS: isSemiAnnual,
    currentStockPriceMAD: currentStockPrice,
    investmentHorizonYears,
    expectedAnnualGrowthPercent: expectedGrowth,
    futurePeRatio,
    requiredReturnRatePercent: requiredReturnRate,
    desiredMarginOfSafetyPercent: desiredMarginOfSafety,
    annualDividendMAD: annualDividend,
    dividendMode,
  };

  if (!isCalculable || baseEPS === null || expectedGrowth === null || futurePeRatio === null) {
    return {
      isCalculable: false,
      missingInputs,
      assumptions,
      baseScenario: null,
      conservativeScenario: null,
      optimisticScenario: null,
      externalFairValueComparison: {
        manualFairValueMAD: manualFairValue,
        calculatedFairValueMAD: null,
        differencePercent: null,
        divergenceExplanation: null,
      },
      valuationAttractiveness: {
        status: 'INSUFFICIENT_DATA',
        badgeLabel: 'DONNÉES INSUFFISANTES',
        badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
        summaryMessage: 'Veuillez compléter les paramètres clés de valorisation ci-dessus pour calculer la Juste Valeur.',
        actionGuidance: 'Renseignez un BPA annuel positif, un taux de croissance attendu et un PER futur raisonnable.',
      },
      explanationSteps: [],
    };
  }

  // Multi-scenario valuation
  // Base scenario: Exact user inputs
  const baseScenario = evaluateValuationScenario(
    'base',
    'Scénario de base',
    'Vos hypothèses de référence sélectionnées',
    baseEPS,
    expectedGrowth,
    futurePeRatio,
    investmentHorizonYears,
    requiredReturnRate,
    desiredMarginOfSafety,
    currentStockPrice,
    annualDividend,
    includeDividends
  );

  // Conservative scenario: growth reduced by 25-30% (min 0) and PE reduced by ~15-20%
  const conservativeGrowth = Math.max(0, Math.round((expectedGrowth * 0.7) * 10) / 10);
  const conservativePe = Math.max(8, Math.round((futurePeRatio * 0.8) * 10) / 10);
  const conservativeScenario = evaluateValuationScenario(
    'conservative',
    'Scénario prudent (stress-test)',
    'Croissance atténuée (-30 %) et multiple de sortie plus bas (-20 %)',
    baseEPS,
    conservativeGrowth,
    conservativePe,
    investmentHorizonYears,
    requiredReturnRate,
    desiredMarginOfSafety,
    currentStockPrice,
    annualDividend,
    includeDividends
  );

  // Optimistic scenario: growth increased slightly (+20%) and PE slightly higher (+15%)
  const optimisticGrowth = Math.round((expectedGrowth * 1.25) * 10) / 10;
  const optimisticPe = Math.round((futurePeRatio * 1.15) * 10) / 10;
  const optimisticScenario = evaluateValuationScenario(
    'optimistic',
    'Scénario optimiste',
    'Surperformance des bénéfices (+25 %) et valorisation favorable (+15 %)',
    baseEPS,
    optimisticGrowth,
    optimisticPe,
    investmentHorizonYears,
    requiredReturnRate,
    desiredMarginOfSafety,
    currentStockPrice,
    annualDividend,
    includeDividends
  );

  // External comparison
  const calculatedFairValueMAD = includeDividends && baseScenario.fairValueWithDividendsMAD !== null
    ? baseScenario.fairValueWithDividendsMAD
    : baseScenario.fairValueMAD;

  let differencePercent: number | null = null;
  let divergenceExplanation: string | null = null;

  if (manualFairValue !== null && manualFairValue > 0 && calculatedFairValueMAD > 0) {
    differencePercent = Math.round((((calculatedFairValueMAD - manualFairValue) / manualFairValue) * 100) * 10) / 10;
    if (Math.abs(differencePercent) <= 5) {
      divergenceExplanation = 'Cohérence forte : l\'estimation calculée est alignée à votre objectif externe (écart < 5 %).';
    } else if (differencePercent > 5) {
      divergenceExplanation = `L'estimation calculée dépasse votre objectif externe de ${differencePercent.toFixed(1)} %. Vérifiez si vos hypothèses de croissance ou de PER de sortie ne sont pas plus optimistes que celles de la note de broker.`;
    } else {
      divergenceExplanation = `L'estimation calculée est inférieure de ${Math.abs(differencePercent).toFixed(1)} % à votre objectif externe. Le modèle applique des hypothèses plus conservatrices ou exige un rendement plus élevé.`;
    }
  }

  // Attractiveness assessment
  // Based on Base Scenario & Target Buy Price
  let status: 'UNDERVALUED' | 'FAIRLY_VALUED' | 'OVERVALUED' | 'INSUFFICIENT_DATA' = 'FAIRLY_VALUED';
  let badgeLabel = 'VALORISATION NEUTRE';
  let badgeColor = 'bg-slate-100 text-slate-800 border-slate-300';
  let summaryMessage = '';
  let actionGuidance = '';

  if (currentStockPrice !== null) {
    const discount = baseScenario.discountToFairValuePercent ?? 0;
    const targetPrice = baseScenario.targetBuyPriceMAD;

    if (currentStockPrice <= targetPrice) {
      status = 'UNDERVALUED';
      badgeLabel = 'SOUS-ÉVALUÉE (PRIX ATTRACTIF)';
      badgeColor = 'bg-emerald-50 text-emerald-800 border-emerald-300';
      summaryMessage = `Le cours actuel (${currentStockPrice.toFixed(2)} MAD) est inférieur à votre prix d'achat cible (${targetPrice.toFixed(2)} MAD), offrant une marge de sécurité de plus de ${desiredMarginOfSafety.toFixed(0)} %.`;
      actionGuidance = 'Le titre se négocie avec une décote attractive par rapport à sa juste valeur estimée, ce qui offre une marge de sécurité propice à l\'investissement.';
    } else if (currentStockPrice <= calculatedFairValueMAD) {
      status = 'FAIRLY_VALUED';
      badgeLabel = 'VALEUR RAISONNABLE (SANS MARGE SUFFISANTE)';
      badgeColor = 'bg-blue-50 text-blue-800 border-blue-300';
      summaryMessage = `Le cours actuel (${currentStockPrice.toFixed(2)} MAD) est inférieur à la juste valeur (${calculatedFairValueMAD.toFixed(2)} MAD), mais supérieur à votre prix d'achat cible sécurisé (${targetPrice.toFixed(2)} MAD).`;
      actionGuidance = `Marge de sécurité actuelle de ${discount.toFixed(1)} %, inférieure aux ${desiredMarginOfSafety.toFixed(0)} % demandés. Une attente ou un achat partiel échelonné peut être envisagé.`;
    } else {
      status = 'OVERVALUED';
      badgeLabel = 'SURÉVALUÉE (COURS SUPÉRIEUR À LA JUSTE VALEUR)';
      badgeColor = 'bg-rose-50 text-rose-800 border-rose-300';
      const overpaymentPercent = Math.abs(discount);
      summaryMessage = `Le cours actuel (${currentStockPrice.toFixed(2)} MAD) dépasse la juste valeur intrinsèque estimée (${calculatedFairValueMAD.toFixed(2)} MAD) d'environ ${overpaymentPercent.toFixed(1)} %.`;
      actionGuidance = 'Le prix actuel intègre déjà une anticipation forte de croissance future. Risque de correction en cas de ralentissement opérationnel.';
    }
  }

  // Step by step explainability
  const explanationSteps = [
    {
      stepNumber: 1,
      title: 'BPA futur anticipé à horizon d\'investissement',
      formula: 'BPA Futur = BPA Actuel × (1 + Croissance)^Années',
      appliedFormula: `${baseEPS.toFixed(2)} MAD × (1 + ${(expectedGrowth / 100).toFixed(3)})^${investmentHorizonYears}`,
      result: `${baseScenario.futureEPS.toFixed(2)} MAD`,
      interpretation: `Sur la base d'une croissance annuelle moyenne de ${expectedGrowth.toFixed(1)} % par an pendant ${investmentHorizonYears} ans, le BPA passerait de ${baseEPS.toFixed(2)} MAD à ${baseScenario.futureEPS.toFixed(2)} MAD.`,
    },
    {
      stepNumber: 2,
      title: 'Prix futur estimé de l\'action (cours de sortie théorique)',
      formula: 'Prix Futur = BPA Futur × PER Futur',
      appliedFormula: `${baseScenario.futureEPS.toFixed(2)} MAD × ${futurePeRatio.toFixed(1)}x`,
      result: `${baseScenario.futureStockPrice.toFixed(2)} MAD`,
      interpretation: `En appliquant un multiple de PER de sortie de ${futurePeRatio.toFixed(1)}x au bénéfice futur estimé, la valeur de marché projetée s'élèverait à ${baseScenario.futureStockPrice.toFixed(2)} MAD.`,
    },
    {
      stepNumber: 3,
      title: 'Juste valeur actuelle estimée (Fair Value aujourd\'hui)',
      formula: includeDividends
        ? 'Fair Value = (Prix Futur / (1 + Rendement Exigé)^Années) + Dividendes Actualisés'
        : 'Fair Value = Prix Futur / (1 + Rendement Exigé)^Années',
      appliedFormula: includeDividends
        ? `(${baseScenario.futureStockPrice.toFixed(2)} MAD / 1.${requiredReturnRate.toFixed(0)}^${investmentHorizonYears}) + ${(baseScenario.fairValueWithDividendsMAD! - baseScenario.fairValueMAD).toFixed(2)} MAD div.`
        : `${baseScenario.futureStockPrice.toFixed(2)} MAD / 1.${requiredReturnRate.toFixed(0)}^${investmentHorizonYears}`,
      result: `${calculatedFairValueMAD.toFixed(2)} MAD`,
      interpretation: `Pour obtenir un rendement exigé de ${requiredReturnRate.toFixed(1)} % par an, vous devriez payer au maximum ${calculatedFairValueMAD.toFixed(2)} MAD aujourd'hui pour l'action.${
        includeDividends
          ? ` (Dont ${(baseScenario.fairValueWithDividendsMAD! - baseScenario.fairValueMAD).toFixed(2)} MAD issus de l'actualisation prudente des dividendes annuels de ${annualDividend?.toFixed(2)} MAD).`
          : ' (Les dividendes sont exclus du calcul pour une sécurité maximale).'
      }`,
    },
    {
      stepNumber: 4,
      title: 'Prix d\'achat cible avec marge de sécurité',
      formula: 'Prix Cible = Fair Value × (1 - Marge de Sécurité)',
      appliedFormula: `${calculatedFairValueMAD.toFixed(2)} MAD × (1 - ${(desiredMarginOfSafety / 100).toFixed(2)})`,
      result: `${baseScenario.targetBuyPriceMAD.toFixed(2)} MAD`,
      interpretation: `En appliquant votre marge de sécurité prudente de ${desiredMarginOfSafety.toFixed(0)} %, le prix d'achat maximal conseillé pour entrer sur le titre est de ${baseScenario.targetBuyPriceMAD.toFixed(2)} MAD.`,
    },
  ];

  return {
    isCalculable: true,
    missingInputs: [],
    assumptions,
    baseScenario,
    conservativeScenario,
    optimisticScenario,
    externalFairValueComparison: {
      manualFairValueMAD: manualFairValue,
      calculatedFairValueMAD,
      differencePercent,
      divergenceExplanation,
    },
    valuationAttractiveness: {
      status,
      badgeLabel,
      badgeColor,
      summaryMessage,
      actionGuidance,
    },
    explanationSteps,
  };
}
