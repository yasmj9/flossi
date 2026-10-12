import {
  FinancialChecklistData,
} from './types';
import {
  FullFundamentalAnalysis,
  parseFinancialNumber,
} from './financialMath';
import {
  FairValueCalculationResult,
} from './fairValueCalculator';
import {
  ShariahScreeningReport,
} from './shariahScreening';
import {
  getSectorThresholds,
  BUY_MONTH_THRESHOLDS,
} from './scoringThresholds';

// -------------------------------------------------------------
// TYPES & INTERFACES DU MOTEUR DE SCORING
// -------------------------------------------------------------

export type InvestmentDecisionType =
  | 'BUY_CANDIDATE'
  | 'WAIT'
  | 'AVOID'
  | 'INSUFFICIENT_DATA';

export type QualityLevel =
  | 'EXCELLENT'
  | 'GOOD'
  | 'AVERAGE'
  | 'WEAK'
  | 'CRITICAL';

export interface ScoredMetricDetail {
  id: string;
  name: string;
  category: 'growth' | 'profitability' | 'debt' | 'cashFlow' | 'valuation' | 'timing';
  pointsAwarded: number;
  maxPoints: number;
  observedValueDisplay: string;
  observedNumericValue: number | null;
  ruleLabel: string;
  explanation: string;
  warningNote?: string;
  isMissingData?: boolean;
}

export interface CategoryScoreResult {
  category: 'growth' | 'profitability' | 'debt' | 'cashFlow';
  title: string;
  totalPoints: number;
  maxPoints: number;
  percentage: number;
  metrics: ScoredMetricDetail[];
  summaryNote: string;
  riskWarnings: string[];
}

export interface CompanyQualityScoreResult {
  totalScore: number; // 0 to 100
  maxScore: number; // 100
  level: QualityLevel;
  levelLabel: string;
  levelColor: string; // Tailwind styling token
  categories: {
    growth: CategoryScoreResult;
    profitability: CategoryScoreResult;
    debt: CategoryScoreResult;
    cashFlow: CategoryScoreResult;
  };
  sectorName: string;
  isCustomCalibrated: boolean;
  calibrationLabel: string;
  riskWarnings: string[];
  dilutionDetected: boolean;
  dilutionNote?: string;
  isSemiAnnualWarning: boolean;
}

export interface BuyThisMonthScoreResult {
  totalScore: number; // 0 to 100
  maxScore: number; // 100
  unblockedScore: number; // score avant verrouillage éthique
  isBlockedByShariah: boolean;
  isPendingShariah: boolean;
  shariahBlockReason?: string;
  qualityContribution: {
    pointsAwarded: number;
    maxPoints: number;
    explanation: string;
  };
  valuationContribution: {
    pointsAwarded: number;
    maxPoints: number;
    ruleLabel: string;
    explanation: string;
    isValuationMissing: boolean;
  };
  timingReturnContribution: {
    projectedReturnPoints: number;
    maxProjectedReturnPoints: number;
    projectedReturnRule: string;
    projectedReturnExplanation: string;
    price52wPoints: number;
    maxPrice52wPoints: number;
    price52wRule: string;
    price52wExplanation: string;
    totalTimingPoints: number;
    maxTimingPoints: number;
  };
  breakdownMetrics: ScoredMetricDetail[];
}

export interface FullInvestmentConfidenceReport {
  qualityScore: CompanyQualityScoreResult;
  buyMonthScore: BuyThisMonthScoreResult;
  decision: {
    type: InvestmentDecisionType;
    title: string;
    shortLabel: string;
    badgeColor: string; // Tailwind styling
    badgeBorder: string;
    headline: string;
    rationales: string[];
    actionGuidance: string;
    targetEntryCondition: string;
    shariahStatusSummary: string;
  };
  dataQuality: {
    isSufficientForDecision: boolean;
    missingCriticalFields: string[];
    provisionalWarnings: string[];
  };
  disclaimer: string;
}

// -------------------------------------------------------------
// FONCTIONS UTILITAIRES DE NOTATION PAR PALIERS (BAND MATCHERS)
// -------------------------------------------------------------

function matchMinBand(
  value: number | null,
  bands: { min: number; points: number; label: string }[],
  fallbackPoints = 0
): { points: number; label: string } {
  if (value === null || isNaN(value)) {
    return { points: fallbackPoints, label: 'Donnée non renseignée' };
  }
  for (const band of bands) {
    if (value >= band.min) {
      return { points: band.points, label: band.label };
    }
  }
  return { points: fallbackPoints, label: 'Hors barème' };
}

function matchMaxBand(
  value: number | null,
  bands: { max: number; points: number; label: string }[],
  fallbackPoints = 0
): { points: number; label: string } {
  if (value === null || isNaN(value)) {
    return { points: fallbackPoints, label: 'Donnée non renseignée' };
  }
  for (const band of bands) {
    if (value <= band.max) {
      return { points: band.points, label: band.label };
    }
  }
  return { points: fallbackPoints, label: 'Hors barème' };
}

// -------------------------------------------------------------
// 1. CALCUL DU COMPANY QUALITY SCORE (0–100)
// -------------------------------------------------------------

