import { FinancialChecklistData, CurrencyUnit, ReportType } from './types';

export function getUnitMultiplier(unit: CurrencyUnit): number {
  switch (unit) {
    case 'billions':
      return 1_000_000_000;
    case 'millions':
      return 1_000_000;
    case 'thousands':
      return 1_000;
    case 'MAD':
    default:
      return 1;
  }
}

export function parseFinancialNumber(val: string | number | undefined | null): number | null {
  if (val === undefined || val === null) return null;
  if (typeof val === 'number') return isNaN(val) ? null : val;
  const cleaned = val.toString().trim().replace(/\s/g, '').replace(',', '.');
  if (cleaned === '') return null;
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

export function normalizeAmount(
  val: string | number | undefined | null,
  unit: CurrencyUnit
): number | null {
  const num = parseFinancialNumber(val);
  if (num === null) return null;
  return num * getUnitMultiplier(unit);
}

// -------------------------------------------------------------
// 1. CROISSANCE (GROWTH)
// -------------------------------------------------------------

export interface YoYGrowthResult {
  rate: number | null; // en %
  absoluteDiff: number | null;
  isSignificant: boolean;
  note?: string;
}

export function calculateYoYGrowth(
  current: number | null,
  previous: number | null
): YoYGrowthResult {
  if (current === null || previous === null) {
    return {
      rate: null,
      absoluteDiff: null,
      isSignificant: false,
      note: 'Données insuffisantes pour calculer la variation.',
    };
  }

  const absoluteDiff = current - previous;

  if (previous === 0) {
    return {
      rate: null,
      absoluteDiff,
      isSignificant: false,
      note: 'Non significatif (base N-1 nulle : division par zéro impossible).',
    };
  }

  if (previous < 0) {
    return {
      rate: null,
      absoluteDiff,
      isSignificant: false,
      note: 'Non significatif (base N-1 négative : le pourcentage de variation serait trompeur).',
    };
  }

  const rate = Math.round((((current / previous) - 1) * 100) * 10000) / 10000;
  return {
    rate,
    absoluteDiff,
    isSignificant: true,
  };
}

export interface CAGRResult {
  rate: number | null; // en %
  absoluteDiff: number | null;
  isSignificant: boolean;
  intervals: number;
  note?: string;
}

export function calculateCAGR(
  startValue: number | null,
  endValue: number | null,
  intervals: number
): CAGRResult {
  if (intervals <= 0 || startValue === null || endValue === null) {
    return {
      rate: null,
      absoluteDiff: null,
      isSignificant: false,
      intervals,
      note: 'Données insuffisantes pour calculer le CAGR.',
    };
  }

  const absoluteDiff = endValue - startValue;

  if (startValue <= 0 || endValue <= 0) {
    return {
      rate: null,
      absoluteDiff,
      isSignificant: false,
      intervals,
      note: 'Non significatif (valeur initiale ou finale négative ou nulle : formule géométrique inapplicable).',
    };
  }

  const rate = (Math.pow(endValue / startValue, 1 / intervals) - 1) * 100;
  return {
    rate,
    absoluteDiff,
    isSignificant: true,
    intervals,
  };
}

// -------------------------------------------------------------
// 2. RENTABILITÉ (PROFITABILITY)
// -------------------------------------------------------------

export interface EPSResult {
  value: number | null; // en MAD
  isApproximation: boolean;
  formulaNote: string;
}

export function calculateEPS(
  netIncomeMAD: number | null,
  sharesCount: number | null
): EPSResult {
  if (netIncomeMAD === null || sharesCount === null || sharesCount <= 0) {
    return {
      value: null,
      isApproximation: true,
      formulaNote: "Données insuffisantes (résultat net ou nombre d'actions non renseigné).",
    };
  }

  const value = netIncomeMAD / sharesCount;
  return {
    value,
    isApproximation: true,
    formulaNote: "Calculé à partir du nombre d'actions en circulation (approximation du nombre moyen pondéré).",
  };
}

export interface DiscrepancyComparison {
  hasDiscrepancy: boolean;
  diffPercent: number | null;
  message?: string;
}

export function compareDiscrepancy(
  manualValue: number | null,
  calculatedValue: number | null,
  label: string,
  thresholdPercent = 5
): DiscrepancyComparison {
  if (manualValue === null || calculatedValue === null) {
    return { hasDiscrepancy: false, diffPercent: null };
  }

  if (manualValue === 0) {
    const hasDiff = calculatedValue !== 0;
    return {
      hasDiscrepancy: hasDiff,
      diffPercent: hasDiff ? 100 : 0,
      message: hasDiff
        ? `Écart constaté : ${label} saisi (0) vs calculé (${calculatedValue.toFixed(2)}).`
        : undefined,
    };
  }

  const diffPercent = Math.abs((manualValue - calculatedValue) / manualValue) * 100;
  if (diffPercent > thresholdPercent) {
    return {
      hasDiscrepancy: true,
      diffPercent,
      message: `Écart notable (${diffPercent.toFixed(1)} %) entre la valeur saisie (${manualValue.toFixed(2)}) et la valeur calculée (${calculatedValue.toFixed(2)}). Vérifiez le nombre d'actions ou l'unité des comptes.`,
    };
  }

  return { hasDiscrepancy: false, diffPercent };
}

export function calculateMargin(
  numerator: number | null,
  revenue: number | null
): number | null {
  if (numerator === null || revenue === null || revenue === 0) return null;
  return (numerator / revenue) * 100;
}

export function calculateOperatingMargin(
  operatingProfit: number | null,
  revenue: number | null
): number | null {
  return calculateMargin(operatingProfit, revenue);
}

export function calculateNetMargin(
  netProfit: number | null,
  revenue: number | null
): number | null {
  return calculateMargin(netProfit, revenue);
}

export interface ROEResult {
  value: number | null; // en %
  isApproximation: boolean;
  note?: string;
}

export function calculateROE(
  netIncomeMAD: number | null,
  equityMAD: number | null
): ROEResult {
  if (netIncomeMAD === null || equityMAD === null) {
    return {
      value: null,
      isApproximation: true,
      note: 'Données insuffisantes pour calculer le ROE.',
    };
  }

  if (equityMAD <= 0) {
    return {
      value: null,
      isApproximation: true,
      note: 'Non significatif (capitaux propres négatifs ou nuls).',
    };
  }

  const value = (netIncomeMAD / equityMAD) * 100;
  return {
    value,
    isApproximation: true,
    note: 'Approximation calculée sur capitaux propres de clôture (capitaux moyens non disponibles).',
  };
}

// -------------------------------------------------------------
// 3. VALORISATION BOURSIÈRE (VALUATION)
// -------------------------------------------------------------

export interface PERResult {
  value: number | null;
  isSignificant: boolean;
  note?: string;
}

export function calculatePER(
  stockPriceMAD: number | null,
  epsMAD: number | null,
  reportType: ReportType
): PERResult {
  if (reportType === 'semiannual') {
    return {
      value: null,
      isSignificant: false,
      note: 'Données annuelles insuffisantes (le rapport semestriel ne doit pas être comparé directement sans annualisation vérifiée).',
    };
  }

  if (stockPriceMAD === null || epsMAD === null) {
    return {
      value: null,
      isSignificant: false,
      note: 'Données insuffisantes pour calculer le PER.',
    };
  }

  if (epsMAD <= 0) {
    return {
      value: null,
      isSignificant: false,
      note: 'Non significatif (BPA annuel nul ou négatif : le PER perd son sens économique).',
    };
  }

  const value = stockPriceMAD / epsMAD;
  return {
    value,
    isSignificant: true,
  };
}

export interface PBRResult {
  value: number | null;
  bookValuePerShare: number | null;
  isSignificant: boolean;
  note?: string;
}

export function calculatePBR(
  stockPriceMAD: number | null,
  equityMAD: number | null,
  sharesCount: number | null
): PBRResult {
  if (stockPriceMAD === null || equityMAD === null || sharesCount === null || sharesCount <= 0) {
    return {
      value: null,
      bookValuePerShare: null,
      isSignificant: false,
      note: 'Données insuffisantes pour calculer le PBR.',
    };
  }

  const bookValuePerShare = equityMAD / sharesCount;

  if (bookValuePerShare <= 0) {
    return {
      value: null,
      bookValuePerShare,
      isSignificant: false,
      note: 'Non significatif (capitaux propres comptables négatifs ou nuls).',
    };
  }

  const value = stockPriceMAD / bookValuePerShare;
  return {
    value,
    bookValuePerShare,
    isSignificant: true,
  };
}

export function calculateDividendYield(
  dpsMAD: number | null,
  stockPriceMAD: number | null
): number | null {
  if (dpsMAD === null || stockPriceMAD === null || stockPriceMAD <= 0) return null;
  return (dpsMAD / stockPriceMAD) * 100;
}

export interface PayoutRatioResult {
  value: number | null; // en %
  isApplicable: boolean;
  note?: string;
}

export function calculatePayoutRatio(
  dpsMAD: number | null,
  epsMAD: number | null
): PayoutRatioResult {
  if (dpsMAD === null || epsMAD === null) {
    return {
      value: null,
      isApplicable: false,
      note: 'Données insuffisantes (dividende ou BPA manquant).',
    };
  }

  if (epsMAD <= 0) {
    return {
      value: null,
      isApplicable: false,
      note: 'Non applicable (BPA négatif ou nul : distribution prélevée sur réserves ou déficitaire).',
    };
  }

  const value = (dpsMAD / epsMAD) * 100;
  return {
    value,
    isApplicable: true,
  };
}

export interface PricePositionResult {
  value: number | null; // en %
  note: string;
}

export function calculate52WeekPosition(
  currentPrice: number | null,
  low52w: number | null,
  high52w: number | null
): PricePositionResult {
  const disclaimer =
    'Mesure uniquement la situation du cours dans son couloir historique des 52 dernières semaines. Un titre proche de son plus bas n&apos;est pas automatiquement sous-évalué.';

  if (
    currentPrice === null ||
    low52w === null ||
    high52w === null ||
    high52w <= low52w
  ) {
    return {
      value: null,
      note: disclaimer,
    };
  }

  const value = ((currentPrice - low52w) / (high52w - low52w)) * 100;
  return {
    value,
    note: disclaimer,
  };
}

// -------------------------------------------------------------
// 4. ENDETTEMENT & STABILITÉ (DEBT & STABILITY)
// -------------------------------------------------------------

export interface NetDebtResult {
  valueMAD: number | null;
  usedInterestBearing: boolean;
  formulaDescription: string;
}

export function calculateNetDebt(
  interestBearingDebtMAD: number | null,
  totalFinancialDebtMAD: number | null,
  cashMAD: number | null
): NetDebtResult {
  if (cashMAD === null) {
    return {
      valueMAD: null,
      usedInterestBearing: false,
      formulaDescription: 'Données insuffisantes (trésorerie disponible manquante).',
    };
  }

  if (interestBearingDebtMAD !== null) {
    const valueMAD = interestBearingDebtMAD - cashMAD;
    return {
      valueMAD,
      usedInterestBearing: true,
      formulaDescription: 'Dettes portant intérêt − Trésorerie disponible',
    };
  }

  if (totalFinancialDebtMAD !== null) {
    const valueMAD = totalFinancialDebtMAD - cashMAD;
    return {
      valueMAD,
      usedInterestBearing: false,
      formulaDescription: 'Dettes financières totales − Trésorerie disponible (par défaut)',
    };
  }

  return {
    valueMAD: null,
    usedInterestBearing: false,
    formulaDescription: 'Données insuffisantes (aucune dette financière renseignée).',
  };
}

export interface NetDebtEbitdaResult {
  value: number | null;
  isApplicable: boolean;
  note?: string;
}

export function calculateNetDebtToEbitda(
  netDebtMAD: number | null,
  ebitdaMAD: number | null,
  reportType: ReportType
): NetDebtEbitdaResult {
  if (reportType === 'semiannual') {
    return {
      value: null,
      isApplicable: false,
      note: 'Inapplicable : L&apos;EBITDA semestriel ne peut être comparé à la dette nette annuelle sans annualisation fiable.',
    };
  }

  if (netDebtMAD === null || ebitdaMAD === null) {
    return {
      value: null,
      isApplicable: false,
      note: 'Données insuffisantes pour calculer Dette nette / EBITDA.',
    };
  }

  if (ebitdaMAD <= 0) {
    return {
      value: null,
      isApplicable: false,
      note: 'Non significatif (EBITDA nul ou négatif : perte de capacité opérationnelle de remboursement).',
    };
  }

  const value = netDebtMAD / ebitdaMAD;
  return {
    value,
    isApplicable: true,
    note:
      netDebtMAD < 0
        ? 'Trésorerie nette positive : l&apos;entreprise a plus de cash disponible que de dettes financières.'
        : undefined,
  };
}

export function calculateDebtToEquity(
  totalFinancialDebtMAD: number | null,
  equityMAD: number | null
): number | null {
  if (totalFinancialDebtMAD === null || equityMAD === null || equityMAD <= 0) return null;
  return totalFinancialDebtMAD / equityMAD;
}

export interface InterestCoverageResult {
  value: number | null;
  isApplicable: boolean;
  note?: string;
}

export function calculateInterestCoverage(
  operatingProfitMAD: number | null,
  interestExpenseMAD: number | null
): InterestCoverageResult {
  if (operatingProfitMAD === null || interestExpenseMAD === null) {
    return {
      value: null,
      isApplicable: false,
      note: 'Données insuffisantes (résultat d&apos;exploitation ou charges d&apos;intérêts manquants).',
    };
  }

  if (interestExpenseMAD <= 0) {
    return {
      value: null,
      isApplicable: false,
      note: 'Charges d&apos;intérêts nulles ou non renseignées.',
    };
  }

  const value = operatingProfitMAD / interestExpenseMAD;
  return {
    value,
    isApplicable: true,
  };
}

// -------------------------------------------------------------
// 5. FLUX DE TRÉSORERIE (CASH FLOW)
// -------------------------------------------------------------

export interface FCFResult {
  valueMAD: number | null;
  normalizedCapexMAD: number | null;
  note: string;
}

export function calculateFreeCashFlow(
  operatingCashFlowMAD: number | null,
  capexInputMAD: number | null
): FCFResult {
  if (operatingCashFlowMAD === null || capexInputMAD === null) {
    return {
      valueMAD: null,
      normalizedCapexMAD: null,
      note: 'Données insuffisantes (cash-flow opérationnel ou CapEx manquant).',
    };
  }

  // Normaliser le CapEx en montant positif de dépense d'investissement
  const normalizedCapexMAD = Math.abs(capexInputMAD);
  const valueMAD = operatingCashFlowMAD - normalizedCapexMAD;

  let note = '';
  if (valueMAD > 0) {
    note =
      'FCF positif : L&apos;exploitation génère suffisamment de liquidités pour autofinancer l&apos;ensemble de ses investissements industriels.';
  } else if (valueMAD < 0) {
    note =
      'FCF négatif : Les investissements (CapEx) dépassent le cash opérationnel généré. Peut traduire une forte phase d&apos;expansion industrielle créant des besoins de financement externe.';
  } else {
    note = 'FCF équilibré : Le cash opérationnel couvre exactement les dépenses d&apos;investissement.';
  }

  return {
    valueMAD,
    normalizedCapexMAD,
    note,
  };
}

export interface CashConversionResult {
  value: number | null; // en %
  isApplicable: boolean;
  note?: string;
}

export function calculateCashConversion(
  operatingCashFlowMAD: number | null,
  netIncomeMAD: number | null
): CashConversionResult {
  if (operatingCashFlowMAD === null || netIncomeMAD === null) {
    return {
      value: null,
      isApplicable: false,
      note: 'Données insuffisantes pour calculer le taux de conversion en cash.',
    };
  }

  if (netIncomeMAD <= 0) {
    return {
      value: null,
      isApplicable: false,
      note: 'Non significatif (résultat net comptable nul ou déficitaire).',
    };
  }

  const value = (operatingCashFlowMAD / netIncomeMAD) * 100;
  return {
    value,
    isApplicable: true,
  };
}

// -------------------------------------------------------------
// 6. MODÈLE GLOBAL ET ANALYSE DE COMPLÉTUDE
// -------------------------------------------------------------

export interface CompletenessItem {
  id: string;
  name: string;
  isCalculable: boolean;
  missingInputs: string[];
}

export interface CompletenessReport {
  calculableCount: number;
  totalCount: number;
  items: CompletenessItem[];
  missingFieldNames: string[];
}

export interface FullFundamentalAnalysis {
  // Données de base normalisées
  unitMultiplier: number;

  // Croissance
  growth: {
    revenueYoY: { year: string; result: YoYGrowthResult }[];
    profitYoY: { year: string; result: YoYGrowthResult }[];
    revenueCAGR: CAGRResult;
    profitCAGR: CAGRResult;
    chartData: { year: string; revenue: number | null; netProfit: number | null }[];
  };

  // Rentabilité
  profitability: {
    calculatedEPS: EPSResult;
    manualEPS: number | null;
    epsComparison: DiscrepancyComparison;
    effectiveEPS: number | null;
    operatingMargin: number | null;
    netMargin: number | null;
    marginScopeNote: string;
    roe: ROEResult;
  };

  // Valorisation
  valuation: {
    per: PERResult;
    manualPER: number | null;
    perComparison: DiscrepancyComparison;
    pbr: PBRResult;
    manualPBR: number | null;
    pbrComparison: DiscrepancyComparison;
    dividendYield: number | null;
    payoutRatio: PayoutRatioResult;
    pricePosition52w: PricePositionResult;
  };

  // Endettement
  debt: {
    netDebt: NetDebtResult;
    manualNetDebtMAD: number | null;
    netDebtComparison: DiscrepancyComparison;
    effectiveNetDebtMAD: number | null;
    netDebtToEbitda: NetDebtEbitdaResult;
    debtToEquity: number | null;
    interestCoverage: InterestCoverageResult;
  };

  // Flux de trésorerie
  cashFlow: {
    fcf: FCFResult;
    manualFcfMAD: number | null;
    fcfComparison: DiscrepancyComparison;
    cashConversion: CashConversionResult;
  };

  // Complétude
  completeness: CompletenessReport;
}

export function computeFundamentalAnalysis(data: FinancialChecklistData): FullFundamentalAnalysis {
  const { periodInfo, stockInfo, growth, profitability, debtStability, cashFlow } = data;
  const unit = periodInfo.unit;
  const multiplier = getUnitMultiplier(unit);

  // Prix et actions (en unités simples)
  const currentPrice = parseFinancialNumber(stockInfo.currentPrice);
  const low52w = parseFinancialNumber(stockInfo.price52wLow);
  const high52w = parseFinancialNumber(stockInfo.price52wHigh);
  const sharesCount = parseFinancialNumber(stockInfo.sharesOutstanding);
  const dividendPerShare = parseFinancialNumber(stockInfo.dividendPerShare);
  const manualEPS = parseFinancialNumber(stockInfo.eps);
  const manualPER = parseFinancialNumber(stockInfo.peRatio);
  const manualPBR = parseFinancialNumber(stockInfo.pbRatio);

  // 1. Croissance
  const years = growth.years || [];
  const revenueYoY: { year: string; result: YoYGrowthResult }[] = [];
  const profitYoY: { year: string; result: YoYGrowthResult }[] = [];
  const chartData: { year: string; revenue: number | null; netProfit: number | null }[] = [];

  for (let i = 0; i < years.length; i++) {
    const curYear = years[i];
    const curRev = parseFinancialNumber(curYear.revenue);
    const curProfit =
      parseFinancialNumber(curYear.netProfitGroupShare) ?? parseFinancialNumber(curYear.netProfit);

    chartData.push({
      year: curYear.year || `Année ${i + 1}`,
      revenue: curRev !== null ? curRev * multiplier : null,
      netProfit: curProfit !== null ? curProfit * multiplier : null,
    });

    if (i > 0) {
      const prevYear = years[i - 1];
      const prevRev = parseFinancialNumber(prevYear.revenue);
      const prevProfit =
        parseFinancialNumber(prevYear.netProfitGroupShare) ??
        parseFinancialNumber(prevYear.netProfit);

      revenueYoY.push({
        year: `${curYear.year || `N${i}`}`,
        result: calculateYoYGrowth(curRev, prevRev),
      });

      profitYoY.push({
        year: `${curYear.year || `N${i}`}`,
        result: calculateYoYGrowth(curProfit, prevProfit),
      });
    }
  }

  // CAGR (sur les années disponibles valides)
  let revenueCAGR: CAGRResult = {
    rate: null,
    absoluteDiff: null,
    isSignificant: false,
    intervals: 0,
    note: "Données insuffisantes (au moins 2 exercices requis).",
  };
  let profitCAGR: CAGRResult = {
    rate: null,
    absoluteDiff: null,
    isSignificant: false,
    intervals: 0,
    note: "Données insuffisantes (au moins 2 exercices requis).",
  };

  if (years.length >= 2) {
    const firstYear = years[0];
    const lastYear = years[years.length - 1];
    const intervals = years.length - 1; // 3 années consécutives = 2 intervalles !

    const startRev = parseFinancialNumber(firstYear.revenue);
    const endRev = parseFinancialNumber(lastYear.revenue);
    revenueCAGR = calculateCAGR(startRev, endRev, intervals);

    const startProfit =
      parseFinancialNumber(firstYear.netProfitGroupShare) ??
      parseFinancialNumber(firstYear.netProfit);
    const endProfit =
      parseFinancialNumber(lastYear.netProfitGroupShare) ??
      parseFinancialNumber(lastYear.netProfit);
    profitCAGR = calculateCAGR(startProfit, endProfit, intervals);
  }

  // 2. Rentabilité
  // Dernier résultat net disponible (en MAD normalisé)
  const lastYearObj = years[years.length - 1];
  const lastNetIncomeGroupMAD = normalizeAmount(lastYearObj?.netProfitGroupShare, unit);
  const lastNetIncomeTotalMAD = normalizeAmount(lastYearObj?.netProfit, unit);
  const lastNetIncomeMAD = lastNetIncomeGroupMAD ?? lastNetIncomeTotalMAD;

  const calculatedEPS = calculateEPS(lastNetIncomeMAD, sharesCount);
  const epsComparison = compareDiscrepancy(manualEPS, calculatedEPS.value, 'BPA (EPS)');
  const effectiveEPS = manualEPS ?? calculatedEPS.value;

  const operatingProfitMAD = normalizeAmount(profitability.operatingProfit, unit);
  const lastRevenueMAD = normalizeAmount(lastYearObj?.revenue, unit);
  const operatingMargin = calculateMargin(operatingProfitMAD, lastRevenueMAD);

  const netMargin = calculateMargin(lastNetIncomeMAD, lastRevenueMAD);
  const marginScopeNote = lastNetIncomeGroupMAD !== null
    ? 'Calculée sur le Résultat net part du groupe (RNPG).'
    : 'Calculée sur le Résultat net consolidé total.';

  const equityGroupMAD = normalizeAmount(profitability.equityGroupShare, unit);
  const equityTotalMAD = normalizeAmount(profitability.equity, unit);
  const equityMAD = equityGroupMAD ?? equityTotalMAD;
  const roe = calculateROE(lastNetIncomeMAD, equityMAD);

  // 3. Valorisation
  const per = calculatePER(currentPrice, effectiveEPS, periodInfo.reportType);
  const perComparison = compareDiscrepancy(manualPER, per.value, 'PER');

  const pbr = calculatePBR(currentPrice, equityMAD, sharesCount);
  const pbrComparison = compareDiscrepancy(manualPBR, pbr.value, 'PBR');

  const dividendYield = calculateDividendYield(dividendPerShare, currentPrice);
  const payoutRatio = calculatePayoutRatio(dividendPerShare, effectiveEPS);
  const pricePosition52w = calculate52WeekPosition(currentPrice, low52w, high52w);

  // 4. Endettement
  const interestBearingDebtMAD = normalizeAmount(debtStability.interestBearingDebt, unit);
  const totalFinancialDebtMAD = normalizeAmount(debtStability.totalFinancialDebt, unit);
  const cashMAD = normalizeAmount(debtStability.cashAndEquivalents, unit);

  const netDebt = calculateNetDebt(interestBearingDebtMAD, totalFinancialDebtMAD, cashMAD);
  const manualNetDebtMAD = normalizeAmount(debtStability.netDebt, unit);

  // Comparaison dette nette
  let netDebtComparison: DiscrepancyComparison = { hasDiscrepancy: false, diffPercent: null };
  if (manualNetDebtMAD !== null && netDebt.valueMAD !== null) {
    const diff = Math.abs(manualNetDebtMAD - netDebt.valueMAD);
    const diffPct = manualNetDebtMAD !== 0 ? (diff / Math.abs(manualNetDebtMAD)) * 100 : 100;
    if (diffPct > 5) {
      netDebtComparison = {
        hasDiscrepancy: true,
        diffPercent: diffPct,
        message: `Écart constaté entre l'endettement net saisi (${(manualNetDebtMAD / multiplier).toFixed(1)}) et calculé (${(netDebt.valueMAD / multiplier).toFixed(1)}).`,
      };
    }
  }
  const effectiveNetDebtMAD = manualNetDebtMAD ?? netDebt.valueMAD;

  const ebitdaMAD = normalizeAmount(profitability.ebitda, unit);
  const netDebtToEbitda = calculateNetDebtToEbitda(
    effectiveNetDebtMAD,
    ebitdaMAD,
    periodInfo.reportType
  );
  const debtToEquity = calculateDebtToEquity(totalFinancialDebtMAD, equityMAD);

  const interestExpenseMAD = normalizeAmount(debtStability.interestExpense, unit);
  const interestCoverage = calculateInterestCoverage(operatingProfitMAD, interestExpenseMAD);

  // 5. Flux de trésorerie
  const operatingCashFlowMAD = normalizeAmount(cashFlow.operatingCashFlow, unit);
  const capexMAD = normalizeAmount(cashFlow.capex, unit);
  const fcf = calculateFreeCashFlow(operatingCashFlowMAD, capexMAD);

  const manualFcfMAD = normalizeAmount(cashFlow.freeCashFlow, unit);
  let fcfComparison: DiscrepancyComparison = { hasDiscrepancy: false, diffPercent: null };
  if (manualFcfMAD !== null && fcf.valueMAD !== null) {
    const diff = Math.abs(manualFcfMAD - fcf.valueMAD);
    const diffPct = manualFcfMAD !== 0 ? (diff / Math.abs(manualFcfMAD)) * 100 : 100;
    if (diffPct > 5) {
      fcfComparison = {
        hasDiscrepancy: true,
        diffPercent: diffPct,
        message: `Écart constaté entre le Free Cash Flow saisi (${(manualFcfMAD / multiplier).toFixed(1)}) et calculé (${(fcf.valueMAD / multiplier).toFixed(1)}).`,
      };
    }
  }

  const cashConversion = calculateCashConversion(operatingCashFlowMAD, lastNetIncomeMAD);

  // 6. Analyse de complétude (16 indicateurs)
  const completenessItems: CompletenessItem[] = [
    {
      id: 'rev-growth',
      name: 'Croissance Chiffre d&apos;affaires (YoY)',
      isCalculable: revenueYoY.some((r) => r.result.rate !== null),
      missingInputs: ['Chiffre d&apos;affaires sur au moins 2 exercices consécutifs'],
    },
    {
      id: 'profit-growth',
      name: 'Croissance Résultat net (YoY)',
      isCalculable: profitYoY.some((r) => r.result.rate !== null),
      missingInputs: ['Résultat net sur au moins 2 exercices consécutifs'],
    },
    {
      id: 'rev-cagr',
      name: 'CAGR Chiffre d&apos;affaires',
      isCalculable: revenueCAGR.rate !== null,
      missingInputs: ['Chiffre d&apos;affaires sur au moins 2 exercices valides'],
    },
    {
      id: 'profit-cagr',
      name: 'CAGR Résultat net',
      isCalculable: profitCAGR.rate !== null,
      missingInputs: ['Résultat net positif sur au moins 2 exercices'],
    },
    {
      id: 'eps',
      name: 'BPA (EPS) par action',
      isCalculable: calculatedEPS.value !== null || manualEPS !== null,
      missingInputs: ['Résultat net de l&apos;exercice', 'Nombre d&apos;actions en circulation'],
    },
    {
      id: 'op-margin',
      name: 'Marge opérationnelle',
      isCalculable: operatingMargin !== null,
      missingInputs: ['Résultat d&apos;exploitation (EBIT)', 'Chiffre d&apos;affaires'],
    },
    {
      id: 'net-margin',
      name: 'Marge nette',
      isCalculable: netMargin !== null,
      missingInputs: ['Résultat net', 'Chiffre d&apos;affaires'],
    },
    {
      id: 'roe',
      name: 'Rentabilité des capitaux propres (ROE)',
      isCalculable: roe.value !== null,
      missingInputs: ['Résultat net', 'Capitaux propres'],
    },
    {
      id: 'per',
      name: 'PER (Price Earnings Ratio)',
      isCalculable: (per.value !== null && per.isSignificant) || manualPER !== null,
      missingInputs: ['Prix actuel de l&apos;action', 'BPA annuel positif (rapport annuel)'],
    },
    {
      id: 'pbr',
      name: 'PBR (Price to Book Ratio)',
      isCalculable: (pbr.value !== null && pbr.isSignificant) || manualPBR !== null,
      missingInputs: ['Prix actuel de l&apos;action', 'Capitaux propres', 'Nombre d&apos;actions'],
    },
    {
      id: 'div-yield',
      name: 'Rendement du dividende (Dividend Yield)',
      isCalculable: dividendYield !== null,
      missingInputs: ['Dividende par action', 'Prix actuel de l&apos;action'],
    },
    {
      id: 'payout',
      name: 'Taux de distribution du dividende (Payout Ratio)',
      isCalculable: payoutRatio.value !== null && payoutRatio.isApplicable,
      missingInputs: ['Dividende par action', 'BPA annuel positif'],
    },
    {
      id: 'pos-52w',
      name: 'Position dans le couloir 52 semaines',
      isCalculable: pricePosition52w.value !== null,
      missingInputs: ['Prix actuel', 'Plus bas 52 semaines', 'Plus haut 52 semaines'],
    },
    {
      id: 'net-debt',
      name: 'Endettement net',
      isCalculable: netDebt.valueMAD !== null || manualNetDebtMAD !== null,
      missingInputs: ['Dettes portant intérêt ou Dettes totales', 'Trésorerie disponible'],
    },
    {
      id: 'debt-ebitda',
      name: 'Ratio Dette Nette / EBITDA',
      isCalculable: netDebtToEbitda.value !== null && netDebtToEbitda.isApplicable,
      missingInputs: ['Dette nette', 'EBITDA annuel (rapport annuel requis)'],
    },
    {
      id: 'fcf',
      name: 'Free Cash Flow (FCF)',
      isCalculable: fcf.valueMAD !== null || manualFcfMAD !== null,
      missingInputs: ['Cash flow opérationnel', 'Investissements / CapEx'],
    },
  ];

  const calculableCount = completenessItems.filter((i) => i.isCalculable).length;
  const missingFieldNames = Array.from(
    new Set(
      completenessItems
        .filter((i) => !i.isCalculable)
        .flatMap((i) => i.missingInputs)
    )
  );

  return {
    unitMultiplier: multiplier,
    growth: {
      revenueYoY,
      profitYoY,
      revenueCAGR,
      profitCAGR,
      chartData,
    },
    profitability: {
      calculatedEPS,
      manualEPS,
      epsComparison,
      effectiveEPS,
      operatingMargin,
      netMargin,
      marginScopeNote,
      roe,
    },
    valuation: {
      per,
      manualPER,
      perComparison,
      pbr,
      manualPBR,
      pbrComparison,
      dividendYield,
      payoutRatio,
      pricePosition52w,
    },
    debt: {
      netDebt,
      manualNetDebtMAD,
      netDebtComparison,
      effectiveNetDebtMAD,
      netDebtToEbitda,
      debtToEquity,
      interestCoverage,
    },
    cashFlow: {
      fcf,
      manualFcfMAD,
      fcfComparison,
      cashConversion,
    },
    completeness: {
      calculableCount,
      totalCount: completenessItems.length,
      items: completenessItems,
      missingFieldNames,
    },
  };
}
