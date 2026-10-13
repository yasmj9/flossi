export interface PortfolioTransaction {
  id: string;
  ticker: string;
  type: 'BUY' | 'SELL';
  transactionDate: string;
  quantity: number;
  pricePerShare: number;
  fees: number;
  totalAmount: number;
  notes?: string;
}

export interface CashMovement {
  id: string;
  type: 'DEPOSIT' | 'WITHDRAWAL' | 'DIVIDEND' | 'OPENING_BALANCE';
  amount: number;
  transactionDate: string;
  notes?: string;
}

export interface DividendRecord {
  id: string;
  ticker: string;
  paymentDate: string;
  grossAmount: number;
  withholdingTax: number;
  netAmount: number;
  notes?: string;
}

const transactions: PortfolioTransaction[] = [
  {
    id: 'tx-akt-1',
    ticker: 'AKT',
    type: 'BUY',
    transactionDate: '2024-03-15',
    quantity: 6,
    pricePerShare: 1000,
    fees: 30,
    totalAmount: 6030,
    notes: 'Premier achat stratégique Akdital',
  },
];

const cashMovements: CashMovement[] = [
  {
    id: 'cash-init',
    type: 'DEPOSIT',
    amount: 10000,
    transactionDate: '2024-03-01',
    notes: 'Apport initial épargne',
  },
];

const dividends: DividendRecord[] = [
  {
    id: 'div-akt-1',
    ticker: 'AKT',
    paymentDate: '2024-06-20',
    grossAmount: 180,
    withholdingTax: 27,
    netAmount: 153,
    notes: 'Dividende ordinaire 2023',
  },
];

const SECTORS_MAP: Record<string, string> = {
  AKT: 'Santé & pharmacie',
  LBV: 'Biens de consommation & agroalimentaire',
  MNG: 'Mines & métaux',
  IAM: 'Télécommunications',
  ATW: 'Banque',
};

const COMPANY_NAMES: Record<string, string> = {
  AKT: 'Akdital',
  LBV: 'LabelVie',
  MNG: 'Managem',
  IAM: 'Maroc Telecom',
  ATW: 'Attijariwafa Bank',
};

const CURRENT_PRICES: Record<string, number> = {
  AKT: 1083.33,
  LBV: 4200,
  MNG: 2100,
  IAM: 94,
  ATW: 510,
};