export function computeCompanyQualityScore(
  data: FinancialChecklistData,
  analysis: FullFundamentalAnalysis
): CompanyQualityScoreResult {
  const sector = data.stockInfo.sector || 'Autre';
  const { thresholds, isCustomCalibrated } = getSectorThresholds(sector);
  const isSemiAnnual = data.periodInfo.reportType === 'semiannual';

  const riskWarnings: string[] = [];

  // ==========================================
  // A. CROISSANCE (GROWTH) — 25 POINTS MAX
  // ==========================================
  const growthMetrics: ScoredMetricDetail[] = [];
  const growthWarnings: string[] = [];

  // 1. Chiffre d'affaires YoY (10 pts max)
  const revYoYList = analysis.growth.revenueYoY;
  const latestRevYoY = revYoYList.length > 0 ? revYoYList[revYoYList.length - 1].result : null;
  const revYoYVal = latestRevYoY?.rate ?? null;
  const revYoYBand = matchMinBand(revYoYVal, thresholds.growth.revenueYoyBands, 0);

  if (revYoYVal !== null && revYoYVal < 0) {
    growthWarnings.push(`Repli du chiffre d’affaires sur la dernière période (${revYoYVal.toFixed(1)}%).`);
  }

  growthMetrics.push({
    id: 'rev-yoy',
    name: 'Croissance Chiffre d’Affaires (YoY)',
    category: 'growth',
    pointsAwarded: revYoYBand.points,
    maxPoints: 10,
    observedValueDisplay: revYoYVal !== null ? `${revYoYVal > 0 ? '+' : ''}${revYoYVal.toFixed(1)}%` : 'Non disponible',
    observedNumericValue: revYoYVal,
    ruleLabel: revYoYBand.label,
    explanation:
      revYoYVal !== null
        ? `Le chiffre d'affaires affiche une progression annuelle de ${revYoYVal.toFixed(1)}%.`
        : 'Historique de chiffre d’affaires insuffisant pour calculer la variation annuelle.',
    isMissingData: revYoYVal === null,
  });

  // 2. CAGR 3 ans CA (5 pts max)
  const revCagr = analysis.growth.revenueCAGR;
  const revCagrVal = revCagr.rate;
  const revCagrBand = matchMinBand(revCagrVal, thresholds.growth.cagr3yBands, 0);

  if (isSemiAnnual) {
    growthWarnings.push(
      'Rapport semestriel : Le TCAC 3 ans du chiffre d’affaires ne doit pas être comparé silencieusement sans normalisation annuelle.'
    );
  }

  growthMetrics.push({
    id: 'rev-cagr',
    name: 'TCAC 3 ans Chiffre d’Affaires',
    category: 'growth',
    pointsAwarded: revCagrBand.points,
    maxPoints: 5,
    observedValueDisplay: revCagrVal !== null ? `${revCagrVal > 0 ? '+' : ''}${revCagrVal.toFixed(1)}%` : 'Non disponible',
    observedNumericValue: revCagrVal,
    ruleLabel: revCagrBand.label,
    explanation:
      revCagrVal !== null
        ? `Taux de croissance annuel composé de ${revCagrVal.toFixed(1)}% sur 3 exercices.`
        : revCagr.note || 'Données sur 3 exercices requises pour calculer le TCAC.',
    isMissingData: revCagrVal === null,
  });

  // 3. Croissance Bénéfices / BPA (10 pts max)
  const profitYoYList = analysis.growth.profitYoY;
  const latestProfitYoY = profitYoYList.length > 0 ? profitYoYList[profitYoYList.length - 1].result : null;
  const profitYoYVal = latestProfitYoY?.rate ?? null;
  const earningsGrowthBand = matchMinBand(profitYoYVal, thresholds.growth.earningsGrowthBands, 0);

  // Détection de dilution du capital : Bénéfice net progresse mais BPA stagne/baisse
  let dilutionDetected = false;
  let dilutionNote: string | undefined;

  const sharesCount = parseFinancialNumber(data.stockInfo.sharesOutstanding);
  const years = data.growth.years || [];
  if (years.length >= 2 && profitYoYVal !== null && profitYoYVal > 5) {
    const prevProfit = parseFinancialNumber(years[years.length - 2].netProfit);
    const curProfit = parseFinancialNumber(years[years.length - 1].netProfit);
    if (prevProfit !== null && curProfit !== null && prevProfit > 0 && sharesCount && sharesCount > 0) {
      // Si le nombre d'actions est statique, le BPA progresse au même rythme, mais si l'utilisateur
      // a renseigné un BPA manuel qui progresse beaucoup moins vite :
      const manualEps = parseFinancialNumber(data.stockInfo.eps);
      if (manualEps !== null && analysis.profitability.calculatedEPS.value !== null) {
        const theoreticalEps = curProfit / sharesCount;
        if (manualEps < theoreticalEps * 0.85) {
          dilutionDetected = true;
          dilutionNote =
            "Alerte dilution : Le BPA affiché est sensiblement inférieur au bénéfice par action théorique calculé, suggérant une émission d'actions ou des intérêts minoritaires importants.";
        }
      }
    }
  }

  // Détection de bénéfices volatils (alternance de signes dans les résultats)
  let volatileProfits = false;
  if (profitYoYList.length >= 2) {
    const rate1 = profitYoYList[0].result.rate;
    const rate2 = profitYoYList[1].result.rate;
    if (rate1 !== null && rate2 !== null && ((rate1 > 15 && rate2 < -10) || (rate1 < -10 && rate2 > 15))) {
      volatileProfits = true;
      growthWarnings.push('Bénéfices volatils : Forte irrégularité des résultats nets d’une année sur l’autre.');
    }
  }

  if (profitYoYVal !== null && profitYoYVal < 0) {
    growthWarnings.push(`Bénéfice net en repli (${profitYoYVal.toFixed(1)}%).`);
  }
  if (dilutionDetected && dilutionNote) {
    growthWarnings.push(dilutionNote);
  }

  growthMetrics.push({
    id: 'earnings-growth',
    name: 'Croissance des Profits / BPA',
    category: 'growth',
    pointsAwarded: earningsGrowthBand.points,
    maxPoints: 10,
    observedValueDisplay: profitYoYVal !== null ? `${profitYoYVal > 0 ? '+' : ''}${profitYoYVal.toFixed(1)}%` : 'Non disponible',
    observedNumericValue: profitYoYVal,
    ruleLabel: earningsGrowthBand.label,
    explanation:
      profitYoYVal !== null
        ? `Évolution du bénéfice net de ${profitYoYVal.toFixed(1)}% sur le dernier exercice.`
        : 'Données insuffisantes pour évaluer la trajectoire des bénéfices.',
    warningNote: dilutionNote || (volatileProfits ? 'Attention : Volatilité des bénéfices observée.' : undefined),
    isMissingData: profitYoYVal === null,
  });

  const growthTotalPoints = growthMetrics.reduce((sum, m) => sum + m.pointsAwarded, 0);

  // ==========================================
  // B. RENTABILITÉ (PROFITABILITY) — 25 POINTS MAX
  // ==========================================
  const profMetrics: ScoredMetricDetail[] = [];
  const profWarnings: string[] = [];

  // 1. ROE (10 pts max)
  const roeVal = analysis.profitability.roe.value;
  const roeBand = matchMinBand(roeVal, thresholds.profitability.roeBands, 0);

  if (roeVal !== null && roeVal < 0) {
    profWarnings.push('ROE négatif : L’entreprise détruit la valeur des capitaux propres sur la période.');
  } else if (roeVal !== null && roeVal > 50) {
    profWarnings.push(
      'ROE exceptionnellement élevé (> 50%) : Vérifier si ce résultat provient d’une rentabilité exceptionnelle ou de capitaux propres très faibles (effet de levier).'
    );
  }

  profMetrics.push({
    id: 'roe',
    name: 'Rentabilité des Capitaux Propres (ROE)',
    category: 'profitability',
    pointsAwarded: roeBand.points,
    maxPoints: 10,
    observedValueDisplay: roeVal !== null ? `${roeVal.toFixed(1)}%` : 'Non disponible',
    observedNumericValue: roeVal,
    ruleLabel: roeBand.label,
    explanation:
      roeVal !== null
        ? `Le ROE s'élève à ${roeVal.toFixed(1)}% (Résultat net / Capitaux propres).`
        : analysis.profitability.roe.note || 'Capitaux propres ou résultat net manquant.',
    isMissingData: roeVal === null,
  });

  // 2. Marge nette (10 pts max)
  const netMarginVal = analysis.profitability.netMargin;
  const netMarginBand = matchMinBand(netMarginVal, thresholds.profitability.netMarginBands, 0);

  if (netMarginVal !== null && netMarginVal <= 0) {
    profWarnings.push('Marge nette nulle ou négative (déficit d’exploitation ou charges financières excessives).');
  }

  profMetrics.push({
    id: 'net-margin',
    name: 'Marge Nette',
    category: 'profitability',
    pointsAwarded: netMarginBand.points,
    maxPoints: 10,
    observedValueDisplay: netMarginVal !== null ? `${netMarginVal.toFixed(1)}%` : 'Non disponible',
    observedNumericValue: netMarginVal,
    ruleLabel: netMarginBand.label,
    explanation:
      netMarginVal !== null
        ? `Marge bénéficiaire nette de ${netMarginVal.toFixed(1)}% du chiffre d'affaires.`
        : 'Chiffre d’affaires ou résultat net non renseigné.',
    isMissingData: netMarginVal === null,
  });

  // 3. Marge opérationnelle (5 pts max)
  const opMarginVal = analysis.profitability.operatingMargin;
  const opMarginBand = matchMinBand(opMarginVal, thresholds.profitability.operatingMarginBands, 0);

  if (opMarginVal !== null && opMarginVal <= 0) {
    profWarnings.push('Marge opérationnelle négative : L’activité courante ne génère pas de profit d’exploitation.');
  }

  profMetrics.push({
    id: 'operating-margin',
    name: 'Marge Opérationnelle (EBIT)',
    category: 'profitability',
    pointsAwarded: opMarginBand.points,
    maxPoints: 5,
    observedValueDisplay: opMarginVal !== null ? `${opMarginVal.toFixed(1)}%` : 'Non disponible',
    observedNumericValue: opMarginVal,
    ruleLabel: opMarginBand.label,
    explanation:
      opMarginVal !== null
        ? `Marge d'exploitation de ${opMarginVal.toFixed(1)}% avant charges financières et impôts.`
        : 'Résultat d’exploitation ou chiffre d’affaires non renseigné.',
    isMissingData: opMarginVal === null,
  });

  const profTotalPoints = profMetrics.reduce((sum, m) => sum + m.pointsAwarded, 0);

  // ==========================================
  // C. SANTÉ FINANCIÈRE & DETTE — 25 POINTS MAX
  // ==========================================
  const debtMetrics: ScoredMetricDetail[] = [];
  const debtWarnings: string[] = [];

  // 1. Dette Nette / EBITDA (15 pts max)
  const netDebtEbitdaVal = analysis.debt.netDebtToEbitda.value;
  const ebitdaRawMAD = parseFinancialNumber(data.profitability.ebitda);
  const isEbitdaNegative = ebitdaRawMAD !== null && ebitdaRawMAD <= 0;
  const isCashPositive =
    (netDebtEbitdaVal !== null && netDebtEbitdaVal < 0) ||
    (analysis.debt.netDebt.valueMAD !== null && analysis.debt.netDebt.valueMAD < 0);

  let netDebtEbitdaPoints = 0;
  let netDebtEbitdaLabel = 'Non calculé';

  if (isCashPositive) {
    netDebtEbitdaPoints = 15;
    netDebtEbitdaLabel = 'Trésorerie nette positive (Cash > Dettes financières)';
  } else if (isEbitdaNegative) {
    netDebtEbitdaPoints = 0;
    netDebtEbitdaLabel = 'EBITDA négatif (Incapacité à mesurer la couverture de dette)';
    debtWarnings.push('Alerte solvabilité : EBITDA négatif face à un endettement financier.');
  } else if (netDebtEbitdaVal !== null) {
    const band = matchMaxBand(netDebtEbitdaVal, thresholds.debt.netDebtEbitdaBands, 0);
    netDebtEbitdaPoints = band.points;
    netDebtEbitdaLabel = band.label;

    if (netDebtEbitdaVal > 3.5) {
      debtWarnings.push(
        `Levier financier élevé (${netDebtEbitdaVal.toFixed(2)}x EBITDA) : Risque de vulnérabilité aux hausses de taux ou aux chocs d’activité.`
      );
    }
  }

  debtMetrics.push({
    id: 'net-debt-ebitda',
    name: 'Dette Nette / EBITDA',
    category: 'debt',
    pointsAwarded: netDebtEbitdaPoints,
    maxPoints: 15,
    observedValueDisplay:
      isCashPositive
        ? 'Trésorerie Nette +'
        : netDebtEbitdaVal !== null
        ? `${netDebtEbitdaVal.toFixed(2)}x`
        : 'Non disponible',
    observedNumericValue: netDebtEbitdaVal,
    ruleLabel: netDebtEbitdaLabel,
    explanation:
      isCashPositive
        ? 'L’entreprise dispose de liquidités supérieures à l’ensemble de ses dettes financières.'
        : netDebtEbitdaVal !== null
        ? `Le ratio Dette Nette / EBITDA s'établit à ${netDebtEbitdaVal.toFixed(2)}x.`
        : 'Dette nette ou EBITDA annuel non renseigné.',
    isMissingData: netDebtEbitdaVal === null && !isCashPositive,
  });

  // 2. Dette Financière / Capitaux Propres (Gearing, 10 pts max)
  const debtToEquityVal = analysis.debt.debtToEquity;
  const debtToEquityBand = matchMaxBand(debtToEquityVal, thresholds.debt.debtToEquityBands, 0);

  if (debtToEquityVal !== null && debtToEquityVal > 1.5) {
    debtWarnings.push(`Gearing élevé (${(debtToEquityVal * 100).toFixed(0)}% des fonds propres).`);
  }

  debtMetrics.push({
    id: 'debt-to-equity',
    name: 'Dette Financière / Capitaux Propres (Gearing)',
    category: 'debt',
    pointsAwarded: debtToEquityBand.points,
    maxPoints: 10,
    observedValueDisplay: debtToEquityVal !== null ? `${(debtToEquityVal * 100).toFixed(0)}%` : 'Non disponible',
    observedNumericValue: debtToEquityVal,
    ruleLabel: debtToEquityBand.label,
    explanation:
      debtToEquityVal !== null
        ? `Les dettes financières représentent ${(debtToEquityVal * 100).toFixed(0)}% des capitaux propres.`
        : 'Dette financière ou capitaux propres manquants.',
    isMissingData: debtToEquityVal === null,
  });

  const debtTotalPoints = debtMetrics.reduce((sum, m) => sum + m.pointsAwarded, 0);

  // ==========================================
  // D. FLUX DE TRÉSORERIE (CASH FLOW) — 25 POINTS MAX
  // ==========================================
  const cfMetrics: ScoredMetricDetail[] = [];
  const cfWarnings: string[] = [];

  // 1. OCF / Résultat Net (Conversion de cash, 15 pts max)
  const cashConvVal = analysis.cashFlow.cashConversion.value; // en %
  const cashConvRatio = cashConvVal !== null ? cashConvVal / 100 : null; // ratio décimal
  const cashConvBand = matchMinBand(cashConvRatio, thresholds.cashFlow.ocfToNetIncomeBands, 0);

  if (cashConvRatio !== null && cashConvRatio < 0.5) {
    cfWarnings.push(
      'Faible conversion de cash : Le cash d’exploitation convertit moins de 50% du résultat comptable (risque de gonflement par créances clients ou stocks).'
    );
  }

  cfMetrics.push({
    id: 'cash-conversion',
    name: 'Conversion du Résultat en Cash (OCF / Résultat Net)',
    category: 'cashFlow',
    pointsAwarded: cashConvBand.points,
    maxPoints: 15,
    observedValueDisplay: cashConvVal !== null ? `${cashConvVal.toFixed(0)}%` : 'Non disponible',
    observedNumericValue: cashConvVal,
    ruleLabel: cashConvBand.label,
    explanation:
      cashConvVal !== null
        ? `L'exploitation convertit ${cashConvVal.toFixed(0)}% du bénéfice net en liquidités réelles.`
        : analysis.cashFlow.cashConversion.note || 'Cash-flow d’exploitation ou résultat net non renseigné.',
    isMissingData: cashConvVal === null,
  });

  // 2. Qualité du Free Cash Flow (10 pts max)
  const fcfValMAD = analysis.cashFlow.fcf.valueMAD;
  const ocfValMAD = parseFinancialNumber(data.cashFlow.operatingCashFlow);

  let fcfPoints = 0;
  let fcfRuleLabel = 'Non renseigné';
  let fcfExplanation = '';

  if (fcfValMAD !== null) {
    if (fcfValMAD > 0) {
      fcfPoints = thresholds.cashFlow.fcfQualityBands.positiveFcfPoints;
      fcfRuleLabel = 'Free Cash Flow positif et autofinancé (+10 pts)';
      fcfExplanation =
        'L’entreprise génère un excédent de trésorerie net après financement intégral de ses investissements industriels (CapEx).';
    } else if (fcfValMAD < 0) {
      // Tolérance pour CapEx d'expansion (secteur intensif en capital comme santé/cliniques, infrastructures)
      const isOcfPositive = ocfValMAD !== null && ocfValMAD > 0;
      if (isOcfPositive && (isCustomCalibrated || sector === 'Santé & pharmacie')) {
        fcfPoints = thresholds.cashFlow.fcfQualityBands.capexExceedsOcfPoints;
        fcfRuleLabel = `FCF négatif dû aux investissements d'expansion (+${fcfPoints} pts)`;
        fcfExplanation =
          'Le cash opérationnel est solide mais absorbé par un programme massif d’investissements de croissance (ouverture de nouveaux sites / cliniques). Situation normale en phase d’expansion soutenue.';
        cfWarnings.push(
          'Free Cash Flow négatif temporaire lié aux investissements de développement (programme CapEx supérieur au cash généré).'
        );
      } else {
        fcfPoints = thresholds.cashFlow.fcfQualityBands.negativeOcfPoints;
        fcfRuleLabel = 'FCF négatif (Consommation de trésorerie nette, 0 pt)';
        fcfExplanation =
          'Les sorties de fonds dépassent la capacité d’autofinancement, nécessitant le recours à la dette ou aux augmentations de capital.';
        cfWarnings.push('Free Cash Flow négatif : Consommation nette de liquidités.');
      }
    } else {
      fcfPoints = 5;
      fcfRuleLabel = 'Free Cash Flow à l’équilibre';
      fcfExplanation = 'Le cash opérationnel couvre exactement les dépenses d’investissement.';
    }
  } else {
    fcfRuleLabel = 'Données de flux de trésorerie incomplètes';
    fcfExplanation = 'OCF ou CapEx manquant.';
  }

  cfMetrics.push({
    id: 'fcf-quality',
    name: 'Qualité du Free Cash Flow (FCF)',
    category: 'cashFlow',
    pointsAwarded: fcfPoints,
    maxPoints: 10,
    observedValueDisplay:
      fcfValMAD !== null
        ? `${fcfValMAD > 0 ? '+' : ''}${Math.round(fcfValMAD).toLocaleString('fr-FR')} MAD`
        : 'Non disponible',
    observedNumericValue: fcfValMAD,
    ruleLabel: fcfRuleLabel,
    explanation: fcfExplanation,
    isMissingData: fcfValMAD === null,
  });

  const cfTotalPoints = cfMetrics.reduce((sum, m) => sum + m.pointsAwarded, 0);

  // ==========================================
  // SYNTHÈSE TOTALE DU SCORE DE QUALITÉ (0–100)
  // ==========================================
  const totalScore = Math.min(100, Math.max(0, Math.round(growthTotalPoints + profTotalPoints + debtTotalPoints + cfTotalPoints)));

  let level: QualityLevel = 'AVERAGE';
  let levelLabel = 'Qualité Moyenne';
  let levelColor = 'text-amber-600';

  if (totalScore >= 80) {
    level = 'EXCELLENT';
    levelLabel = 'Excellente Qualité Fondamentale';
    levelColor = 'text-emerald-700';
  } else if (totalScore >= 65) {
    level = 'GOOD';
    levelLabel = 'Bonne Qualité Fondamentale';
    levelColor = 'text-emerald-600';
  } else if (totalScore >= 50) {
    level = 'AVERAGE';
    levelLabel = 'Qualité Satisfaisante';
    levelColor = 'text-amber-600';
  } else if (totalScore >= 35) {
    level = 'WEAK';
    levelLabel = 'Qualité Fondamentale Fragile';
    levelColor = 'text-rose-600';
  } else {
    level = 'CRITICAL';
    levelLabel = 'Risque Fondamental Élevé';
    levelColor = 'text-rose-700';
  }

  // Compiler tous les avertissements
  riskWarnings.push(...growthWarnings, ...profWarnings, ...debtWarnings, ...cfWarnings);

  const calibrationLabel = isCustomCalibrated
    ? `Règles calibrées spécifiquement pour le secteur « ${sector} »`
    : `Score heuristique provisoire (Seuils standards Casablanca Stock Exchange)`;

  return {
    totalScore,
    maxScore: 100,
    level,
    levelLabel,
    levelColor,
    categories: {
      growth: {
        category: 'growth',
        title: 'Croissance',
        totalPoints: growthTotalPoints,
        maxPoints: 25,
        percentage: (growthTotalPoints / 25) * 100,
        metrics: growthMetrics,
        summaryNote: `Chiffre d’affaires et dynamique bénéficiaire (${growthTotalPoints}/25 pts)`,
        riskWarnings: growthWarnings,
      },
      profitability: {
        category: 'profitability',
        title: 'Rentabilité',
        totalPoints: profTotalPoints,
        maxPoints: 25,
        percentage: (profTotalPoints / 25) * 100,
        metrics: profMetrics,
        summaryNote: `Marges d'exploitation, marge nette et ROE (${profTotalPoints}/25 pts)`,
        riskWarnings: profWarnings,
      },
      debt: {
        category: 'debt',
        title: 'Santé Financière & Dette',
        totalPoints: debtTotalPoints,
        maxPoints: 25,
        percentage: (debtTotalPoints / 25) * 100,
        metrics: debtMetrics,
        summaryNote: `Couverture de dette et solidité du bilan (${debtTotalPoints}/25 pts)`,
        riskWarnings: debtWarnings,
      },
      cashFlow: {
        category: 'cashFlow',
        title: 'Flux de Trésorerie',
        totalPoints: cfTotalPoints,
        maxPoints: 25,
        percentage: (cfTotalPoints / 25) * 100,
        metrics: cfMetrics,
        summaryNote: `Conversion en cash réel et flux disponibles (${cfTotalPoints}/25 pts)`,
        riskWarnings: cfWarnings,
      },
    },
    sectorName: sector,
    isCustomCalibrated,
    calibrationLabel,
    riskWarnings,
    dilutionDetected,
    dilutionNote,
    isSemiAnnualWarning: isSemiAnnual,
  };
}

