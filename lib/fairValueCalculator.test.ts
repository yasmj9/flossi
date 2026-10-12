import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  calculateFutureEPS,
  calculateFutureStockPrice,
  calculateFairValue,
  calculateTargetBuyPrice,
  calculateDiscountToFairValue,
  calculateProjectedAnnualReturn,
  calculateFullFairValueAnalysis,
} from './fairValueCalculator';

describe('Fair Value & Margin of Safety Calculator Engine', () => {
  it('Formula A: correctly calculates Future EPS', () => {
    // Current EPS = 50 MAD, Growth = 10% (0.10), Years = 4
    // 50 * 1.10^4 = 50 * 1.4641 = 73.205 MAD
    const futureEps = calculateFutureEPS(50, 0.10, 4);
    assert.strictEqual(Math.round(futureEps * 1000) / 1000, 73.205);
  });

  it('Formula B: correctly calculates Future Stock Price', () => {
    // Future EPS = 73.205, Future P/E = 20
    // 73.205 * 20 = 1464.10 MAD
    const futurePrice = calculateFutureStockPrice(73.205, 20);
    assert.strictEqual(Math.round(futurePrice * 100) / 100, 1464.10);
  });

  it('Formula C: correctly calculates Fair Value Today (Discounted)', () => {
    // Future Price = 1464.10 MAD, Required Return = 10% (0.10), Years = 4
    // Fair Value = 1464.10 / (1.10^4) = 1464.10 / 1.4641 = 1000.00 MAD
    const { fairValuePure } = calculateFairValue(1464.10, 0.10, 4);
    assert.strictEqual(Math.round(fairValuePure * 100) / 100, 1000.00);
  });

  it('Formula C with dividends: discounts dividends and adds to fair value when selected', () => {
    // Fair Value Pure = 1000 MAD
    // Dividend = 20 MAD per year, r = 10%, n = 4
    // PV(div) = 20/1.1 + 20/1.1^2 + 20/1.1^3 + 20/1.1^4 = 18.1818 + 16.5289 + 15.0263 + 13.6603 = 63.397
    const result = calculateFairValue(1464.10, 0.10, 4, 20, true);
    assert.strictEqual(Math.round(result.fairValuePure * 100) / 100, 1000.00);
    assert.ok(result.fairValueWithDividends !== null);
    assert.strictEqual(Math.round(result.fairValueWithDividends * 100) / 100, 1063.40);
  });

  it('Formula D: correctly calculates Target Buy Price with Margin of Safety', () => {
    // Fair Value = 1000 MAD, Margin of Safety = 20% (0.20)
    // Target Buy Price = 1000 * (1 - 0.20) = 800 MAD
    const targetPrice = calculateTargetBuyPrice(1000, 0.20);
    assert.strictEqual(targetPrice, 800);
  });

  it('Formula E: correctly calculates Discount to Fair Value', () => {
    // Fair Value = 1000 MAD, Current Market Price = 700 MAD
    // Discount = ((1000 - 700) / 1000) * 100 = 30%
    const discount = calculateDiscountToFairValue(1000, 700);
    assert.strictEqual(discount, 30);

    // Overvalued case: Fair Value = 1000, Current Market Price = 1200 MAD
    // Discount = ((1000 - 1200) / 1000) * 100 = -20%
    const premium = calculateDiscountToFairValue(1000, 1200);
    assert.strictEqual(premium, -20);
  });

  it('Projected Annualized Return (CAGR) calculation', () => {
    // Current price = 700 MAD, Future price = 1464.10 MAD, Years = 4
    // (1464.10 / 700) ^ (1/4) - 1 = (2.09157)^(0.25) - 1 = 1.20258 - 1 = 20.26%
    const annualizedReturn = calculateProjectedAnnualReturn(700, 1464.10, 4);
    assert.ok(annualizedReturn !== null);
    assert.strictEqual(Math.round(annualizedReturn * 10) / 10, 20.3);
  });

  it('Full analysis handles Akdital test profile with deterministic results', () => {
    const analysis = calculateFullFairValueAnalysis({
      reportType: 'annual',
      statementScope: 'consolidated',
      currentStockPriceRaw: '715',
      manualEPSRaw: '23.8',
      calculatedEPSValue: 23.8,
      expectedGrowthRaw: '14.5',
      futurePeRatioRaw: '22',
      requiredReturnRateRaw: '10',
      desiredMarginOfSafetyRaw: '20',
      investmentHorizonYearsRaw: '4',
      dividendPerShareRaw: '12',
      manualFairValueRaw: '780',
      dividendMode: 'exclude',
    });

    assert.strictEqual(analysis.isCalculable, true);
    assert.strictEqual(analysis.missingInputs.length, 0);
    assert.ok(analysis.baseScenario !== null);
    assert.ok(analysis.conservativeScenario !== null);
    assert.ok(analysis.optimisticScenario !== null);

    // Akdital Base EPS = 23.8 MAD, g = 14.5%, n = 4
    // Future EPS = 23.8 * (1.145)^4 = 23.8 * 1.71887 = 40.909 MAD
    assert.strictEqual(Math.round(analysis.baseScenario.futureEPS * 10) / 10, 40.9);

    // Future Price = 40.909 * 22 = 899.998 MAD (~900 MAD)
    assert.strictEqual(Math.round(analysis.baseScenario.futureStockPrice), 900);

    // Fair Value = 900 / 1.10^4 = 900 / 1.4641 = 614.71 MAD
    assert.strictEqual(Math.round(analysis.baseScenario.fairValueMAD * 10) / 10, 614.7);

    // Target Buy Price with 20% margin = 614.71 * 0.8 = 491.77 MAD
    assert.strictEqual(Math.round(analysis.baseScenario.targetBuyPriceMAD * 10) / 10, 491.7);

    // Current price 715 is above Fair Value 614.7 => OVERVALUED status
    assert.strictEqual(analysis.valuationAttractiveness.status, 'OVERVALUED');

    // External Fair Value Comparison (Manual 780 vs Calculated 614.7)
    assert.ok(analysis.externalFairValueComparison.calculatedFairValueMAD !== null);
    assert.strictEqual(analysis.externalFairValueComparison.manualFairValueMAD, 780);
    assert.ok(analysis.externalFairValueComparison.differencePercent !== null);
  });

  it('Semi-annual report returns appropriate missing input block', () => {
    const analysis = calculateFullFairValueAnalysis({
      reportType: 'semiannual',
      statementScope: 'consolidated',
      currentStockPriceRaw: '715',
      manualEPSRaw: '11.9',
      calculatedEPSValue: 11.9,
      expectedGrowthRaw: '14.5',
      futurePeRatioRaw: '22',
      requiredReturnRateRaw: '10',
      desiredMarginOfSafetyRaw: '20',
      investmentHorizonYearsRaw: '4',
      dividendPerShareRaw: '12',
      manualFairValueRaw: '',
    });

    assert.strictEqual(analysis.isCalculable, false);
    assert.ok(analysis.missingInputs.some((m) => m.includes('semestriel')));
    assert.strictEqual(analysis.valuationAttractiveness.status, 'INSUFFICIENT_DATA');
  });

  it('Missing growth or future PE returns isCalculable = false', () => {
    const analysis = calculateFullFairValueAnalysis({
      reportType: 'annual',
      statementScope: 'consolidated',
      currentStockPriceRaw: '715',
      manualEPSRaw: '23.8',
      calculatedEPSValue: 23.8,
      expectedGrowthRaw: '',
      futurePeRatioRaw: '',
      requiredReturnRateRaw: '10',
      desiredMarginOfSafetyRaw: '20',
      investmentHorizonYearsRaw: '4',
      dividendPerShareRaw: '',
      manualFairValueRaw: '',
    });

    assert.strictEqual(analysis.isCalculable, false);
    assert.ok(analysis.missingInputs.length >= 2);
  });
});
