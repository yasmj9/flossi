export type CurrencyUnit = 'MAD' | 'thousands' | 'millions' | 'billions';

export type ReportType = 'annual' | 'semiannual';

export type StatementScope = 'consolidated' | 'parent';

export type ShariahMethodology =
  | 'STRICT_NO_RIBA'
  | 'AAOIFI'
  | 'MSCI_ISLAMIC'
  | 'FTSE_YASAAR'
  | 'FTSE'
  | 'MSCI'
  | 'SP'
  | 'Other';

export type TriStateAnswer = 'yes' | 'no' | 'unknown';

export interface ShariahBusinessActivityChecklist {
  isPrimaryActivityPermissible: TriStateAnswer;
  operatesConventionalBanking: TriStateAnswer;
  operatesConventionalInsurance: TriStateAnswer;
  generatesGamblingRevenue: TriStateAnswer;
  generatesAlcoholRevenue: TriStateAnswer;
  operatesOtherProhibited: TriStateAnswer;
  hasMixedActivitiesRequiringAnalysis: TriStateAnswer;
}

export interface FinancialYearRow {
  year: string;
  revenue: string;
  netProfit: string;
  netProfitGroupShare: string;
}

export interface FinancialChecklistData {
  periodInfo: {
    financialYear: string;
    reportType: ReportType;
    statementScope: StatementScope;
    reportDate: string;
    sourceUrl: string;
    unit: CurrencyUnit;
  };
  stockInfo: {
    companyName: string;
    ticker: string;
    sector: string;
    currentPrice: string;
    price52wLow: string;
    price52wHigh: string;
    eps: string;
    peRatio: string;
    pbRatio: string;
    sharesOutstanding: string;
    dividendPerShare: string;
    priceObservationDate: string;
  };
  growth: {
    years: FinancialYearRow[];
  };
  profitability: {
    operatingProfit: string;
    ebitda: string;
    equity: string;
    equityGroupShare: string;
    roe: string;
    operatingMargin: string;
    netMargin: string;
  };
  debtStability: {
    totalFinancialDebt: string;
    interestBearingDebt: string;
    cashAndEquivalents: string;
    netDebt: string;
    interestExpense: string;
    totalAssets: string;
  };
  cashFlow: {
    operatingCashFlow: string;
    capex: string;
    freeCashFlow: string;
  };
  valuation: {
    expectedEarningsGrowth: string;
    futurePeRatio: string;
    requiredReturnRate: string;
    manualFairValue: string;
    desiredMarginOfSafety: string;
    investmentHorizonYears: string;
    dividendMode?: 'exclude' | 'include';
  };
  shariah: {
    businessActivity: string;
    methodology: ShariahMethodology;
    activityChecklist: ShariahBusinessActivityChecklist;
    interestBearingDebt: string;
    interestIncome: string;
    isInterestIncomeUnbundled: boolean;
    nonPermissibleIncome: string;
    totalRevenue: string;
    cashAndInterestSecurities: string;
    receivables: string;
    totalAssets: string;
    marketCap: string;
  };
}

export interface FormValidationErrors {
  [fieldPath: string]: string;
}
