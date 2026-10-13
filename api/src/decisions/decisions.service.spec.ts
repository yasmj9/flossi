import { DecisionsService } from './decisions.service';

describe('DecisionsService (Feature 10)', () => {
  let service: DecisionsService;
  let mockDb: any;
  let mockCompanies: any;
  let mockPortfolio: any;

  beforeEach(() => {
    mockDb = {
      getIsConnected: () => false,
      query: async () => ({ rows: [] }),
    };

    mockCompanies = {
      findAllCompanies: async () => [
        { id: 'akt', ticker: 'AKT', name: 'Akdital', sector: 'Santé & pharmacie' },
        { id: 'mng', ticker: 'MNG', name: 'Managem', sector: 'Mines & métaux' },
      ],
      findCompanyByTicker: async (ticker: string) => ({
        company: { id: ticker.toLowerCase(), ticker, name: ticker, sector: 'Santé' },
        reports: [],
        prices: [{ price: 900, observationDate: new Date().toISOString().split('T')[0] }],
      }),
    };

    mockPortfolio = {
      getPortfolioSummary: async () => ({
        summary: {
          stockMarketValue: 10000,
          availableCash: 4800,
          totalPortfolioValue: 14800,
          investedCapital: 9000,
          unrealizedGainMAD: 1000,
          unrealizedGainPercent: 11.1,
          realizedGainMAD: 200,
          netDividendsReceived: 150,
          monthlyContributionTarget: 4000,
        },
        holdings: [
          {
            ticker: 'AKT',
            companyName: 'Akdital',
            sector: 'Santé & pharmacie',
            sharesOwned: 10,
            totalInvested: 8500,
            averageCostPrice: 850,
            currentStockPrice: 900,
            currentMarketValue: 9000,
            unrealizedGainMAD: 500,
            unrealizedGainPercent: 5.88,
          },
        ],
        sectorAllocations: [
          { sector: 'Santé & pharmacie', targetPercent: 15, currentMarketValue: 9000, currentPercent: 90, differencePercent: 75 },
          { sector: 'Mines & métaux', targetPercent: 15, currentMarketValue: 0, currentPercent: 0, differencePercent: -15 },
        ],
      }),
    };

    service = new DecisionsService(mockDb, mockCompanies, mockPortfolio);
  });

  it('should classify high-quality undervalued non-owned stock as BUY_CANDIDATE', async () => {
    const clientCompanies = [
      {
        ticker: 'MNG',
        companyName: 'Managem',
        sector: 'Mines & métaux',
        currentPrice: 2000,
        estimatedFairValue: 2500,
        targetBuyPrice: 2200,
        qualityScore: 85,
        buyMonthScore: 78,
        dataReliabilityScore: 85,
        shariahVerdict: 'PASSED',
      },
    ];

    const report = await service.evaluateMonthlyDecisions(undefined, clientCompanies);
    const mng = report.buyCandidates.find((c) => c.ticker === 'MNG');
    expect(mng).toBeDefined();
    expect(mng?.decision).toBe('BUY_CANDIDATE');
    expect(mng?.discountToFairValuePercent).toBeGreaterThanOrEqual(15);
  });

  it('should classify high-quality overvalued non-owned stock as WAIT', async () => {
    const clientCompanies = [
      {
        ticker: 'EXP',
        companyName: 'Expensive Corp',
        sector: 'Technologie',
        currentPrice: 1500,
        estimatedFairValue: 1200,
        targetBuyPrice: 1000,
        qualityScore: 88,
        buyMonthScore: 40,
        dataReliabilityScore: 85,
        shariahVerdict: 'PASSED',
      },
    ];

    const report = await service.evaluateMonthlyDecisions(undefined, clientCompanies);
    const exp = report.waitList.find((c) => c.ticker === 'EXP');
    expect(exp).toBeDefined();
    expect(exp?.decision).toBe('WAIT');
  });

  it('should NOT automatically sell an existing holding with low buy score (HOLD instead of SELL)', async () => {
    const clientCompanies = [
      {
        ticker: 'AKT', // Already owned in mockPortfolio
        companyName: 'Akdital',
        sector: 'Santé & pharmacie',
        currentPrice: 950,
        estimatedFairValue: 920,
        targetBuyPrice: 800,
        qualityScore: 75,
        buyMonthScore: 45, // Low buy score
        dataReliabilityScore: 80,
        shariahVerdict: 'PASSED',
      },
    ];

    const report = await service.evaluateMonthlyDecisions(undefined, clientCompanies);
    const akt = report.holdingsReview.find((c) => c.ticker === 'AKT');
    expect(akt).toBeDefined();
    expect(akt?.decision).toBe('HOLD');
  });

  it('should block non-compliant Shariah stocks as SHARIAH_NON_COMPLIANT', async () => {
    const clientCompanies = [
      {
        ticker: 'BNK',
        companyName: 'Conventional Bank',
        sector: 'Banque',
        currentPrice: 500,
        estimatedFairValue: 700,
        targetBuyPrice: 600,
        qualityScore: 90,
        buyMonthScore: 90,
        dataReliabilityScore: 90,
        shariahVerdict: 'FAILED',
      },
    ];

    const report = await service.evaluateMonthlyDecisions(undefined, clientCompanies);
    const bnk = report.blockedOrIneligible.find((c) => c.ticker === 'BNK');
    expect(bnk).toBeDefined();
    expect(bnk?.decision).toBe('SHARIAH_NON_COMPLIANT');
  });

  it('should respect available cash and suggest whole shares', async () => {
    const clientCompanies = [
      {
        ticker: 'MNG',
        companyName: 'Managem',
        sector: 'Mines & métaux',
        currentPrice: 2000,
        estimatedFairValue: 2600,
        targetBuyPrice: 2300,
        qualityScore: 85,
        buyMonthScore: 80,
        dataReliabilityScore: 85,
        shariahVerdict: 'PASSED',
      },
    ];

    const report = await service.evaluateMonthlyDecisions(undefined, clientCompanies);
    expect(report.suggestedPurchases.length).toBeGreaterThan(0);
    const suggestion = report.suggestedPurchases[0];
    expect(Number.isInteger(suggestion.recommendedShares)).toBe(true);
    expect(suggestion.totalOutflow).toBeLessThanOrEqual(report.portfolioSummary.availableCash);
  });
});
