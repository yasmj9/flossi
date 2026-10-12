import {
  FinancialChecklistData,
  ShariahMethodology,
  ShariahBusinessActivityChecklist,
} from './types';
import { normalizeAmount, parseFinancialNumber } from './financialMath';

export type ScreeningCriterionStatus = 'PASS' | 'FAIL' | 'REVIEW_REQUIRED';

export type OverallScreeningVerdict = 'PASSED' | 'FAILED' | 'REVIEW_REQUIRED';

export interface ShariahCriterionResult {
  id: string;
  name: string;
  status: ScreeningCriterionStatus;
  valueDisplay: string;
  thresholdDisplay: string;
  ratioPercent: number | null;
  thresholdPercent: number | null;
  denominatorUsed: string;
  explanation: string;
  isMandatory: boolean;
}

export interface MethodologyConfig {
  id: ShariahMethodology;
  name: string;
  shortName: string;
  version: string;
  source: string;
  description: string;
  debtThresholdPercent: number;
  cashThresholdPercent: number;
  incomeThresholdPercent: number;
  receivablesThresholdPercent: number | null;
  denominatorType: 'TOTAL_ASSETS' | 'MARKET_CAP' | 'NONE';
}

export const METHODOLOGIES_CONFIG: Record<string, MethodologyConfig> = {
  STRICT_NO_RIBA: {
    id: 'STRICT_NO_RIBA',
    name: 'Politique stricte sans Riba (Zéro tolérance intérêt)',
    shortName: 'Strict No-Riba',
    version: 'Politique investisseur stricte',
    source: "Règle stricte d'évitement complet de tout intérêt (Riba)",
    description:
      "Approche rigoureuse sans franchise : toute dette portant intérêt avérée (> 0) ou tout revenu d'intérêt (> 0) entraîne la non-conformité immédiate.",
    debtThresholdPercent: 0,
    cashThresholdPercent: 0,
    incomeThresholdPercent: 0,
    receivablesThresholdPercent: null,
    denominatorType: 'NONE',
  },
  AAOIFI: {
    id: 'AAOIFI',
    name: 'AAOIFI — Shariah Standard No. 21',
    shortName: 'AAOIFI (Std 21)',
    version: 'Standard Shariah N° 21 (Investissement en actions ordinaires)',
    source: 'Accounting and Auditing Organization for Islamic Financial Institutions (Bahreïn)',
    description:
      'Standard mondial de référence en finance islamique. Dénominateur financier : Total Actif du bilan.',
    debtThresholdPercent: 30,
    cashThresholdPercent: 30,
    incomeThresholdPercent: 5,
    receivablesThresholdPercent: 70,
    denominatorType: 'TOTAL_ASSETS',
  },
  MSCI_ISLAMIC: {
    id: 'MSCI_ISLAMIC',
    name: 'MSCI Islamic Index Series',
    shortName: 'MSCI Islamic',
    version: 'MSCI Islamic Methodology Guide (Dernière révision)',
    source: 'MSCI Barra / Shariah Advisory Board',
    description:
      "Méthodologie internationale pour indices actions Shariah. Seuil financier de 33,33 % rapporté au Total de l'actif.",
    debtThresholdPercent: 33.333,
    cashThresholdPercent: 33.333,
    incomeThresholdPercent: 5,
    receivablesThresholdPercent: 33.333,
    denominatorType: 'TOTAL_ASSETS',
  },
  FTSE_YASAAR: {
    id: 'FTSE_YASAAR',
    name: 'FTSE Shariah / Yasaar Limited',
    shortName: 'FTSE Yasaar',
    version: 'FTSE Global Equity Shariah Index Rules',
    source: 'FTSE Russell & Yasaar Limited Shariah Consultants',
    description:
      'Règles de sélection certifiées par les juristes de Yasaar. Seuil de 33,33 % sur actif total.',
    debtThresholdPercent: 33.333,
    cashThresholdPercent: 33.333,
    incomeThresholdPercent: 5,
    receivablesThresholdPercent: 50,
    denominatorType: 'TOTAL_ASSETS',
  },
};

