import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

export interface Company {
  id: string;
  ticker: string;
  name: string;
  sector: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FinancialReport {
  id: string;
  companyId: string;
  ticker: string;
  fiscalYear: number;
  periodType: 'FY' | 'H1';
  periodEndDate: string;
  statementScope: 'CONSOLIDATED' | 'PARENT';
  publishedAt?: string;
  sourceReference?: string;
  financialData: {
    revenue: number;
    netProfit: number;
    operatingProfit?: number;
    ebitda?: number;
    financialDebt: number;
    cash: number;
    operatingCashFlow: number;
    capex: number;
    equity?: number;
    eps?: number;
  };
  revisionNumber: number;
  createdAt: string;
}

export interface PriceObservation {
  id: string;
  companyId: string;
  ticker: string;
  price: number;
  high52w: number;
  low52w: number;
  observationDate: string;
  source?: string;
  createdAt: string;
}

@Injectable()
export class CompaniesService {
  // In-memory fallback stores
  private companiesMap = new Map<string, Company>();
  private reportsMap = new Map<string, FinancialReport[]>(); // ticker -> reports
  private pricesMap = new Map<string, PriceObservation[]>(); // ticker -> prices

  constructor(private db: DatabaseService) {
    // Seed default Moroccan stocks (e.g. AKT - Akdital, MNG - Managem, LOM - LabelVie)
    this.seedDefaults();
  }