// -------------------------------------------------------------
// 2. CALCUL DU BUY THIS MONTH SCORE (0–100)
// -------------------------------------------------------------

export function computeBuyThisMonthScore(
  data: FinancialChecklistData,
  qualityScore: CompanyQualityScoreResult,
  fairValueResult: FairValueCalculationResult,
  shariahReport: ShariahScreeningReport
): BuyThisMonthScoreResult {
  const breakdownMetrics: ScoredMetricDetail[] = [];

  // 1. Contribution Qualité d'Entreprise (40 points max)
  // Règle : Les 40 points sont proportionnels au Company Quality Score (0–100)
  const qualityFactor = qualityScore.totalScore / 100;
  const qualityPointsAwarded = Math.round(qualityFactor * BUY_MONTH_THRESHOLDS.maxQualityPoints * 10) / 10;

  breakdownMetrics.push({
    id: 'buy-quality-contrib',
    name: 'Pilier 1 : Qualité Fondamentale de l’Entreprise',
    category: 'growth',
    pointsAwarded: qualityPointsAwarded,
    maxPoints: BUY_MONTH_THRESHOLDS.maxQualityPoints,
    observedValueDisplay: `${qualityScore.totalScore}/100`,
    observedNumericValue: qualityScore.totalScore,
    ruleLabel: `Pondération 40% du score de qualité (${qualityScore.totalScore} × 0.4)`,
    explanation:
      'Garantit qu’une action ne reçoit jamais une recommandation d’achat favorable uniquement parce qu’elle est bon marché (protection anti-piège de valeur).',
  });

  // 2. Contribution Valorisation & Marge de Sécurité (40 points max)
  const baseScenario = fairValueResult.baseScenario;
  const currentPriceMAD = parseFinancialNumber(data.stockInfo.currentPrice);
  const isValuationCalculable = fairValueResult.isCalculable && baseScenario !== null && currentPriceMAD !== null;

  let valPoints = 0;
  let valRule = 'Valorisation non calculable';
  let valExplanation = '';

  if (isValuationCalculable && baseScenario) {
    const discount = baseScenario.discountToFairValuePercent ?? 0;
    const targetBuyPrice = baseScenario.targetBuyPriceMAD;

    // Règle déterministe basée sur le prix d'achat cible avec marge de sécurité
    if (currentPriceMAD <= targetBuyPrice) {
      valPoints = BUY_MONTH_THRESHOLDS.valuationBands.fullSafetyMarginPoints; // 40 pts
      valRule = `Plein score : Cours ≤ Prix Cible (${discount.toFixed(1)}% de décote, marge de sécurité atteinte)`;
      valExplanation = `Le cours actuel (${currentPriceMAD} MAD) est inférieur ou égal au prix cible d’achat (${targetBuyPrice.toFixed(2)} MAD). Marge de sécurité de ${fairValueResult.assumptions.desiredMarginOfSafetyPercent}% intégralement respectée.`;
    } else if (discount >= 10) {
      valPoints = BUY_MONTH_THRESHOLDS.valuationBands.moderateDiscountPoints; // 30 pts
      valRule = `Décote positive significative (${discount.toFixed(1)}% sous la juste valeur)`;
      valExplanation = `Le cours actuel offre une décote attractive mais légèrement inférieure à la marge de sécurité souhaitée de ${fairValueResult.assumptions.desiredMarginOfSafetyPercent}%.`;
    } else if (discount >= 0) {
      valPoints = BUY_MONTH_THRESHOLDS.valuationBands.fairValueRangePoints; // 20 pts
      valRule = `Cours proche de la Juste Valeur (${discount.toFixed(1)}% de décote)`;
      valExplanation = `Le titre cote à un niveau proche de son estimation intrinsèque (${baseScenario.fairValueMAD.toFixed(2)} MAD), sans marge de sécurité protectrice.`;
    } else if (discount >= -10) {
      valPoints = BUY_MONTH_THRESHOLDS.valuationBands.slightPremiumPoints; // 10 pts
      valRule = `Légère surcote de valorisation (${Math.abs(discount).toFixed(1)}% au-dessus de la juste valeur)`;
      valExplanation = `Le cours de marché intègre une légère prime par rapport aux bénéfices futurs escomptés.`;
    } else if (discount >= -25) {
      valPoints = BUY_MONTH_THRESHOLDS.valuationBands.moderatePremiumPoints; // 5 pts
      valRule = `Surcote modérée (${Math.abs(discount).toFixed(1)}% au-dessus de la juste valeur)`;
      valExplanation = `Le titre se négocie au-dessus de sa valeur intrinsèque calculée sur 4 ans.`;
    } else {
      valPoints = BUY_MONTH_THRESHOLDS.valuationBands.severeOvervaluationPoints; // 0 pt
      valRule = `Forte surcote (> 25% au-dessus de la juste valeur)`;
      valExplanation = `Le cours est nettement trop élevé par rapport aux perspectives de résultats.`;
    }
  } else {
    valRule = 'Données de valorisation insuffisantes (BPA ou prévisions manquantes)';
    valExplanation =
      'Le calcul de la juste valeur nécessite un BPA annuel et des hypothèses de croissance/PER futurs.';
  }

  breakdownMetrics.push({
    id: 'buy-valuation-contrib',
    name: 'Pilier 2 : Décote de Valorisation & Marge de Sécurité',
    category: 'valuation',
    pointsAwarded: valPoints,
    maxPoints: BUY_MONTH_THRESHOLDS.maxValuationPoints,
    observedValueDisplay:
      baseScenario?.discountToFairValuePercent !== null && baseScenario?.discountToFairValuePercent !== undefined
        ? `${baseScenario.discountToFairValuePercent > 0 ? '+' : ''}${baseScenario.discountToFairValuePercent.toFixed(1)}%`
        : 'Non disponible',
    observedNumericValue: baseScenario?.discountToFairValuePercent ?? null,
    ruleLabel: valRule,
    explanation: valExplanation,
    isMissingData: !isValuationCalculable,
  });

  // 3. Contribution Rendement Annuel Projeté & Timing de Marché (20 points max)
  // 3.1 Rendement annualisé projeté à 4 ans (10 pts max)
  const projReturnVal = baseScenario?.projectedAnnualizedReturnPercent ?? null;
  const returnBand = matchMinBand(projReturnVal, BUY_MONTH_THRESHOLDS.projectedReturnBands, 0);

  breakdownMetrics.push({
    id: 'buy-projected-return',
    name: 'Pilier 3a : Rendement Annualisé Projeté (4 ans)',
    category: 'timing',
    pointsAwarded: returnBand.points,
    maxPoints: 10,
    observedValueDisplay: projReturnVal !== null ? `${projReturnVal.toFixed(1)}%/an` : 'Non disponible',
    observedNumericValue: projReturnVal,
    ruleLabel: returnBand.label,
    explanation:
      projReturnVal !== null
        ? `Taux de rendement actuariel attendu de ${projReturnVal.toFixed(1)}% par an jusqu’à l'horizon 4 ans.`
        : 'Hypothèses de valorisation incomplètes pour calculer le rendement prévisionnel.',
    isMissingData: projReturnVal === null,
  });

  // 3.2 Position dans la fourchette 52 semaines (10 pts max)
  const low52w = parseFinancialNumber(data.stockInfo.price52wLow);
  const high52w = parseFinancialNumber(data.stockInfo.price52wHigh);

  let price52wPoints = 5; // Neutre si bornes non renseignées
  let price52wRule = 'Données 52 semaines non renseignées (Score neutre 5 pts)';
  let price52wExplanation =
    'Les cours 52 semaines constituent un repère cyclique historique et non une valeur intrinsèque.';
  let price52wPositionPercent: number | null = null;

  if (currentPriceMAD !== null && low52w !== null && high52w !== null && high52w > low52w) {
    price52wPositionPercent = ((currentPriceMAD - low52w) / (high52w - low52w)) * 100;
    const band = matchMaxBand(price52wPositionPercent, BUY_MONTH_THRESHOLDS.price52wPositionBands, 1);
    price52wPoints = band.points;
    price52wRule = band.label;
    price52wExplanation = `Le cours actuel se situe à ${price52wPositionPercent.toFixed(0)}% de l’intervalle annuel [${low52w} – ${high52w} MAD].`;
  }

  breakdownMetrics.push({
    id: 'buy-timing-52w',
    name: 'Pilier 3b : Point d’Entrée Cyclique (Fourchette 52 semaines)',
    category: 'timing',
    pointsAwarded: price52wPoints,
    maxPoints: 10,
    observedValueDisplay:
      price52wPositionPercent !== null
        ? `${price52wPositionPercent.toFixed(0)}% du range`
        : 'Non renseigné',
    observedNumericValue: price52wPositionPercent,
    ruleLabel: price52wRule,
    explanation: price52wExplanation,
  });

  const totalTimingPoints = returnBand.points + price52wPoints;
  const unblockedScore = Math.min(100, Math.max(0, Math.round(qualityPointsAwarded + valPoints + totalTimingPoints)));

  // Gating Shariah strict
  const isBlockedByShariah = shariahReport.verdict === 'FAILED';
  const isPendingShariah = shariahReport.verdict === 'REVIEW_REQUIRED';

  let shariahBlockReason: string | undefined;
  let finalScore = unblockedScore;

  if (isBlockedByShariah) {
    finalScore = 0;
    shariahBlockReason =
      'Achat formellement interdit : L’entreprise a échoué au filtrage Shariah (activité non licite ou ratios financiers non conformes aux normes islamiques).';
  }

  return {
    totalScore: finalScore,
    maxScore: 100,
    unblockedScore,
    isBlockedByShariah,
    isPendingShariah,
    shariahBlockReason,
    qualityContribution: {
      pointsAwarded: qualityPointsAwarded,
      maxPoints: BUY_MONTH_THRESHOLDS.maxQualityPoints,
      explanation: `Apport de ${qualityPointsAwarded} pts basé sur un score de qualité fondamental de ${qualityScore.totalScore}/100.`,
    },
    valuationContribution: {
      pointsAwarded: valPoints,
      maxPoints: BUY_MONTH_THRESHOLDS.maxValuationPoints,
      ruleLabel: valRule,
      explanation: valExplanation,
      isValuationMissing: !isValuationCalculable,
    },
    timingReturnContribution: {
      projectedReturnPoints: returnBand.points,
      maxProjectedReturnPoints: 10,
      projectedReturnRule: returnBand.label,
      projectedReturnExplanation:
        projReturnVal !== null ? `Rendement projeté de ${projReturnVal.toFixed(1)}%/an` : 'Non calculé',
      price52wPoints,
      maxPrice52wPoints: 10,
      price52wRule,
      price52wExplanation,
      totalTimingPoints,
      maxTimingPoints: 20,
    },
    breakdownMetrics,
  };
}

