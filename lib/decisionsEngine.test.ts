import { describe, it } from 'node:test';
import assert from 'node:assert';
import { evaluateMonthlyDecisionsEngine } from './decisionsEngine';

describe('Feature 10 — Intelligent Monthly Investment Decision Engine', () => {
  it('classifies high-quality undervalued non-owned stock as BUY_CANDIDATE', () => {
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
        priceObservationDate: new Date().toISOString().split('T')[0],
      },
    ];

    const report = evaluateMonthlyDecisionsEngine(undefined, clientCompanies);
    const mng = report.buyCandidates.find((c) => c.ticker === 'MNG');
    assert.ok(mng, 'MNG should be present in buyCandidates');
    assert.strictEqual(mng.decision, 'BUY_CANDIDATE');
    assert.ok(mng.discountToFairValuePercent >= 15, 'MNG should have positive discount');
    assert.strictEqual(mng.shariahVerdict, 'PASSED');
  });

  it('classifies high-quality overvalued non-owned stock as WAIT (no premature buy)', () => {
    const clientCompanies = [
      {
        ticker: 'EXP',
        companyName: 'Expensive Growth Corp',
        sector: 'Technologie',
        currentPrice: 1500,
        estimatedFairValue: 1200,
        targetBuyPrice: 1000,
        qualityScore: 88,
        buyMonthScore: 40,
        dataReliabilityScore: 85,
        shariahVerdict: 'PASSED',
        priceObservationDate: new Date().toISOString().split('T')[0],
      },
    ];

    const report = evaluateMonthlyDecisionsEngine(undefined, clientCompanies);
    const exp = report.waitList.find((c) => c.ticker === 'EXP');
    assert.ok(exp, 'EXP should be in waitList');
    assert.strictEqual(exp.decision, 'WAIT');
    assert.ok(exp.discountToFairValuePercent < 0, 'EXP discount is negative');
  });

  it('does NOT sell a healthy holding merely because the current buy score is low (HOLD)', () => {
    const balancedPortfolio = {
      summary: {
        stockMarketValue: 20000,
        availableCash: 4000,
        totalPortfolioValue: 24000,
        investedCapital: 18000,
        unrealizedGainMAD: 2000,
        unrealizedGainPercent: 11.1,
      },
      holdings: [
        {
          ticker: 'AKT',
          companyName: 'Akdital',
          sector: 'Santé & pharmacie',
          sharesOwned: 3,
          totalInvested: 3000,
          averageCostPrice: 1000,
          currentStockPrice: 1050,
          currentMarketValue: 3150, // 3150 / 24000 = 13.1% (< 25%)
          unrealizedGainMAD: 150,
          unrealizedGainPercent: 5,
        },
      ],
      sectorAllocations: [],
    };

    const clientCompanies = [
      {
        ticker: 'AKT',
        companyName: 'Akdital',
        sector: 'Santé & pharmacie',
        currentPrice: 1050,
        estimatedFairValue: 1000,
        targetBuyPrice: 850,
        qualityScore: 75,
        buyMonthScore: 42, // Low monthly buy score
        dataReliabilityScore: 80,
        shariahVerdict: 'PASSED',
        priceObservationDate: new Date().toISOString().split('T')[0],
      },
    ];

    const report = evaluateMonthlyDecisionsEngine(undefined, clientCompanies, balancedPortfolio);
    const akt = report.holdingsReview.find((c) => c.ticker === 'AKT');
    assert.ok(akt, 'AKT should be in holdingsReview');
    assert.strictEqual(akt.decision, 'HOLD');
    assert.ok(akt.reasons.some((r) => r.includes('justifie pleinement la conservation')));
  });

  it('flags holding with excessive concentration (> 25%) as REVIEW_REDUCE', () => {
    const concentratedPortfolio = {
      summary: {
        stockMarketValue: 10000,
        availableCash: 2000,
        totalPortfolioValue: 12000,
        investedCapital: 8000,
        unrealizedGainMAD: 2000,
        unrealizedGainPercent: 25,
      },
      holdings: [
        {
          ticker: 'AKT',
          companyName: 'Akdital',
          sector: 'Santé & pharmacie',
          sharesOwned: 8,
          totalInvested: 7000,
          averageCostPrice: 875,
          currentStockPrice: 1000,
          currentMarketValue: 8000, // 8000 / 12000 = 66.7% (> 25%)
          unrealizedGainMAD: 1000,
          unrealizedGainPercent: 14.3,
        },
      ],
      sectorAllocations: [],
    };

    const clientCompanies = [
      {
        ticker: 'AKT',
        companyName: 'Akdital',
        sector: 'Santé & pharmacie',
        currentPrice: 1000,
        estimatedFairValue: 1100,
        targetBuyPrice: 950,
        qualityScore: 80,
        buyMonthScore: 70,
        dataReliabilityScore: 85,
        shariahVerdict: 'PASSED',
        priceObservationDate: new Date().toISOString().split('T')[0],
      },
    ];

    const report = evaluateMonthlyDecisionsEngine(undefined, clientCompanies, concentratedPortfolio);
    const akt = report.holdingsReview.find((c) => c.ticker === 'AKT');
    assert.ok(akt);
    assert.strictEqual(akt.decision, 'REVIEW_REDUCE');
  });

  it('flags holding with severely deteriorated fundamentals as REVIEW_SELL', () => {
    const clientCompanies = [
      {
        ticker: 'AKT',
        companyName: 'Akdital',
        sector: 'Santé & pharmacie',
        currentPrice: 900,
        estimatedFairValue: 800,
        targetBuyPrice: 700,
        qualityScore: 38, // Severe deterioration (< 45)
        buyMonthScore: 30,
        dataReliabilityScore: 80,
        shariahVerdict: 'PASSED',
        priceObservationDate: new Date().toISOString().split('T')[0],
      },
    ];

    const report = evaluateMonthlyDecisionsEngine(undefined, clientCompanies);
    const akt = report.holdingsReview.find((c) => c.ticker === 'AKT');
    assert.ok(akt);
    assert.strictEqual(akt.decision, 'REVIEW_SELL');
  });

  it('strictly blocks Shariah non-compliant companies with SHARIAH_NON_COMPLIANT', () => {
    const clientCompanies = [
      {
        ticker: 'BNK',
        companyName: 'Banque Conventionnelle',
        sector: 'Banque',
        currentPrice: 500,
        estimatedFairValue: 700,
        targetBuyPrice: 600,
        qualityScore: 92,
        buyMonthScore: 90,
        dataReliabilityScore: 90,
        shariahVerdict: 'FAILED',
        priceObservationDate: new Date().toISOString().split('T')[0],
      },
    ];

    const report = evaluateMonthlyDecisionsEngine(undefined, clientCompanies);
    const bnk = report.blockedOrIneligible.find((c) => c.ticker === 'BNK');
    assert.ok(bnk);
    assert.strictEqual(bnk.decision, 'SHARIAH_NON_COMPLIANT');
    assert.ok(report.buyCandidates.every((c) => c.ticker !== 'BNK'));
  });

  it('marks companies with stale price observations (> 90 days) as INSUFFICIENT_DATA', () => {
    const oldDate = new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const clientCompanies = [
      {
        ticker: 'STALE',
        companyName: 'Stale Price SA',
        sector: 'Énergie',
        currentPrice: 100,
        priceObservationDate: oldDate,
        estimatedFairValue: 150,
        targetBuyPrice: 120,
        qualityScore: 80,
        buyMonthScore: 75,
        dataReliabilityScore: 80,
        shariahVerdict: 'PASSED',
      },
    ];

    const report = evaluateMonthlyDecisionsEngine(undefined, clientCompanies);
    const stale = report.blockedOrIneligible.find((c) => c.ticker === 'STALE');
    assert.ok(stale);
    assert.strictEqual(stale.decision, 'INSUFFICIENT_DATA');
    assert.strictEqual(stale.isPriceStale, true);
  });

  it('computes realistic monthly purchases: whole shares fitting available cash with fees', () => {
    const clientCompanies = [
      {
        ticker: 'MNG',
        companyName: 'Managem',
        sector: 'Mines & métaux',
        currentPrice: 2000,
        estimatedFairValue: 2600,
        targetBuyPrice: 2250,
        qualityScore: 85,
        buyMonthScore: 82,
        dataReliabilityScore: 85,
        shariahVerdict: 'PASSED',
        priceObservationDate: new Date().toISOString().split('T')[0],
      },
    ];

    const report = evaluateMonthlyDecisionsEngine(undefined, clientCompanies);
    assert.ok(report.suggestedPurchases.length > 0, 'Should have purchase suggestions');
    const first = report.suggestedPurchases[0];
    assert.ok(Number.isInteger(first.recommendedShares), 'Shares must be an integer');
    assert.ok(first.recommendedShares > 0, 'Shares must be > 0');
    assert.ok(first.totalOutflow <= report.portfolioSummary.availableCash, 'Outflow must not exceed available cash');
    assert.ok(first.estimatedFees > 0, 'Fees must be accounted for');
    assert.strictEqual(first.totalOutflow, first.totalCost + first.estimatedFees);
  });
});
