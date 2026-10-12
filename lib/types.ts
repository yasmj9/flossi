export type CurrencyUnit = 'MAD' | 'thousands' | 'millions' | 'billions';

export type ReportType = 'annual' | 'semiannual';

export type StatementScope = 'consolidated' | 'parent';

export type ShariahMethodology = 'AAOIFI' | 'FTSE' | 'MSCI' | 'SP' | 'Other';

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
  };
  shariah: {
    businessActivity: string;
    methodology: ShariahMethodology;
    interestBearingDebt: string;
    interestIncome: string;
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