export interface ShariahScreeningReport {
  methodology: MethodologyConfig;
  verdict: OverallScreeningVerdict;
  verdictLabel: string;
  summaryExplanation: string;
  businessActivityStatus: ScreeningCriterionStatus;
  businessActivityExplanation: string;
  financialCriteria: ShariahCriterionResult[];
  missingInformation: string[];
  disclaimer: string;
}

export function evaluateBusinessActivity(
  checklist: ShariahBusinessActivityChecklist,
  businessDescription: string
): {
  status: ScreeningCriterionStatus;
  explanation: string;
  failedItems: string[];
  unknownItems: string[];
} {
  const failedItems: string[] = [];
  const unknownItems: string[] = [];

  // 1. Activité principale licite ?
  if (checklist.isPrimaryActivityPermissible === 'no') {
    failedItems.push('Activité principale déclarée illicite');
  } else if (checklist.isPrimaryActivityPermissible === 'unknown') {
    unknownItems.push("Licéité de l'activité principale non vérifiée");
  }

  // 2. Banques conventionnelles
  if (checklist.operatesConventionalBanking === 'yes') {
    failedItems.push('Activité bancaire ou financière conventionnelle (prêts à intérêts)');
  } else if (checklist.operatesConventionalBanking === 'unknown') {
    unknownItems.push('Exposition au secteur bancaire conventionnel non vérifiée');
  }

  // 3. Assurances conventionnelles
  if (checklist.operatesConventionalInsurance === 'yes') {
    failedItems.push('Assurance commerciale conventionnelle (Gharar/Riba)');
  } else if (checklist.operatesConventionalInsurance === 'unknown') {
    unknownItems.push("Exposition à l'assurance conventionnelle non vérifiée");
  }

  // 4. Jeux de hasard
  if (checklist.generatesGamblingRevenue === 'yes') {
    failedItems.push('Revenus issus de jeux de hasard ou casinos (Maysir)');
  } else if (checklist.generatesGamblingRevenue === 'unknown') {
    unknownItems.push('Exposition aux jeux de hasard non vérifiée');
  }

  // 5. Alcool
  if (checklist.generatesAlcoholRevenue === 'yes') {
    failedItems.push('Production ou distribution de boissons alcoolisées');
  } else if (checklist.generatesAlcoholRevenue === 'unknown') {
    unknownItems.push('Exposition aux boissons alcoolisées non vérifiée');
  }

  // 6. Autres activités prohibées (porc, armement illicite, tabac, etc.)
  if (checklist.operatesOtherProhibited === 'yes') {
    failedItems.push('Autres activités prohibées (porc, tabac, armement, divertissement adulte)');
  } else if (checklist.operatesOtherProhibited === 'unknown') {
    unknownItems.push('Autres activités prohibées non vérifiées');
  }

  if (failedItems.length > 0) {
    return {
      status: 'FAIL',
      explanation: `Activité non conforme : ${failedItems.join(' ; ')}.`,
      failedItems,
      unknownItems,
    };
  }

  if (unknownItems.length > 0 || !businessDescription.trim()) {
    return {
      status: 'REVIEW_REQUIRED',
      explanation: `Vérification requise : ${unknownItems.join(' ; ')}${
        !businessDescription.trim() ? " ; description de l'activité non renseignée" : ''
      }.`,
      failedItems,
      unknownItems,
    };
  }

  let note = 'Activité économique principale jugée licite et exempte de secteurs prohibés.';
  if (checklist.hasMixedActivitiesRequiringAnalysis === 'yes') {
    note += " Note : Présence d'activités mixtes nécessitant une vérification des ratios de revenus non conformes.";
  }

  return {
    status: 'PASS',
    explanation: note,
    failedItems,
    unknownItems,
  };
}