export function getPortfolioData() {
  const holdingsMap = new Map<string, { ticker: string; shares: number; totalCost: number; realizedPnL: number }>();

  for (const tx of transactions) {
    const t = tx.ticker.toUpperCase();
    const h = holdingsMap.get(t) || { ticker: t, shares: 0, totalCost: 0, realizedPnL: 0 };
    if (tx.type === 'BUY') {
      h.shares += tx.quantity;
      h.totalCost += tx.totalAmount;
    } else if (tx.type === 'SELL') {
      const avgCost = h.shares > 0 ? h.totalCost / h.shares : 0;
      const costOfSold = avgCost * tx.quantity;
      h.realizedPnL += tx.totalAmount - costOfSold;
      h.shares -= tx.quantity;
      h.totalCost -= costOfSold;
    }
    holdingsMap.set(t, h);
  }

  let stockMarketValue = 0;
  let investedCapital = 0;
  let totalRealizedGain = 0;

  const holdings = Array.from(holdingsMap.values())
    .filter((h) => h.shares > 0)
    .map((h) => {
      const curPrice = CURRENT_PRICES[h.ticker] || (h.shares > 0 ? h.totalCost / h.shares : 100);
      const mktVal = h.shares * curPrice;
      const avgCost = h.shares > 0 ? h.totalCost / h.shares : 0;
      const unPnL = mktVal - h.totalCost;
      const unPnLPct = h.totalCost > 0 ? (unPnL / h.totalCost) * 100 : 0;

      stockMarketValue += mktVal;
      investedCapital += h.totalCost;
      totalRealizedGain += h.realizedPnL;

      return {
        ticker: h.ticker,
        companyName: COMPANY_NAMES[h.ticker] || h.ticker,
        sector: SECTORS_MAP[h.ticker] || 'Autre',
        sharesOwned: h.shares,
        totalInvested: h.totalCost,
        averageCostPrice: avgCost,
        currentStockPrice: curPrice,
        priceObservationDate: new Date().toISOString().split('T')[0],
        currentMarketValue: mktVal,
        unrealizedGainMAD: unPnL,
        unrealizedGainPercent: unPnLPct,
      };
    });

  let totalDeposits = 0;
  for (const c of cashMovements) {
    if (c.type === 'DEPOSIT' || c.type === 'OPENING_BALANCE' || c.type === 'DIVIDEND') {
      totalDeposits += c.amount;
    } else if (c.type === 'WITHDRAWAL') {
      totalDeposits -= c.amount;
    }
  }

  let netDivReceived = 0;
  for (const d of dividends) {
    netDivReceived += d.netAmount;
  }

  let totalSpentOnBuys = 0;
  let totalReceivedFromSells = 0;
  for (const tx of transactions) {
    if (tx.type === 'BUY') totalSpentOnBuys += tx.totalAmount;
    if (tx.type === 'SELL') totalReceivedFromSells += tx.totalAmount;
  }

  const availableCash = Math.max(0, totalDeposits + netDivReceived + totalReceivedFromSells - totalSpentOnBuys);
  const totalPortfolioValue = stockMarketValue + availableCash;
  const unrealizedGainMAD = stockMarketValue - investedCapital;
  const unrealizedGainPercent = investedCapital > 0 ? (unrealizedGainMAD / investedCapital) * 100 : 0;

  const defaultTargets: Record<string, number> = {
    'Santé & pharmacie': 15,
    'Biens de consommation & agroalimentaire': 20,
    'Télécommunications': 15,
    'Mines & métaux': 15,
    'Ports & logistique': 10,
    'Construction & matériaux': 10,
    'Énergie': 10,
    'Technologie': 5,
  };

  const sectorAllocations = Object.entries(defaultTargets).map(([sec, target]) => {
    const secHoldings = holdings.filter((h) => h.sector === sec);
    const secVal = secHoldings.reduce((acc, cur) => acc + cur.currentMarketValue, 0);
    const secPct = totalPortfolioValue > 0 ? (secVal / totalPortfolioValue) * 100 : 0;
    return {
      sector: sec,
      targetPercent: target,
      currentMarketValue: secVal,
      currentPercent: secPct,
      differencePercent: secPct - target,
    };
  });

  return {
    summary: {
      stockMarketValue,
      availableCash,
      totalPortfolioValue,
      investedCapital,
      unrealizedGainMAD,
      unrealizedGainPercent,
      realizedGainMAD: totalRealizedGain,
      netDividendsReceived: netDivReceived,
      monthlyContributionTarget: 4000,
    },
    holdings,
    sectorAllocations,
    transactions,
    cashMovements,
    dividends,
  };
}

export function recordBuyTransaction(data: {
  ticker: string;
  quantity: number;
  pricePerShare: number;
  fees: number;
  transactionDate: string;
  notes?: string;
}) {
  const totalAmount = data.quantity * data.pricePerShare + data.fees;
  const tx: PortfolioTransaction = {
    id: `tx-${Date.now()}`,
    ticker: data.ticker.toUpperCase(),
    type: 'BUY',
    transactionDate: data.transactionDate,
    quantity: data.quantity,
    pricePerShare: data.pricePerShare,
    fees: data.fees,
    totalAmount,
    notes: data.notes,
  };
  transactions.unshift(tx);
  return tx;
}

export function recordSellTransaction(data: {
  ticker: string;
  quantity: number;
  pricePerShare: number;
  fees: number;
  transactionDate: string;
  notes?: string;
}) {
  const totalAmount = data.quantity * data.pricePerShare - data.fees;
  const tx: PortfolioTransaction = {
    id: `tx-${Date.now()}`,
    ticker: data.ticker.toUpperCase(),
    type: 'SELL',
    transactionDate: data.transactionDate,
    quantity: data.quantity,
    pricePerShare: data.pricePerShare,
    fees: data.fees,
    totalAmount,
    notes: data.notes,
  };
  transactions.unshift(tx);
  return tx;
}

export function recordCash(data: {
  type: 'DEPOSIT' | 'WITHDRAWAL';
  amount: number;
  transactionDate: string;
  notes?: string;
}) {
  const c: CashMovement = {
    id: `cash-${Date.now()}`,
    type: data.type,
    amount: data.amount,
    transactionDate: data.transactionDate,
    notes: data.notes,
  };
  cashMovements.unshift(c);
  return c;
}

export function recordDividend(data: {
  ticker: string;
  paymentDate: string;
  grossAmount: number;
  withholdingTax: number;
  notes?: string;
}) {
  const netAmount = data.grossAmount - data.withholdingTax;
  const d: DividendRecord = {
    id: `div-${Date.now()}`,
    ticker: data.ticker.toUpperCase(),
    paymentDate: data.paymentDate,
    grossAmount: data.grossAmount,
    withholdingTax: data.withholdingTax,
    netAmount,
    notes: data.notes,
  };
  dividends.unshift(d);
  return d;
}
