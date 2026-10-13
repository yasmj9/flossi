import { Injectable, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CompaniesService } from '../companies/companies.service';

export interface PortfolioTransaction {
  id: string;
  portfolioId: string;
  ticker: string;
  type: 'BUY' | 'SELL';
  transactionDate: string;
  quantity: number;
  pricePerShare: number;
  fees: number;
  totalAmount: number;
  notes?: string;
  createdAt: string;
}

export interface CashMovement {
  id: string;
  portfolioId: string;
  type: 'DEPOSIT' | 'WITHDRAWAL' | 'DIVIDEND' | 'OPENING_BALANCE';
  amount: number;
  transactionDate: string;
  ticker?: string;
  notes?: string;
  createdAt: string;
}

export interface DividendRecord {
  id: string;
  portfolioId: string;
  ticker: string;
  paymentDate: string;
  grossAmount: number;
  withholdingTax: number;
  netAmount: number;
  notes?: string;
  createdAt: string;
}

export interface PortfolioHoldingItem {
  ticker: string;
  companyName: string;
  sector: string;
  sharesOwned: number;
  totalInvested: number;
  averageCostPrice: number;
  currentStockPrice: number;
  priceObservationDate: string;
  currentMarketValue: number;
  unrealizedGainMAD: number;
  unrealizedGainPercent: number;
}

export interface SectorAllocationItem {
  sector: string;
  targetPercent: number;
  currentMarketValue: number;
  currentPercent: number;
  differencePercent: number;
}

@Injectable()
export class PortfolioService {
  // In-memory fallback stores
  private transactionsStore: PortfolioTransaction[] = [];
  private cashStore: CashMovement[] = [
    {
      id: 'cash-init',
      portfolioId: 'default-portfolio',
      type: 'DEPOSIT',
      amount: 4000,
      transactionDate: new Date().toISOString().split('T')[0],
      notes: 'Dépôt initial mensuel par défaut',
      createdAt: new Date().toISOString(),
    }
  ];
  private dividendsStore: DividendRecord[] = [];

  constructor(
    private db: DatabaseService,
    private companiesService: CompaniesService
  ) {}

