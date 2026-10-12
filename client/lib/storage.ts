import { FinancialChecklistData, FormValidationErrors } from './types';

export const STORAGE_KEY = 'stock_invest_analyzer_checklist_v1';

export const DEFAULT_CHECKLIST_DATA: FinancialChecklistData = {
  periodInfo: {
    financialYear: new Date().getFullYear().toString(),
    reportType: 'annual',
    statementScope: 'consolidated',
    reportDate: '',
    sourceUrl: '',
    unit: 'millions',
  },
  stockInfo: {
    companyName: '',
    ticker: '',
    sector: 'Santé & pharmacie',
    currentPrice: '',
    price52wLow: '',
    price52wHigh: '',
    eps: '',
    peRatio: '',
    pbRatio: '',
    sharesOutstanding: '',
    dividendPerShare: '',
    priceObservationDate: '',
  },
  growth: {
    years: [
      {
        year: (new Date().getFullYear() - 2).toString(),
        revenue: '',
        netProfit: '',
        netProfitGroupShare: '',
      },
      {
        year: (new Date().getFullYear() - 1).toString(),
        revenue: '',
        netProfit: '',
        netProfitGroupShare: '',
      },
      {
        year: new Date().getFullYear().toString(),
        revenue: '',
        netProfit: '',
        netProfitGroupShare: '',
      },
    ],
  },
  profitability: {
    operatingProfit: '',
    ebitda: '',
    equity: '',
    equityGroupShare: '',
    roe: '',
    operatingMargin: '',
    netMargin: '',
  },
  debtStability: {
    totalFinancialDebt: '',
    interestBearingDebt: '',
    cashAndEquivalents: '',
    netDebt: '',
    interestExpense: '',
    totalAssets: '',
  },
  cashFlow: {
    operatingCashFlow: '',
    capex: '',
    freeCashFlow: '',
  },
  valuation: {
    expectedEarningsGrowth: '',
    futurePeRatio: '',
    requiredReturnRate: '10',
    manualFairValue: '',
    desiredMarginOfSafety: '20',
    investmentHorizonYears: '4',
    dividendMode: 'exclude',
  },
  shariah: {
    businessActivity: '',
    methodology: 'AAOIFI',
    activityChecklist: {
      isPrimaryActivityPermissible: 'unknown',
      operatesConventionalBanking: 'no',
      operatesConventionalInsurance: 'no',
      generatesGamblingRevenue: 'no',
      generatesAlcoholRevenue: 'no',
      operatesOtherProhibited: 'no',
      hasMixedActivitiesRequiringAnalysis: 'no',
    },
    interestBearingDebt: '',
    interestIncome: '',
    isInterestIncomeUnbundled: true,
    nonPermissibleIncome: '',
    totalRevenue: '',
    cashAndInterestSecurities: '',
    receivables: '',
    totalAssets: '',
    marketCap: '',
  },
};

export function loadChecklistData(): FinancialChecklistData {
  if (typeof window === 'undefined') return DEFAULT_CHECKLIST_DATA;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CHECKLIST_DATA;
    const parsed = JSON.parse(raw);
    return mergeWithDefaults(parsed);
  } catch (e) {
    console.error('Erreur lors du chargement des données locales:', e);
    return DEFAULT_CHECKLIST_DATA;
  }
}

export function saveChecklistData(data: FinancialChecklistData): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Erreur lors de la sauvegarde locale:', e);
  }
}

export function clearChecklistData(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error('Erreur lors de la réinitialisation:', e);
  }
}

export function validateImportedData(rawJson: unknown): {
  valid: boolean;
  data?: FinancialChecklistData;
  error?: string;
} {
  if (!rawJson || typeof rawJson !== 'object') {
    return { valid: false, error: 'Le fichier JSON fourni est invalide.' };
  }

  const obj = rawJson as Partial<FinancialChecklistData>;

  if (!obj.stockInfo && !obj.periodInfo) {
    return {
      valid: false,
      error: 'Le fichier ne correspond pas au format attendu (sections manquantes).',
    };
  }

  try {
    const merged = mergeWithDefaults(obj);
    return { valid: true, data: merged };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Erreur inconnue';
    return { valid: false, error: `Format de données incompatible : ${errorMsg}` };
  }
}