export function performShariahScreening(
  data: FinancialChecklistData,
  selectedMethodologyKey?: ShariahMethodology
): ShariahScreeningReport {
  const methodKey = selectedMethodologyKey || data.shariah.methodology || 'AAOIFI';
  const config =
    METHODOLOGIES_CONFIG[methodKey] ||
    METHODOLOGIES_CONFIG.AAOIFI;

  const unit = data.periodInfo.unit;
  const missingInformation: string[] = [];

  // Données de base
  const totalAssetsMAD =
    normalizeAmount(data.shariah.totalAssets, unit) ??
    normalizeAmount(data.debtStability.totalAssets, unit);

  const interestBearingDebtMAD =
    normalizeAmount(data.shariah.interestBearingDebt, unit) ??
    normalizeAmount(data.debtStability.interestBearingDebt, unit);

  const interestIncomeMAD = normalizeAmount(data.shariah.interestIncome, unit);
  const isInterestUnbundled = data.shariah.isInterestIncomeUnbundled ?? true;

  const nonPermissibleIncomeMAD =
    normalizeAmount(data.shariah.nonPermissibleIncome, unit) ?? 0;

  // Chiffre d'affaires / Revenus totaux
  const lastYear = data.growth.years[data.growth.years.length - 1];
  const totalRevenueMAD =
    normalizeAmount(data.shariah.totalRevenue, unit) ??
    normalizeAmount(lastYear?.revenue, unit);

  // Placements financiers / trésorerie
  const cashSecuritiesMAD =
    normalizeAmount(data.shariah.cashAndInterestSecurities, unit) ??
    normalizeAmount(data.debtStability.cashAndEquivalents, unit);

  // Créances clients
  const receivablesMAD = normalizeAmount(data.shariah.receivables, unit);

  // Capitalisation boursière (optionnelle ou de secours)
  const price = parseFinancialNumber(data.stockInfo.currentPrice);
  const shares = parseFinancialNumber(data.stockInfo.sharesOutstanding);
  const calculatedMarketCapMAD = price !== null && shares !== null ? price * shares : null;
  const declaredMarketCapMAD = normalizeAmount(data.shariah.marketCap, unit);
  const marketCapMAD = declaredMarketCapMAD ?? calculatedMarketCapMAD;

  // 1. SCREENING D'ACTIVITÉ
  const activityEval = evaluateBusinessActivity(
    data.shariah.activityChecklist,
    data.shariah.businessActivity
  );

  if (activityEval.unknownItems.length > 0) {
    missingInformation.push(...activityEval.unknownItems);
  }

  // 2. CRITÈRES FINANCIERS SELON LA MÉTHODOLOGIE
  const financialCriteria: ShariahCriterionResult[] = [];

  // A. DETTE PORTANT INTÉRÊT
  if (config.id === 'STRICT_NO_RIBA') {
    // Règle stricte : dette portant intérêt = 0
    if (interestBearingDebtMAD === null) {
      financialCriteria.push({
        id: 'debt_strict',
        name: 'Dettes portant intérêt (Riba)',
        status: 'REVIEW_REQUIRED',
        valueDisplay: 'Non renseigné',
        thresholdDisplay: '0 MAD (Tolérance zéro)',
        ratioPercent: null,
        thresholdPercent: 0,
        denominatorUsed: 'N/A',
        explanation: 'Montant de dette portant intérêt non renseigné.',
        isMandatory: true,
      });
      missingInformation.push('Dettes portant intérêt');
    } else if (interestBearingDebtMAD > 0) {
      financialCriteria.push({
        id: 'debt_strict',
        name: 'Dettes portant intérêt (Riba)',
        status: 'FAIL',
        valueDisplay: `${(interestBearingDebtMAD / 1_000_000).toFixed(1)} M MAD`,
        thresholdDisplay: '0 MAD',
        ratioPercent: null,
        thresholdPercent: 0,
        denominatorUsed: 'N/A',
        explanation: `Présence confirmée de dettes financières portant intérêt (${(
          interestBearingDebtMAD / 1_000_000
        ).toFixed(1)} M MAD). Non conforme sous la politique stricte sans Riba.`,
        isMandatory: true,
      });
    } else {
      financialCriteria.push({
        id: 'debt_strict',
        name: 'Dettes portant intérêt (Riba)',
        status: 'PASS',
        valueDisplay: '0 MAD',
        thresholdDisplay: '0 MAD',
        ratioPercent: 0,
        thresholdPercent: 0,
        denominatorUsed: 'N/A',
        explanation: 'Aucune dette portant intérêt confirmée au bilan.',
        isMandatory: true,
      });
    }

    // REVENUS D'INTÉRÊTS STRICT
    if (interestIncomeMAD === null) {
      financialCriteria.push({
        id: 'income_strict',
        name: "Revenus d'intérêts perçus",
        status: 'REVIEW_REQUIRED',
        valueDisplay: 'Non renseigné',
        thresholdDisplay: '0 MAD (Tolérance zéro)',
        ratioPercent: null,
        thresholdPercent: 0,
        denominatorUsed: 'N/A',
        explanation: "Revenus d'intérêts perçus non renseignés.",
        isMandatory: true,
      });
      missingInformation.push("Revenus d'intérêts perçus");
    } else if (!isInterestUnbundled) {
      financialCriteria.push({
        id: 'income_strict',
        name: "Revenus d'intérêts perçus",
        status: 'REVIEW_REQUIRED',
        valueDisplay: 'Montant regroupé',
        thresholdDisplay: '0 MAD',
        ratioPercent: null,
        thresholdPercent: 0,
        denominatorUsed: 'N/A',
        explanation:
          "Le rapport financier regroupe les intérêts avec d'autres produits sans ventilation détaillée. Vérification requise.",
        isMandatory: true,
      });
      missingInformation.push("Ventilation précise des produits d'intérêts");
    } else if (interestIncomeMAD > 0) {
      financialCriteria.push({
        id: 'income_strict',
        name: "Revenus d'intérêts perçus",
        status: 'FAIL',
        valueDisplay: `${(interestIncomeMAD / 1_000_000).toFixed(2)} M MAD`,
        thresholdDisplay: '0 MAD',
        ratioPercent: null,
        thresholdPercent: 0,
        denominatorUsed: 'N/A',
        explanation: `Perception de revenus d'intérêts (${(
          interestIncomeMAD / 1_000_000
        ).toFixed(2)} M MAD). Non conforme sous la politique stricte.`,
        isMandatory: true,
      });
    } else {
      financialCriteria.push({
        id: 'income_strict',
        name: "Revenus d'intérêts perçus",
        status: 'PASS',
        valueDisplay: '0 MAD',
        thresholdDisplay: '0 MAD',
        ratioPercent: 0,
        thresholdPercent: 0,
        denominatorUsed: 'N/A',
        explanation: "Aucun revenu d'intérêt perçu.",
        isMandatory: true,
      });
    }

    // REVENUS NON CONFORMES STRICT
    if (nonPermissibleIncomeMAD > 0) {
      financialCriteria.push({
        id: 'other_prohibited_strict',
        name: 'Autres revenus prohibés',
        status: 'FAIL',
        valueDisplay: `${(nonPermissibleIncomeMAD / 1_000_000).toFixed(2)} M MAD`,
        thresholdDisplay: '0 MAD',
        ratioPercent: null,
        thresholdPercent: 0,
        denominatorUsed: 'N/A',
        explanation: `Présence de revenus non conformes déclarés (${(
          nonPermissibleIncomeMAD / 1_000_000
        ).toFixed(2)} M MAD).`,
        isMandatory: true,
      });
    } else {
      financialCriteria.push({
        id: 'other_prohibited_strict',
        name: 'Autres revenus prohibés',
        status: 'PASS',
        valueDisplay: '0 MAD',
        thresholdDisplay: '0 MAD',
        ratioPercent: 0,
        thresholdPercent: 0,
        denominatorUsed: 'N/A',
        explanation: 'Aucun autre revenu non conforme déclaré.',
        isMandatory: true,
      });
    }
  } else {
    // METHODOLOGIES PUBLIÉES (AAOIFI, MSCI, FTSE YASAAR)
    const denominatorMAD =
      config.denominatorType === 'MARKET_CAP' ? marketCapMAD : totalAssetsMAD;
    const denominatorLabel =
      config.denominatorType === 'MARKET_CAP'
        ? 'Capitalisation boursière'
        : "Total de l'actif";

    // 1. Ratio d'endettement portant intérêt
    if (interestBearingDebtMAD === null || denominatorMAD === null || denominatorMAD <= 0) {
      financialCriteria.push({
        id: 'debt_ratio',
        name: 'Ratio Dettes portant intérêt / Actif total',
        status: 'REVIEW_REQUIRED',
        valueDisplay: 'Données incomplètes',
        thresholdDisplay: `< ${config.debtThresholdPercent.toFixed(1)} %`,
        ratioPercent: null,
        thresholdPercent: config.debtThresholdPercent,
        denominatorUsed: denominatorLabel,
        explanation:
          'Dette portant intérêt ou Actif total manquant pour calculer le ratio bilanciel.',
        isMandatory: true,
      });
      if (interestBearingDebtMAD === null) missingInformation.push('Dette portant intérêt');
      if (denominatorMAD === null || denominatorMAD <= 0)
        missingInformation.push('Actif total du bilan');
    } else {
      const ratio = (interestBearingDebtMAD / denominatorMAD) * 100;
      const isPass = ratio < config.debtThresholdPercent;
      financialCriteria.push({
        id: 'debt_ratio',
        name: 'Ratio Dettes portant intérêt / Actif total',
        status: isPass ? 'PASS' : 'FAIL',
        valueDisplay: `${ratio.toFixed(2)} %`,
        thresholdDisplay: `< ${config.debtThresholdPercent.toFixed(1)} %`,
        ratioPercent: ratio,
        thresholdPercent: config.debtThresholdPercent,
        denominatorUsed: denominatorLabel,
        explanation: isPass
          ? `Conforme au seuil de ${config.debtThresholdPercent.toFixed(1)} % (${ratio.toFixed(
              2
            )} % de l'actif total).`
          : `Non conforme : Le ratio d'endettement portant intérêt (${ratio.toFixed(
              2
            )} %) dépasse le plafond autorisé de ${config.debtThresholdPercent.toFixed(1)} %.`,
        isMandatory: true,
      });
    }

    // 2. Ratio Trésorerie et Placements rémunérés
    if (cashSecuritiesMAD === null || denominatorMAD === null || denominatorMAD <= 0) {
      financialCriteria.push({
        id: 'cash_ratio',
        name: 'Ratio Trésorerie & Placements rémunérés / Actif total',
        status: 'REVIEW_REQUIRED',
        valueDisplay: 'Données incomplètes',
        thresholdDisplay: `< ${config.cashThresholdPercent.toFixed(1)} %`,
        ratioPercent: null,
        thresholdPercent: config.cashThresholdPercent,
        denominatorUsed: denominatorLabel,
        explanation: 'Trésorerie / placements ou Actif total manquant.',
        isMandatory: true,
      });
      if (cashSecuritiesMAD === null)
        missingInformation.push('Trésorerie et placements rémunérés');
    } else {
      const ratio = (cashSecuritiesMAD / denominatorMAD) * 100;
      const isPass = ratio < config.cashThresholdPercent;
      financialCriteria.push({
        id: 'cash_ratio',
        name: 'Ratio Trésorerie & Placements rémunérés / Actif total',
        status: isPass ? 'PASS' : 'FAIL',
        valueDisplay: `${ratio.toFixed(2)} %`,
        thresholdDisplay: `< ${config.cashThresholdPercent.toFixed(1)} %`,
        ratioPercent: ratio,
        thresholdPercent: config.cashThresholdPercent,
        denominatorUsed: denominatorLabel,
        explanation: isPass
          ? `Conforme : Les liquidités et titres rémunérés représentent ${ratio.toFixed(
              2
            )} % de l'actif (seuil < ${config.cashThresholdPercent.toFixed(1)} %).`
          : `Non conforme : La trésorerie et placements rémunérés (${ratio.toFixed(
              2
            )} %) dépassent le seuil de ${config.cashThresholdPercent.toFixed(1)} %.`,
        isMandatory: true,
      });
    }

    // 3. Ratio Revenus non conformes / Total des revenus (< 5 %)
    const totalImpureIncomeMAD =
      (interestIncomeMAD ?? 0) + (nonPermissibleIncomeMAD ?? 0);

    if (totalRevenueMAD === null || totalRevenueMAD <= 0) {
      financialCriteria.push({
        id: 'impure_income_ratio',
        name: "Ratio Revenus non conformes / Chiffre d'affaires",
        status: 'REVIEW_REQUIRED',
        valueDisplay: 'Données incomplètes',
        thresholdDisplay: `< ${config.incomeThresholdPercent.toFixed(1)} %`,
        ratioPercent: null,
        thresholdPercent: config.incomeThresholdPercent,
        denominatorUsed: "Chiffre d'affaires total",
        explanation: "Chiffre d'affaires total manquant pour calculer le ratio de tolérance.",
        isMandatory: true,
      });
      missingInformation.push("Total des revenus / Chiffre d'affaires");
    } else if (interestIncomeMAD === null && nonPermissibleIncomeMAD === 0) {
      financialCriteria.push({
        id: 'impure_income_ratio',
        name: "Ratio Revenus non conformes / Chiffre d'affaires",
        status: 'REVIEW_REQUIRED',
        valueDisplay: "Revenus d'intérêts non vérifiés",
        thresholdDisplay: `< ${config.incomeThresholdPercent.toFixed(1)} %`,
        ratioPercent: null,
        thresholdPercent: config.incomeThresholdPercent,
        denominatorUsed: "Chiffre d'affaires total",
        explanation:
          "Les revenus d'intérêts ne sont pas renseignés. Vérification requise pour confirmer que les revenus impurs sont inférieurs à 5 %.",
        isMandatory: true,
      });
      missingInformation.push("Revenus d'intérêts perçus");
    } else if (!isInterestUnbundled) {
      financialCriteria.push({
        id: 'impure_income_ratio',
        name: "Ratio Revenus non conformes / Chiffre d'affaires",
        status: 'REVIEW_REQUIRED',
        valueDisplay: 'Montant regroupé dans le rapport',
        thresholdDisplay: `< ${config.incomeThresholdPercent.toFixed(1)} %`,
        ratioPercent: null,
        thresholdPercent: config.incomeThresholdPercent,
        denominatorUsed: "Chiffre d'affaires total",
        explanation:
          "Le rapport financier regroupe les intérêts avec d'autres produits sans ventilation détaillée. Vérification requise.",
        isMandatory: true,
      });
      missingInformation.push("Ventilation précise des produits financiers");
    } else {
      const ratio = (totalImpureIncomeMAD / totalRevenueMAD) * 100;
      const isPass = ratio < config.incomeThresholdPercent;
      financialCriteria.push({
        id: 'impure_income_ratio',
        name: "Ratio Revenus non conformes / Chiffre d'affaires",
        status: isPass ? 'PASS' : 'FAIL',
        valueDisplay: `${ratio.toFixed(2)} %`,
        thresholdDisplay: `< ${config.incomeThresholdPercent.toFixed(1)} %`,
        ratioPercent: ratio,
        thresholdPercent: config.incomeThresholdPercent,
        denominatorUsed: "Chiffre d'affaires total",
        explanation: isPass
          ? `Conforme : Les revenus impurs déclarés représentent ${ratio.toFixed(
              2
            )} % du chiffre d'affaires (seuil de tolérance < 5 %).`
          : `Non conforme : Les revenus non conformes (${ratio.toFixed(
              2
            )} %) dépassent le seuil de tolérance de 5 %.`,
        isMandatory: true,
      });
    }

    // 4. Règle additionnelle : Créances clients / Actif total (si prescrit par la méthode)
    if (config.receivablesThresholdPercent !== null) {
      if (receivablesMAD === null || denominatorMAD === null || denominatorMAD <= 0) {
        financialCriteria.push({
          id: 'receivables_ratio',
          name: 'Ratio Créances clients / Actif total',
          status: 'REVIEW_REQUIRED',
          valueDisplay: 'Non renseigné',
          thresholdDisplay: `< ${config.receivablesThresholdPercent.toFixed(1)} %`,
          ratioPercent: null,
          thresholdPercent: config.receivablesThresholdPercent,
          denominatorUsed: denominatorLabel,
          explanation: 'Créances clients non renseignées.',
          isMandatory: false,
        });
        missingInformation.push('Créances clients (bilan)');
      } else {
        const ratio = (receivablesMAD / denominatorMAD) * 100;
        const isPass = ratio < config.receivablesThresholdPercent;
        financialCriteria.push({
          id: 'receivables_ratio',
          name: 'Ratio Créances clients / Actif total',
          status: isPass ? 'PASS' : 'FAIL',
          valueDisplay: `${ratio.toFixed(2)} %`,
          thresholdDisplay: `< ${config.receivablesThresholdPercent.toFixed(1)} %`,
          ratioPercent: ratio,
          thresholdPercent: config.receivablesThresholdPercent,
          denominatorUsed: denominatorLabel,
          explanation: isPass
            ? `Conforme au test de liquidité / illiquidité (${ratio.toFixed(
                2
              )} % < ${config.receivablesThresholdPercent.toFixed(1)} %).`
            : `Non conforme : Les créances (${ratio.toFixed(
                2
              )} %) dépassent le seuil de ${config.receivablesThresholdPercent.toFixed(1)} %.`,
          isMandatory: false,
        });
      }
    }
  }

  // 3. VERDICT GLOBAL
  const allStatuses: ScreeningCriterionStatus[] = [
    activityEval.status,
    ...financialCriteria.map((c) => c.status),
  ];

  let verdict: OverallScreeningVerdict = 'REVIEW_REQUIRED';
  let verdictLabel = 'VÉRIFICATION REQUISE';
  let summaryExplanation = '';

  const hasFail = allStatuses.some((s) => s === 'FAIL');
  const hasReview = allStatuses.some((s) => s === 'REVIEW_REQUIRED');

  if (hasFail) {
    verdict = 'FAILED';
    verdictLabel = 'NON CONFORME (NON SHARIAH COMPLIANT)';
    summaryExplanation =
      "Au moins un critère obligatoire n'est pas respecté (activité prohibée ou dépassement des seuils financiers de Riba).";
  } else if (hasReview || missingInformation.length > 0) {
    verdict = 'REVIEW_REQUIRED';
    verdictLabel = 'VÉRIFICATION REQUISE (DONNÉES INCOMPLÈTES)';
    summaryExplanation =
      "Aucun manquement n'a été détecté, mais certaines informations indispensables sont manquantes ou non vérifiées. Selon les principes islamiques, une action ne peut être déclarée conforme sans audit documentaire complet.";
  } else {
    verdict = 'PASSED';
    verdictLabel = 'CONFORME (SHARIAH COMPLIANT)';
    summaryExplanation = `Tous les critères applicables de la méthode ${config.name} sont validés sur la base des données financières déclarées.`;
  }

  const disclaimer =
    "Ce résultat est un outil d'analyse financière et de calcul de conformité documentaire. Il ne constitue en aucun cas une certification religieuse officielle, une fatwa ou une recommandation d'investissement.";

  return {
    methodology: config,
    verdict,
    verdictLabel,
    summaryExplanation,
    businessActivityStatus: activityEval.status,
    businessActivityExplanation: activityEval.explanation,
    financialCriteria,
    missingInformation: Array.from(new Set(missingInformation)),
    disclaimer,
  };
}