  async getPortfolioSummary() {
    const transactions = await this.listTransactions();
    const cashMovements = await this.listCashMovements();
    const dividends = await this.listDividends();
    const companies = await this.companiesService.findAllCompanies();

    const companyMap = new Map(companies.map(c => [c.ticker.toUpperCase(), c]));

    // Calculer les positions (Holdings) à partir des transactions
    const holdingsMap = new Map<string, { ticker: string; shares: number; totalCost: number; realizedPnL: number }>();

    for (const tx of transactions) {
      const ticker = tx.ticker.toUpperCase();
      const pos = holdingsMap.get(ticker) || { ticker, shares: 0, totalCost: 0, realizedPnL: 0 };

      if (tx.type === 'BUY') {
        pos.shares += tx.quantity;
        pos.totalCost += tx.totalAmount;
      } else if (tx.type === 'SELL') {
        if (pos.shares > 0) {
          const avgCost = pos.totalCost / pos.shares;
          const costOfSold = avgCost * tx.quantity;
          pos.shares -= tx.quantity;
          pos.totalCost -= costOfSold;
          const netProceeds = (tx.quantity * tx.pricePerShare) - tx.fees;
          pos.realizedPnL += (netProceeds - costOfSold);
        }
      }
      holdingsMap.set(ticker, pos);
    }

    let totalInvestedCapital = 0;
    let totalStockMarketValue = 0;
    let totalRealizedPnL = 0;
    const holdings: PortfolioHoldingItem[] = [];
    const sectorValues = new Map<string, number>();

    for (const [ticker, pos] of holdingsMap.entries()) {
      if (pos.shares <= 0) {
        totalRealizedPnL += pos.realizedPnL;
        continue;
      }

      totalRealizedPnL += pos.realizedPnL;
      totalInvestedCapital += pos.totalCost;

      const comp = companyMap.get(ticker);
      const companyName = comp ? comp.name : ticker;
      const sector = comp ? comp.sector : 'Autre';
      const avgCost = pos.shares > 0 ? pos.totalCost / pos.shares : 0;

      // Récupérer le dernier prix
      const priceData = await this.companiesService.findCompanyByTicker(ticker);
      const latestPrice = priceData.prices.length > 0 ? priceData.prices[priceData.prices.length - 1].price : avgCost;
      const priceDate = priceData.prices.length > 0 ? priceData.prices[priceData.prices.length - 1].observationDate : new Date().toISOString().split('T')[0];

      const marketVal = pos.shares * latestPrice;
      totalStockMarketValue += marketVal;

      const unrealizedGain = marketVal - pos.totalCost;
      const unrealizedPercent = pos.totalCost > 0 ? (unrealizedGain / pos.totalCost) * 100 : 0;

      holdings.push({
        ticker,
        companyName,
        sector,
        sharesOwned: pos.shares,
        totalInvested: pos.totalCost,
        averageCostPrice: avgCost,
        currentStockPrice: latestPrice,
        priceObservationDate: priceDate,
        currentMarketValue: marketVal,
        unrealizedGainMAD: unrealizedGain,
        unrealizedGainPercent: unrealizedPercent,
      });

      const currentSecVal = sectorValues.get(sector) || 0;
      sectorValues.set(sector, currentSecVal + marketVal);
    }

    // Calculer les liquidités disponibles
    let totalCash = 0;
    for (const cm of cashMovements) {
      if (cm.type === 'DEPOSIT' || cm.type === 'DIVIDEND' || cm.type === 'OPENING_BALANCE') {
        totalCash += cm.amount;
      } else if (cm.type === 'WITHDRAWAL') {
        totalCash -= cm.amount;
      }
    }

    for (const tx of transactions) {
      if (tx.type === 'BUY') {
        totalCash -= tx.totalAmount;
      } else if (tx.type === 'SELL') {
        const netProceeds = (tx.quantity * tx.pricePerShare) - tx.fees;
        totalCash += netProceeds;
      }
    }

    for (const div of dividends) {
      totalCash += div.netAmount;
    }

    const totalDividends = dividends.reduce((acc, d) => acc + d.netAmount, 0);
    const totalPortfolioValue = totalStockMarketValue + totalCash;
    const totalUnrealizedGain = totalStockMarketValue - totalInvestedCapital;

    // Secteurs cibles par défaut
    const defaultTargets: Record<string, number> = {
      'Biens de consommation & agroalimentaire': 20,
      'Santé & pharmacie': 15,
      'Télécommunications': 15,
      'Mines & métaux': 15,
      'Ports & logistique': 10,
      'Construction & matériaux': 10,
      'Énergie': 10,
      'Technologie': 5,
      'Autre': 0,
    };

    const sectorAllocations: SectorAllocationItem[] = [];
    const allSectors = new Set([...Object.keys(defaultTargets), ...sectorValues.keys()]);

    for (const sec of allSectors) {
      const target = defaultTargets[sec] || 5;
      const mVal = sectorValues.get(sec) || 0;
      const currentPct = totalStockMarketValue > 0 ? (mVal / totalStockMarketValue) * 100 : 0;
      sectorAllocations.push({
        sector: sec,
        targetPercent: target,
        currentMarketValue: mVal,
        currentPercent: currentPct,
        differencePercent: currentPct - target,
      });
    }

    return {
      summary: {
        stockMarketValue: totalStockMarketValue,
        availableCash: totalCash,
        totalPortfolioValue,
        investedCapital: totalInvestedCapital,
        unrealizedGainMAD: totalUnrealizedGain,
        unrealizedGainPercent: totalInvestedCapital > 0 ? (totalUnrealizedGain / totalInvestedCapital) * 100 : 0,
        realizedGainMAD: totalRealizedPnL,
        netDividendsReceived: totalDividends,
        monthlyContributionTarget: 4000,
      },
      holdings,
      sectorAllocations,
      transactions,
      cashMovements,
      dividends,
    };
  }

  async recordBuy(dto: { ticker: string; quantity: number; pricePerShare: number; fees: number; transactionDate: string; notes?: string }) {
    if (dto.quantity <= 0 || dto.pricePerShare <= 0) {
      throw new BadRequestException("La quantité et le prix unitaire doivent être supérieurs à 0.");
    }
    const totalAmount = (dto.quantity * dto.pricePerShare) + (dto.fees || 0);

    // Vérifier les liquidités disponibles
    const summary = await this.getPortfolioSummary();
    if (summary.summary.availableCash < totalAmount) {
      throw new BadRequestException(`Liquidités insuffisantes (${summary.summary.availableCash.toFixed(2)} MAD) pour cet achat de ${totalAmount.toFixed(2)} MAD.`);
    }

    const tx: PortfolioTransaction = {
      id: `tx-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      portfolioId: 'default-portfolio',
      ticker: dto.ticker.toUpperCase(),
      type: 'BUY',
      transactionDate: dto.transactionDate || new Date().toISOString().split('T')[0],
      quantity: dto.quantity,
      pricePerShare: dto.pricePerShare,
      fees: dto.fees || 0,
      totalAmount,
      notes: dto.notes,
      createdAt: new Date().toISOString(),
    };

    if (this.db.getIsConnected()) {
      await this.db.query(
        `INSERT INTO portfolio_transactions (id, ticker, transaction_type, shares, price, fees, amount, transaction_date, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [tx.id, tx.ticker, tx.type, tx.quantity, tx.pricePerShare, tx.fees, tx.totalAmount, tx.transactionDate, tx.notes]
      );
    } else {
      this.transactionsStore.push(tx);
    }

    return tx;
  }