// -------------------------------------------------------------
// 3. MATRICE DE DÉCISION D'INVESTISSEMENT (BUY / WAIT / AVOID / DATA)
// -------------------------------------------------------------

export function computeInvestmentDecision(
  qualityScore: CompanyQualityScoreResult,
  buyMonthScore: BuyThisMonthScoreResult,
  fairValueResult: FairValueCalculationResult,
  shariahReport: ShariahScreeningReport,
  data: FinancialChecklistData
): FullInvestmentConfidenceReport {
  const currentPriceMAD = parseFinancialNumber(data.stockInfo.currentPrice);
  const baseScenario = fairValueResult.baseScenario;

  const rationales: string[] = [];
  const missingCriticalFields: string[] = [];
  const provisionalWarnings: string[] = [];

  // Vérification de la complétude critique
  if (!data.stockInfo.companyName) missingCriticalFields.push('Nom de l’entreprise');
  if (currentPriceMAD === null) missingCriticalFields.push('Cours boursier actuel');
  if (data.growth.years.length < 2) missingCriticalFields.push('Historique financier (minimum 2 exercices)');
  if (!fairValueResult.isCalculable) missingCriticalFields.push('BPA de base ou hypothèses de valorisation');

  const isSufficientData = missingCriticalFields.length === 0;

  let decisionType: InvestmentDecisionType = 'INSUFFICIENT_DATA';
  let title = 'DONNÉES INSUFFISANTES';
  let shortLabel = 'Données insuffisantes';
  let badgeColor = 'bg-slate-100 text-slate-800';
  let badgeBorder = 'border-slate-300';
  let headline = 'Complétez les informations financières indispensables pour établir une décision.';
  let actionGuidance = 'Renseignez le cours actuel, le BPA et les prévisions de valorisation dans le formulaire.';
  let targetEntryCondition = 'Calcul suspendu dans l’attente de données exhaustives.';

  // 1. RÈGLE ABSOLUE 1 : SHARIAH FAILED -> AVOID
  if (shariahReport.verdict === 'FAILED') {
    decisionType = 'AVOID';
    title = 'À ÉVITER (NON CONFORME SHARIAH)';
    shortLabel = 'Non conforme Shariah';
    badgeColor = 'bg-rose-100 text-rose-800';
    badgeBorder = 'border-rose-300';
    headline = 'Le titre est exclu de l’univers d’investissement éthique et islamique.';
    rationales.push(
      'Échec du filtrage Shariah : L’entreprise opère dans une activité prohibée ou franchit les seuils de tolérance financière (intérêts/dette).'
    );
    rationales.push('Règle de filtrage : Tout échec Shariah bloque irrévocablement une décision d’achat positive.');
    actionGuidance = 'Ne pas investir. Chercher des alternatives conformes cotées à la Bourse de Casablanca.';
    targetEntryCondition = 'Investissement prohibé sous la méthodologie Shariah sélectionnée.';
  }
  // 2. RÈGLE 2 : DONNÉES INSUFFISANTES
  else if (!isSufficientData) {
    decisionType = 'INSUFFICIENT_DATA';
    title = 'DONNÉES INSUFFISANTES';
    shortLabel = 'Données insuffisantes';
    badgeColor = 'bg-slate-100 text-slate-800';
    badgeBorder = 'border-slate-300';
    headline = 'Certaines données clés sont manquantes pour valider un score d’achat fiable.';
    rationales.push(`Champs manquants identifiés : ${missingCriticalFields.join(', ')}.`);
    actionGuidance = 'Complétez les champs signalés pour générer la valorisation et les scores.';
  }
  // 3. RÈGLE 3 : QUALITÉ FONDAMENTALE DÉGRADÉE (< 45/100) -> AVOID
  else if (qualityScore.totalScore < 45) {
    decisionType = 'AVOID';
    title = 'À ÉVITER (FONDAMENTAUX FRAGILES)';
    shortLabel = 'Fondamentaux fragiles';
    badgeColor = 'bg-rose-100 text-rose-800';
    badgeBorder = 'border-rose-300';
    headline = 'La société présente une santé financière ou une rentabilité insuffisante pour un investissement long terme.';
    rationales.push(`Score de qualité de l’entreprise faible : ${qualityScore.totalScore}/100.`);
    if (qualityScore.riskWarnings.length > 0) {
      rationales.push(`Facteurs de risque majeurs : ${qualityScore.riskWarnings.slice(0, 2).join(' ; ')}.`);
    }
    actionGuidance = 'Éviter l’achat. Privilégier des entreprises à la rentabilité éprouvée et à la dette maîtrisée.';
    targetEntryCondition = 'Amélioration préalable exigée des comptes d’exploitation et de la structure de bilan.';
  }
  // 4. RÈGLE 4 : VÉRIFICATION SHARIAH REQUISE -> WAIT
  else if (shariahReport.verdict === 'REVIEW_REQUIRED') {
    decisionType = 'WAIT';
    title = 'EN ATTENTE (REVUE SHARIAH REQUISE)';
    shortLabel = 'Revue Shariah requise';
    badgeColor = 'bg-amber-100 text-amber-800';
    badgeBorder = 'border-amber-300';
    headline = 'La décision d’achat est suspendue dans l’attente de vérifications de conformité éthique.';
    rationales.push(
      'La méthodologie Shariah nécessite la confirmation de certaines rubriques (activités mixtes, placement de trésorerie ou créances).'
    );
    rationales.push('Politique de précaution : Un achat ne peut être validé sans conformité confirmée.');
    actionGuidance = 'Complétez la checklist Shariah dans la Section 7 pour débloquer la recommandation finale.';
    targetEntryCondition = 'Validation formelle des critères de conformité islamique.';
  }
  // 5. RÈGLE 5 : CANDIDAT À L'ACHAT (BUY CANDIDATE)
  else if (
    qualityScore.totalScore >= 60 &&
    buyMonthScore.totalScore >= 65 &&
    baseScenario !== null &&
    (baseScenario.discountToFairValuePercent ?? 0) >= 5
  ) {
    decisionType = 'BUY_CANDIDATE';
    title = 'CANDIDAT À L’ACHAT CE MOIS-CI';
    shortLabel = 'Candidat à l’achat';
    badgeColor = 'bg-emerald-100 text-emerald-800';
    badgeBorder = 'border-emerald-300';
    headline = 'Entreprise financièrement solide et valorisation attractive offrant une marge de sécurité.';
    rationales.push(`Excellente solidité financière : Score de qualité de ${qualityScore.totalScore}/100.`);
    rationales.push(`Score d’achat du mois élevé : ${buyMonthScore.totalScore}/100.`);
    rationales.push(
      `Décote de ${(baseScenario.discountToFairValuePercent ?? 0).toFixed(1)}% par rapport à la juste valeur estimée (${baseScenario.fairValueMAD.toFixed(2)} MAD).`
    );
    rationales.push('Conformité Shariah validée sous la méthodologie sélectionnée.');
    actionGuidance =
      'Allocation recommandée dans le cadre de votre plan d’investissement mensuel de 4 000 MAD à la Bourse de Casablanca.';
    targetEntryCondition = `Cours actuel (${currentPriceMAD} MAD) attractif par rapport au prix cible d’achat (${baseScenario.targetBuyPriceMAD.toFixed(2)} MAD).`;
  }
  // 6. RÈGLE 6 : EN ATTENTE DE REPLI (WAIT)
  else {
    decisionType = 'WAIT';
    title = 'EN ATTENTE (WAIT — COURS TROP ÉLEVÉ OU MARGE INSUFFISANTE)';
    shortLabel = 'En attente de repli';
    badgeColor = 'bg-amber-100 text-amber-800';
    badgeBorder = 'border-amber-300';
    headline = 'Entreprise de qualité satisfaisante, mais le cours de bourse actuel n’offre pas de marge de sécurité protectrice.';
    rationales.push(`Qualité d’entreprise convenable : Score de ${qualityScore.totalScore}/100.`);
    if (baseScenario) {
      const discount = baseScenario.discountToFairValuePercent ?? 0;
      if (discount < 0) {
        rationales.push(
          `Le cours actuel (${currentPriceMAD} MAD) est supérieur de ${Math.abs(discount).toFixed(1)}% à la juste valeur calculée (${baseScenario.fairValueMAD.toFixed(2)} MAD).`
        );
      } else {
        rationales.push(
          `La décote actuelle (${discount.toFixed(1)}%) demeure inférieure à la marge de sécurité souhaitée (${fairValueResult.assumptions.desiredMarginOfSafetyPercent}%).`
        );
      }
      targetEntryCondition = `Patienter pour un repli de cours vers ou sous ${baseScenario.targetBuyPriceMAD.toFixed(2)} MAD pour atteindre votre marge de sécurité.`;
    } else {
      targetEntryCondition = 'Attendre une consolidation de cours.';
    }
    actionGuidance = 'Garder le titre en liste de surveillance (Watchlist) et différer l’achat ce mois-ci.';
  }

  // Compiler les avertissements provisoires
  if (!qualityScore.isCustomCalibrated) {
    provisionalWarnings.push(
      'Score basé sur des seuils sectoriels standards (non spécifiquement calibrés pour ce secteur).'
    );
  }
  if (data.periodInfo.reportType === 'semiannual') {
    provisionalWarnings.push('Comptes semestriels : Évaluation préliminaire.');
  }

  const shariahStatusSummary =
    shariahReport.verdict === 'PASSED'
      ? `Conforme Shariah (${shariahReport.methodology.shortName})`
      : shariahReport.verdict === 'FAILED'
      ? `NON CONFORME (${shariahReport.methodology.shortName})`
      : `Vérification Shariah requise (${shariahReport.methodology.shortName})`;

  return {
    qualityScore,
    buyMonthScore,
    decision: {
      type: decisionType,
      title,
      shortLabel,
      badgeColor,
      badgeBorder,
      headline,
      rationales,
      actionGuidance,
      targetEntryCondition,
      shariahStatusSummary,
    },
    dataQuality: {
      isSufficientForDecision: isSufficientData,
      missingCriticalFields,
      provisionalWarnings,
    },
    disclaimer:
      'Avertissement : Les scores sont générés par des règles mathématiques et financières déterministes. Un score élevé (ex: 85/100) mesure la solidité fondamentale et l’attractivité du prix selon vos hypothèses, et ne représente EN AUCUN CAS une probabilité statistique de gain ou une certitude de profit.',
  };
}