  private seedDefaults() {
    const defaultCompanies: Company[] = [
      { id: 'akt', ticker: 'AKT', name: 'Akdital SA', sector: 'HEALTHCARE_PHARMA', description: 'Leader de la santé privée au Maroc', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 'mng', ticker: 'MNG', name: 'Managem', sector: 'MINING_METALS', description: 'Extraction minière et métaux précieux', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 'lbv', ticker: 'LBV', name: 'LabelVie', sector: 'CONSUMER_GOODS', description: 'Grande distribution et hypermarchés', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 'iam', ticker: 'IAM', name: 'Maroc Telecom', sector: 'TELECOM', description: 'Opérateur télécom historique', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    ];

    for (const c of defaultCompanies) {
      this.companiesMap.set(c.ticker, c);
      this.reportsMap.set(c.ticker, [
        {
          id: `${c.ticker}-2024-fy`,
          companyId: c.id,
          ticker: c.ticker,
          fiscalYear: 2024,
          periodType: 'FY',
          periodEndDate: '2024-12-31',
          statementScope: 'CONSOLIDATED',
          financialData: {
            revenue: c.ticker === 'AKT' ? 2400000000 : 5000000000,
            netProfit: c.ticker === 'AKT' ? 350000000 : 600000000,
            operatingProfit: c.ticker === 'AKT' ? 500000000 : 800000000,
            ebitda: c.ticker === 'AKT' ? 650000000 : 1000000000,
            financialDebt: 1200000000,
            cash: 300000000,
            operatingCashFlow: 550000000,
            capex: 400000000,
          },
          revisionNumber: 1,
          createdAt: new Date().toISOString(),
        }
      ]);
      this.pricesMap.set(c.ticker, [
        {
          id: `${c.ticker}-price-1`,
          companyId: c.id,
          ticker: c.ticker,
          price: c.ticker === 'AKT' ? 950 : c.ticker === 'MNG' ? 2400 : 450,
          high52w: c.ticker === 'AKT' ? 1000 : 2500,
          low52w: c.ticker === 'AKT' ? 800 : 2000,
          observationDate: new Date().toISOString().split('T')[0],
          source: 'Bourse de Casablanca',
          createdAt: new Date().toISOString(),
        }
      ]);
    }
  }

  async findAllCompanies(): Promise<Company[]> {
    if (this.db.getIsConnected()) {
      try {
        const res = await this.db.query('SELECT * FROM companies ORDER BY ticker ASC');
        return res.rows.map(r => ({
          id: r.id,
          ticker: r.ticker,
          name: r.name,
          sector: r.sector,
          description: r.description,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        }));
      } catch (e) {
        // fallback
      }
    }
    return Array.from(this.companiesMap.values());
  }

  async findCompanyByTicker(ticker: string): Promise<{ company: Company; reports: FinancialReport[]; prices: PriceObservation[] }> {
    const t = ticker.toUpperCase();
    let company: Company | undefined;
    let reports: FinancialReport[] = [];
    let prices: PriceObservation[] = [];

    if (this.db.getIsConnected()) {
      try {
        const cRes = await this.db.query('SELECT * FROM companies WHERE ticker = $1', [t]);
        if (cRes.rows.length > 0) {
          const r = cRes.rows[0];
          company = { id: r.id, ticker: r.ticker, name: r.name, sector: r.sector, description: r.description, createdAt: r.created_at, updatedAt: r.updated_at };
          
          const repRes = await this.db.query('SELECT * FROM financial_reports WHERE company_id = $1 ORDER BY fiscal_year DESC, period_type DESC', [company.id]);
          reports = repRes.rows.map(row => ({
            id: row.id,
            companyId: row.company_id,
            ticker: t,
            fiscalYear: row.fiscal_year,
            periodType: row.period_type,
            periodEndDate: row.period_end_date,
            statementScope: row.statement_scope,
            publishedAt: row.published_at,
            sourceReference: row.source_reference,
            financialData: row.financial_data,
            revisionNumber: row.revision_number,
            createdAt: row.created_at,
          }));

          const pRes = await this.db.query('SELECT * FROM price_observations WHERE company_id = $1 ORDER BY observation_date DESC', [company.id]);
          prices = pRes.rows.map(row => ({
            id: row.id,
            companyId: row.company_id,
            ticker: t,
            price: Number(row.price),
            high52w: Number(row.high_52w),
            low52w: Number(row.low_52w),
            observationDate: row.observation_date,
            source: row.source,
            createdAt: row.created_at,
          }));
        }
      } catch (e) {
        // fallback
      }
    }

    if (!company) {
      company = this.companiesMap.get(t);
      if (!company) {
        throw new NotFoundException(`Company with ticker ${t} not found`);
      }
      reports = this.reportsMap.get(t) || [];
      prices = this.pricesMap.get(t) || [];
    }

    return { company, reports, prices };
  }

  async upsertCompany(data: { ticker: string; name: string; sector: string; description?: string }): Promise<Company> {
    const t = data.ticker.toUpperCase();
    const now = new Date().toISOString();

    if (this.db.getIsConnected()) {
      try {
        const res = await this.db.query(
          `INSERT INTO companies (id, ticker, name, sector, description, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (ticker) DO UPDATE SET name = $3, sector = $4, description = $5, updated_at = $7
           RETURNING *`,
          [t.toLowerCase(), t, data.name, data.sector, data.description || '', now, now]
        );
        const r = res.rows[0];
        return { id: r.id, ticker: r.ticker, name: r.name, sector: r.sector, description: r.description, createdAt: r.created_at, updatedAt: r.updated_at };
      } catch (e) {
        // fallback
      }
    }

    let comp = this.companiesMap.get(t);
    if (!comp) {
      comp = { id: t.toLowerCase(), ticker: t, name: data.name, sector: data.sector, description: data.description, createdAt: now, updatedAt: now };
      this.companiesMap.set(t, comp);
      if (!this.reportsMap.has(t)) this.reportsMap.set(t, []);
      if (!this.pricesMap.has(t)) this.pricesMap.set(t, []);
    } else {
      comp.name = data.name;
      comp.sector = data.sector;
      comp.description = data.description;
      comp.updatedAt = now;
    }
    return comp;
  }

  async addFinancialReport(ticker: string, reportData: {
    fiscalYear: number;
    periodType: 'FY' | 'H1';
    periodEndDate: string;
    statementScope?: 'CONSOLIDATED' | 'PARENT';
    publishedAt?: string;
    sourceReference?: string;
    financialData: any;
  }): Promise<FinancialReport> {
    const t = ticker.toUpperCase();
    const { company } = await this.findCompanyByTicker(t);

    const reports = this.reportsMap.get(t) || [];
    const existingIndex = reports.findIndex(r => r.fiscalYear === reportData.fiscalYear && r.periodType === reportData.periodType);
    const revisionNumber = existingIndex >= 0 ? reports[existingIndex].revisionNumber + 1 : 1;
    
    const newReport: FinancialReport = {
      id: `${t.toLowerCase()}-${reportData.fiscalYear}-${reportData.periodType.toLowerCase()}-rev${revisionNumber}`,
      companyId: company.id,
      ticker: t,
      fiscalYear: reportData.fiscalYear,
      periodType: reportData.periodType,
      periodEndDate: reportData.periodEndDate,
      statementScope: reportData.statementScope || 'CONSOLIDATED',
      publishedAt: reportData.publishedAt,
      sourceReference: reportData.sourceReference,
      financialData: reportData.financialData,
      revisionNumber,
      createdAt: new Date().toISOString(),
    };

    if (this.db.getIsConnected()) {
      try {
        await this.db.query(
          `INSERT INTO financial_reports (id, company_id, fiscal_year, period_type, period_end_date, statement_scope, published_at, source_reference, financial_data, revision_number, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            newReport.id, company.id, newReport.fiscalYear, newReport.periodType, newReport.periodEndDate,
            newReport.statementScope, newReport.publishedAt, newReport.sourceReference, JSON.stringify(newReport.financialData),
            newReport.revisionNumber, newReport.createdAt
          ]
        );
      } catch (e) {
        // fallback
      }
    }

    if (existingIndex >= 0) {
      reports[existingIndex] = newReport;
    } else {
      reports.push(newReport);
    }
    this.reportsMap.set(t, reports);

    return newReport;
  }

  async addPriceObservation(ticker: string, priceData: {
    price: number;
    high52w: number;
    low52w: number;
    observationDate: string;
    source?: string;
  }): Promise<PriceObservation> {
    const t = ticker.toUpperCase();
    const { company } = await this.findCompanyByTicker(t);

    const prices = this.pricesMap.get(t) || [];
    const newPrice: PriceObservation = {
      id: `${t.toLowerCase()}-price-${Date.now()}`,
      companyId: company.id,
      ticker: t,
      price: priceData.price,
      high52w: priceData.high52w,
      low52w: priceData.low52w,
      observationDate: priceData.observationDate || new Date().toISOString().split('T')[0],
      source: priceData.source || 'Manual Update',
      createdAt: new Date().toISOString(),
    };

    if (this.db.getIsConnected()) {
      try {
        await this.db.query(
          `INSERT INTO price_observations (id, company_id, price, high_52w, low_52w, observation_date, source, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [newPrice.id, company.id, newPrice.price, newPrice.high52w, newPrice.low52w, newPrice.observationDate, newPrice.source, newPrice.createdAt]
        );
      } catch (e) {
        // fallback
      }
    }

    prices.unshift(newPrice);
    this.pricesMap.set(t, prices);

    return newPrice;
  }
}