  async recordSell(dto: { ticker: string; quantity: number; pricePerShare: number; fees: number; transactionDate: string; notes?: string }) {
    if (dto.quantity <= 0 || dto.pricePerShare <= 0) {
      throw new BadRequestException("La quantité et le prix de vente doivent être supérieurs à 0.");
    }

    const summary = await this.getPortfolioSummary();
    const holding = summary.holdings.find(h => h.ticker.toUpperCase() === dto.ticker.toUpperCase());

    if (!holding || holding.sharesOwned < dto.quantity) {
      throw new BadRequestException(`Quantité insuffisante. Vous possédez ${holding ? holding.sharesOwned : 0} action(s) de ${dto.ticker}.`);
    }

    const tx: PortfolioTransaction = {
      id: `tx-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      portfolioId: 'default-portfolio',
      ticker: dto.ticker.toUpperCase(),
      type: 'SELL',
      transactionDate: dto.transactionDate || new Date().toISOString().split('T')[0],
      quantity: dto.quantity,
      pricePerShare: dto.pricePerShare,
      fees: dto.fees || 0,
      totalAmount: (dto.quantity * dto.pricePerShare) - (dto.fees || 0),
      notes: dto.notes,
      createdAt: new Date().toISOString(),
    };

    if (this.db.getIsConnected()) {
      await this.db.query(
        `INSERT INTO portfolio_transactions (id, ticker, transaction_type, shares, price, fees, amount, transaction_date, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [tx.id, tx.ticker, tx.type, tx.quantity, tx.pricePerShare, tx.fees, tx.totalAmount, tx.transactionDate, tx.notes]
      );
    } else {
      this.transactionsStore.push(tx);
    }

    return tx;
  }

  async recordCashMovement(dto: { type: 'DEPOSIT' | 'WITHDRAWAL'; amount: number; transactionDate: string; notes?: string }) {
    if (dto.amount <= 0) {
      throw new BadRequestException("Le montant doit être supérieur à 0.");
    }

    const cm: CashMovement = {
      id: `cm-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      portfolioId: 'default-portfolio',
      type: dto.type,
      amount: dto.amount,
      transactionDate: dto.transactionDate || new Date().toISOString().split('T')[0],
      notes: dto.notes,
      createdAt: new Date().toISOString(),
    };

    if (this.db.getIsConnected()) {
      await this.db.query(
        `INSERT INTO cash_movements (id, type, amount, transaction_date, notes) VALUES ($1, $2, $3, $4, $5)`,
        [cm.id, cm.type, cm.amount, cm.transactionDate, cm.notes]
      ).catch(() => {
        // Table might not exist yet in SQL, use fallback store
      });
    }

    this.cashStore.push(cm);
    return cm;
  }

  async recordDividend(dto: { ticker: string; paymentDate: string; grossAmount: number; withholdingTax: number; notes?: string }) {
    const netAmount = dto.grossAmount - (dto.withholdingTax || 0);
    if (netAmount <= 0) {
      throw new BadRequestException("Le montant net du dividende doit être supérieur à 0.");
    }

    const div: DividendRecord = {
      id: `div-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      portfolioId: 'default-portfolio',
      ticker: dto.ticker.toUpperCase(),
      paymentDate: dto.paymentDate || new Date().toISOString().split('T')[0],
      grossAmount: dto.grossAmount,
      withholdingTax: dto.withholdingTax || 0,
      netAmount,
      notes: dto.notes,
      createdAt: new Date().toISOString(),
    };

    this.dividendsStore.push(div);
    return div;
  }

  async listTransactions(): Promise<PortfolioTransaction[]> {
    if (this.db.getIsConnected()) {
      try {
        const res = await this.db.query('SELECT * FROM portfolio_transactions ORDER BY transaction_date DESC, created_at DESC');
        return res.rows.map(r => ({
          id: r.id,
          portfolioId: 'default-portfolio',
          ticker: r.ticker,
          type: r.transaction_type,
          transactionDate: r.transaction_date,
          quantity: r.shares,
          pricePerShare: parseFloat(r.price),
          fees: parseFloat(r.fees),
          totalAmount: parseFloat(r.amount),
          notes: r.notes,
          createdAt: r.created_at,
        }));
      } catch {
        // fallback
      }
    }
    return this.transactionsStore;
  }

  async listCashMovements(): Promise<CashMovement[]> {
    return this.cashStore;
  }

  async listDividends(): Promise<DividendRecord[]> {
    return this.dividendsStore;
  }
}
