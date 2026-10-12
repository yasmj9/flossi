import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  calculateYoYGrowth,
  calculateCAGR,
  calculateEPS,
  calculateOperatingMargin,
  calculateNetMargin,
  calculateROE,
  calculatePER,
  calculatePBR,
  calculateDividendYield,
  calculatePayoutRatio,
  calculate52WeekPosition,
  calculateNetDebt,
  calculateNetDebtToEbitda,
  calculateFreeCashFlow,
  calculateCashConversion,
  compareDiscrepancy,
  computeFundamentalAnalysis,
} from './financialMath';
import { DEFAULT_CHECKLIST_DATA } from './storage';
import { FinancialChecklistData } from './types';

describe('Financial Math Calculation Engine', () => {
  describe('YoY Growth', () => {
    it('calculates positive revenue growth correctly', () => {
      // 100M -> 130M => +30%
      const res = calculateYoYGrowth(130, 100);
      assert.strictEqual(res.isSignificant, true);
      assert.strictEqual(res.rate, 30);
      assert.strictEqual(res.absoluteDiff, 30);
    });

    it('calculates negative revenue growth correctly', () => {
      // 100M -> 80M => -20%
      const res = calculateYoYGrowth(80, 100);
      assert.strictEqual(res.isSignificant, true);
      assert.strictEqual(res.rate, -20);
      assert.strictEqual(res.absoluteDiff, -20);
    });

    it('handles negative base N-1 earnings as non-significant percentage', () => {
      // -50M -> +10M
      const res = calculateYoYGrowth(10, -50);
      assert.strictEqual(res.isSignificant, false);
      assert.strictEqual(res.rate, null);
      assert.strictEqual(res.absoluteDiff, 60);
    });

    it('handles zero base N-1 as non-significant percentage', () => {
      const res = calculateYoYGrowth(15, 0);
      assert.strictEqual(res.isSignificant, false);
      assert.strictEqual(res.rate, null);
      assert.strictEqual(res.absoluteDiff, 15);
    });

    it('handles missing values gracefully', () => {
      const res = calculateYoYGrowth(null, 100);
      assert.strictEqual(res.rate, null);
    });
  });

  describe('CAGR Calculation', () => {
    it('uses correct 2 intervals for 3 consecutive years', () => {
      // 100 to 144 over 2 intervals: sqrt(144/100) - 1 = 1.2 - 1 = +20%
      const res = calculateCAGR(100, 144, 2);
      assert.strictEqual(res.isSignificant, true);
      assert.strictEqual(res.intervals, 2);
      assert.ok(res.rate !== null && Math.abs(res.rate - 20) < 0.001);
    });

    it('marks CAGR non-significant when base or end value is negative', () => {
      const res = calculateCAGR(-10, 50, 2);
      assert.strictEqual(res.isSignificant, false);
      assert.strictEqual(res.rate, null);
    });
  });

  describe('EPS and Profitability', () => {
    it('calculates EPS from net profit in MAD and outstanding shares', () => {
      // 100M MAD and 10M shares => 10 MAD
      const res = calculateEPS(100_000_000, 10_000_000);
      assert.strictEqual(res.value, 10);
    });

    it('calculates operating and net margins', () => {
      const opMargin = calculateOperatingMargin(250, 1000);
      assert.strictEqual(opMargin, 25);

      const netMargin = calculateNetMargin(120, 1000);
      assert.strictEqual(netMargin, 12);
    });

    it('calculates ROE with closing equity approximation', () => {
      // 180M profit on 1200M equity = 15%
      const res = calculateROE(180_000_000, 1_200_000_000);
      assert.strictEqual(res.value, 15);
      assert.strictEqual(res.isApproximation, true);
    });

    it('rejects ROE on negative equity', () => {
      const res = calculateROE(10_000_000, -50_000_000);
      assert.strictEqual(res.value, null);
    });
  });

  describe('Valuation Ratios', () => {
    it('calculates PER when price and annual EPS are positive', () => {
      // Price 720 MAD, EPS 24 MAD => 30x
      const res = calculatePER(720, 24, 'annual');
      assert.strictEqual(res.isSignificant, true);
      assert.strictEqual(res.value, 30);
    });

    it('blocks annual PER on semiannual reports without silent annualization', () => {
      const res = calculatePER(720, 12, 'semiannual');
      assert.strictEqual(res.isSignificant, false);
      assert.strictEqual(res.value, null);
      assert.ok(res.note?.includes('rapport semestriel'));
    });

    it('marks PER non-significant on negative EPS', () => {
      const res = calculatePER(500, -10, 'annual');
      assert.strictEqual(res.isSignificant, false);
      assert.strictEqual(res.value, null);
    });

    it('calculates PBR and book value per share', () => {
      // Price 720 MAD, Equity 779.4M MAD, Shares 4.33M => BVPS = 180 MAD => PBR = 4.0x
      const res = calculatePBR(720, 779_400_000, 4_330_000);
      assert.strictEqual(res.isSignificant, true);
      assert.ok(res.bookValuePerShare !== null && Math.abs(res.bookValuePerShare - 180) < 0.01);
      assert.ok(res.value !== null && Math.abs(res.value - 4) < 0.01);
    });

    it('calculates dividend yield and payout ratio', () => {
      // DPS 12 MAD, Price 600 MAD => 2%
      const yieldRes = calculateDividendYield(12, 600);
      assert.strictEqual(yieldRes, 2);

      // DPS 12 MAD, EPS 24 MAD => 50%
      const payoutRes = calculatePayoutRatio(12, 24);
      assert.strictEqual(payoutRes.isApplicable, true);
      assert.strictEqual(payoutRes.value, 50);
    });

    it('rejects payout ratio on negative earnings', () => {
      const payoutRes = calculatePayoutRatio(10, -5);
      assert.strictEqual(payoutRes.isApplicable, false);
    });

    it('calculates 52-week price position and includes disclaimer', () => {
      // Low: 700, High: 1100, Current: 800 => (800-700)/400 = 25%
      const res = calculate52WeekPosition(800, 700, 1100);
      assert.strictEqual(res.value, 25);
      assert.ok(res.note.includes('historique'));
    });
  });

  describe('Debt and Stability', () => {
    it('calculates net debt by deducting cash from interest-bearing debt', () => {
      // Interest debt 1400, Cash 320 => Net Debt 1080
      const res = calculateNetDebt(1400, 1450, 320);
      assert.strictEqual(res.valueMAD, 1080);
      assert.strictEqual(res.usedInterestBearing, true);
    });

    it('calculates Net Debt / EBITDA on annual report', () => {
      const res = calculateNetDebtToEbitda(1000, 500, 'annual');
      assert.strictEqual(res.isApplicable, true);
      assert.strictEqual(res.value, 2);
    });

    it('blocks Net Debt / EBITDA on semiannual report without warning', () => {
      const res = calculateNetDebtToEbitda(1000, 250, 'semiannual');
      assert.strictEqual(res.isApplicable, false);
      assert.strictEqual(res.value, null);
    });
  });

  describe('Cash Flow & CapEx sign normalization', () => {
    it('correctly normalizes negative CapEx input to calculate positive FCF', () => {
      // Operating cash flow 480M, user enters CapEx as -350M (negative sign from statement)
      const res = calculateFreeCashFlow(480, -350);
      assert.strictEqual(res.normalizedCapexMAD, 350);
      assert.strictEqual(res.valueMAD, 130);
    });

    it('correctly calculates FCF when CapEx is entered as positive number', () => {
      const res = calculateFreeCashFlow(480, 350);
      assert.strictEqual(res.normalizedCapexMAD, 350);
      assert.strictEqual(res.valueMAD, 130);
    });

    it('calculates cash conversion ratio', () => {
      // OCF 480, Net Income 240 => 200%
      const res = calculateCashConversion(480, 240);
      assert.strictEqual(res.isApplicable, true);
      assert.strictEqual(res.value, 200);
    });

    it('flags cash conversion on negative net income', () => {
      const res = calculateCashConversion(100, -20);
      assert.strictEqual(res.isApplicable, false);
    });
  });

  describe('Discrepancy detection (Manual vs Calculated)', () => {
    it('flags noticeable discrepancy above 5%', () => {
      const res = compareDiscrepancy(20, 25, 'PER');
      assert.strictEqual(res.hasDiscrepancy, true);
      assert.strictEqual(res.diffPercent, 25);
    });

    it('does not flag negligible difference under 5%', () => {
      const res = compareDiscrepancy(100, 102, 'BPA');
      assert.strictEqual(res.hasDiscrepancy, false);
    });
  });

  describe('Global model integration with Akdital sample data', () => {
    it('processes complete company data into analysis structure', () => {
      const mockData: FinancialChecklistData = {
        ...DEFAULT_CHECKLIST_DATA,
        periodInfo: {
          ...DEFAULT_CHECKLIST_DATA.periodInfo,
          unit: 'millions',
          reportType: 'annual',
        },
        stockInfo: {
          ...DEFAULT_CHECKLIST_DATA.stockInfo,
          currentPrice: '715',
          price52wLow: '490',
          price52wHigh: '745',
          sharesOutstanding: '4331000',
          dividendPerShare: '12',
          eps: '23.8',
        },
        growth: {
          years: [
            { year: '2021', revenue: '774', netProfit: '102', netProfitGroupShare: '98' },
            { year: '2022', revenue: '1036', netProfit: '128', netProfitGroupShare: '121' },
            { year: '2023', revenue: '1907', netProfit: '211', netProfitGroupShare: '198' },
          ],
        },
        profitability: {
          operatingProfit: '286',
          ebitda: '511',
          equity: '1220',
          equityGroupShare: '1150',
          roe: '',
          operatingMargin: '',
          netMargin: '',
        },
        debtStability: {
          totalFinancialDebt: '1450',
          interestBearingDebt: '1380',
          cashAndEquivalents: '335',
          netDebt: '',
          interestExpense: '72',
          totalAssets: '4620',
        },
        cashFlow: {
          operatingCashFlow: '445',
          capex: '380',
          freeCashFlow: '',
        },
      };

      const analysis = computeFundamentalAnalysis(mockData);

      // Vérification croissance
      assert.strictEqual(analysis.growth.revenueYoY.length, 2);
      assert.ok(analysis.growth.revenueCAGR.rate !== null && analysis.growth.revenueCAGR.rate > 0);

      // Vérification rentabilité
      assert.ok(analysis.profitability.calculatedEPS.value !== null);
      assert.ok(analysis.profitability.operatingMargin !== null);

      // FCF calculé : 445M - 380M = 65M MAD
      assert.strictEqual(analysis.cashFlow.fcf.valueMAD, 65_000_000);

      // Complétude : au moins 14 indicateurs calculables
      assert.ok(analysis.completeness.calculableCount >= 14);
    });
  });
});