function mergeWithDefaults(incoming: Partial<FinancialChecklistData>): FinancialChecklistData {
  return {
    periodInfo: {
      ...DEFAULT_CHECKLIST_DATA.periodInfo,
      ...(incoming.periodInfo || {}),
    },
    stockInfo: {
      ...DEFAULT_CHECKLIST_DATA.stockInfo,
      ...(incoming.stockInfo || {}),
    },
    growth: {
      years: Array.isArray(incoming.growth?.years) && incoming.growth.years.length > 0
        ? incoming.growth.years.map((y, idx) => ({
            year: y.year || DEFAULT_CHECKLIST_DATA.growth.years[idx]?.year || '',
            revenue: y.revenue || '',
            netProfit: y.netProfit || '',
            netProfitGroupShare: y.netProfitGroupShare || '',
          }))
        : DEFAULT_CHECKLIST_DATA.growth.years,
    },
    profitability: {
      ...DEFAULT_CHECKLIST_DATA.profitability,
      ...(incoming.profitability || {}),
    },
    debtStability: {
      ...DEFAULT_CHECKLIST_DATA.debtStability,
      ...(incoming.debtStability || {}),
    },
    cashFlow: {
      ...DEFAULT_CHECKLIST_DATA.cashFlow,
      ...(incoming.cashFlow || {}),
    },
    valuation: {
      ...DEFAULT_CHECKLIST_DATA.valuation,
      ...(incoming.valuation || {}),
    },
    shariah: {
      ...DEFAULT_CHECKLIST_DATA.shariah,
      ...(incoming.shariah || {}),
      activityChecklist: {
        ...DEFAULT_CHECKLIST_DATA.shariah.activityChecklist,
        ...(incoming.shariah?.activityChecklist || {}),
      },
    },
  };
}

export function validateForm(data: FinancialChecklistData): FormValidationErrors {
  const errors: FormValidationErrors = {};

  // Stock price validation
  if (data.stockInfo.currentPrice.trim() !== '') {
    const price = parseFloat(data.stockInfo.currentPrice.replace(',', '.'));
    if (isNaN(price) || price <= 0) {
      errors['stockInfo.currentPrice'] = 'Le cours actuel doit être un nombre strictement positif (> 0).';
    }
  }

  // 52 week low / high validation
  const lowStr = data.stockInfo.price52wLow.trim();
  const highStr = data.stockInfo.price52wHigh.trim();
  const low = lowStr !== '' ? parseFloat(lowStr.replace(',', '.')) : null;
  const high = highStr !== '' ? parseFloat(highStr.replace(',', '.')) : null;

  if (low !== null && (isNaN(low) || low <= 0)) {
    errors['stockInfo.price52wLow'] = 'Le plus bas 52 semaines doit être strictement positif.';
  }

  if (high !== null && (isNaN(high) || high <= 0)) {
    errors['stockInfo.price52wHigh'] = 'Le plus haut 52 semaines doit être strictement positif.';
  }

  if (low !== null && high !== null && !isNaN(low) && !isNaN(high)) {
    if (high < low) {
      errors['stockInfo.price52wHigh'] = 'Le cours le plus haut ne peut pas être inférieur au plus bas (52 sem).';
    }
  }

  // Shares outstanding validation
  if (data.stockInfo.sharesOutstanding.trim() !== '') {
    const shares = parseFloat(data.stockInfo.sharesOutstanding.replace(',', '.'));
    if (isNaN(shares) || shares <= 0) {
      errors['stockInfo.sharesOutstanding'] = "Le nombre d'actions doit être strictement positif.";
    }
  }

  // Horizon validation
  if (data.valuation.investmentHorizonYears.trim() !== '') {
    const horizon = parseFloat(data.valuation.investmentHorizonYears.replace(',', '.'));
    if (isNaN(horizon) || horizon <= 0) {
      errors['valuation.investmentHorizonYears'] = "L'horizon d'investissement doit être supérieur à 0 an.";
    }
  }

  return errors;
}
