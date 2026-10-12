import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  computeCompanyQualityScore,
  computeBuyThisMonthScore,
  computeInvestmentDecision,
} from './confidenceScoringEngine';
import { computeFundamentalAnalysis } from './financialMath';
import { calculateFullFairValueAnalysis } from './fairValueCalculator';
import { performShariahScreening } from './shariahScreening';
import { DEFAULT_CHECKLIST_DATA } from './storage';
import { FinancialChecklistData } from './types';

// Données d'exemple Akdital SA (Cliniques privées, Bourse de Casablanca)
const AKDITAL_MOCK_DATA: FinancialChecklistData = {
  ...DEFAULT_CHECKLIST_DATA,
  stockInfo: {
    ...DEFAULT_CHECKLIST_DATA.stockInfo,
    companyName: 'Akdital SA',
    ticker: 'AKT',
    sector: 'Santé & pharmacie',
    currentPrice: '620',
    price52wLow: '480',
    price52wHigh: '720',
    eps: '30.74',
    sharesOutstanding: '8400000',
    dividendPerShare: '12.0',
  },
  periodInfo: {
    ...DEFAULT_CHECKLIST_DATA.periodInfo,
    financialYear: '2023',
    reportType: 'annual',
    statementScope: 'consolidated',
    unit: 'millions',
  },
  growth: {
    years: [
      { year: '2021', revenue: '780', netProfit: '90', netProfitGroupShare: '85' },
      { year: '2022', revenue: '1040', netProfit: '130', netProfitGroupShare: '125' },
      { year: '2023', revenue: '1907', netProfit: '265', netProfitGroupShare: '258' },
    ],
  },
  profitability: {
    operatingProfit: '430',
    ebitda: '511',
    equity: '1500',
    equityGroupShare: '1420',
    roe: '18.17',
    operatingMargin: '22.55',
    netMargin: '13.9',
  },
  debtStability: {
    totalFinancialDebt: '1050',
    interestBearingDebt: '950',
    cashAndEquivalents: '420',
    netDebt: '630',
    interestExpense: '55',
    totalAssets: '3800',
  },
  cashFlow: {
    operatingCashFlow: '480',
    capex: '890', // Expansion CapEx
    freeCashFlow: '-410',
  },
  valuation: {
    expectedEarningsGrowth: '12',
    futurePeRatio: '20',
    requiredReturnRate: '10',
    manualFairValue: '',
    desiredMarginOfSafety: '20',
    investmentHorizonYears: '4',
    dividendMode: 'exclude',
  },
  shariah: {
    ...DEFAULT_CHECKLIST_DATA.shariah,
    businessActivity: 'Services de santé et cliniques privées pluridisciplinaires',
    methodology: 'AAOIFI',
    activityChecklist: {
      isPrimaryActivityPermissible: 'yes',
      operatesConventionalBanking: 'no',
      operatesConventionalInsurance: 'no',
      generatesGamblingRevenue: 'no',
      generatesAlcoholRevenue: 'no',
      operatesOtherProhibited: 'no',
      hasMixedActivitiesRequiringAnalysis: 'no',
    },
    interestBearingDebt: '950',
    totalAssets: '3800',
    marketCap: '5208',
    cashAndInterestSecurities: '420',
    interestIncome: '0',
    nonPermissibleIncome: '0',
    totalRevenue: '1907',
    receivables: '580',
    isInterestIncomeUnbundled: true,
  },
};

describe('Confidence Scoring Engine — Tests Unitaires', () => {
  it('calcule un Company Quality Score élevé pour un profil de croissance soutenu (Akdital)', () => {
    const analysis = computeFundamentalAnalysis(AKDITAL_MOCK_DATA);
    const qualityResult = computeCompanyQualityScore(AKDITAL_MOCK_DATA, analysis);

    assert.ok(qualityResult.totalScore >= 70, `Score attendu >= 70, obtenu: ${qualityResult.totalScore}`);
    assert.strictEqual(qualityResult.isCustomCalibrated, true);
    assert.strictEqual(qualityResult.sectorName, 'Santé & pharmacie');

    // Vérifier les 4 catégories
    assert.ok(qualityResult.categories.growth.totalPoints > 15, 'Points de croissance élevés');
    assert.ok(qualityResult.categories.profitability.totalPoints > 15, 'Points de rentabilité élevés');
    assert.ok(qualityResult.categories.debt.totalPoints > 10, 'Points de dette');
    assert.ok(qualityResult.categories.cashFlow.totalPoints > 10, 'Points de cash flow avec CapEx expansion');
  });

  it('génère un Company Quality Score faible (< 40) pour une entreprise déficitaire et surendettée', () => {
    const weakData: FinancialChecklistData = {
      ...AKDITAL_MOCK_DATA,
      growth: {
        years: [
          { year: '2021', revenue: '500', netProfit: '30', netProfitGroupShare: '30' },
          { year: '2022', revenue: '450', netProfit: '-20', netProfitGroupShare: '-20' },
          { year: '2023', revenue: '380', netProfit: '-60', netProfitGroupShare: '-60' },
        ],
      },
      profitability: {
        operatingProfit: '-40',
        ebitda: '-10',
        equity: '100',
        equityGroupShare: '100',
        roe: '-60',
        operatingMargin: '-10.5',
        netMargin: '-15.8',
      },
      debtStability: {
        totalFinancialDebt: '800',
        interestBearingDebt: '800',
        cashAndEquivalents: '20',
        netDebt: '780',
        interestExpense: '70',
        totalAssets: '900',
      },
      cashFlow: {
        operatingCashFlow: '-80',
        capex: '50',
        freeCashFlow: '-130',
      },
    };

    const analysis = computeFundamentalAnalysis(weakData);
    const qualityResult = computeCompanyQualityScore(weakData, analysis);

    assert.ok(qualityResult.totalScore < 40, `Score attendu < 40, obtenu: ${qualityResult.totalScore}`);
    assert.ok(qualityResult.level === 'WEAK' || qualityResult.level === 'CRITICAL');
    assert.ok(qualityResult.riskWarnings.length > 0, 'Présence d’avertissements de risque');
  });

  it('bloque formellement la recommandation d’achat si le filtrage Shariah échoue (FAIL)', () => {
    const haramData: FinancialChecklistData = {
      ...AKDITAL_MOCK_DATA,
      shariah: {
        ...AKDITAL_MOCK_DATA.shariah,
        activityChecklist: {
          ...AKDITAL_MOCK_DATA.shariah.activityChecklist,
          operatesConventionalBanking: 'yes', // Banque à intérêt
        },
      },
    };

    const analysis = computeFundamentalAnalysis(haramData);
    const qualityResult = computeCompanyQualityScore(haramData, analysis);
    const fairValueResult = calculateFullFairValueAnalysis({
      reportType: haramData.periodInfo.reportType,
      statementScope: haramData.periodInfo.statementScope,
      currentStockPriceRaw: haramData.stockInfo.currentPrice,
      manualEPSRaw: haramData.stockInfo.eps,
      calculatedEPSValue: analysis.profitability.calculatedEPS.value,
      expectedGrowthRaw: haramData.valuation.expectedEarningsGrowth,
      futurePeRatioRaw: haramData.valuation.futurePeRatio,
      requiredReturnRateRaw: haramData.valuation.requiredReturnRate,
      desiredMarginOfSafetyRaw: haramData.valuation.desiredMarginOfSafety,
      investmentHorizonYearsRaw: haramData.valuation.investmentHorizonYears,
      dividendPerShareRaw: haramData.stockInfo.dividendPerShare,
      manualFairValueRaw: '',
      dividendMode: 'exclude',
    });
    const shariahReport = performShariahScreening(haramData, haramData.shariah.methodology);

    assert.strictEqual(shariahReport.verdict, 'FAILED');

    const buyMonthResult = computeBuyThisMonthScore(haramData, qualityResult, fairValueResult, shariahReport);
    assert.strictEqual(buyMonthResult.isBlockedByShariah, true);
    assert.strictEqual(buyMonthResult.totalScore, 0, 'Score d’achat doit être forcé à 0 si Shariah échoue');

    const report = computeInvestmentDecision(qualityResult, buyMonthResult, fairValueResult, shariahReport, haramData);
    assert.strictEqual(report.decision.type, 'AVOID');
    assert.ok(report.decision.title.includes('SHARIAH'), 'Le titre de décision doit mentionner Shariah');
  });

  it('place la décision en WAIT si le filtrage Shariah est incomplet (REVIEW_REQUIRED)', () => {
    const reviewData: FinancialChecklistData = {
      ...AKDITAL_MOCK_DATA,
      shariah: {
        ...AKDITAL_MOCK_DATA.shariah,
        activityChecklist: {
          ...AKDITAL_MOCK_DATA.shariah.activityChecklist,
          isPrimaryActivityPermissible: 'unknown',
        },
      },
    };

    const analysis = computeFundamentalAnalysis(reviewData);
    const qualityResult = computeCompanyQualityScore(reviewData, analysis);
    const fairValueResult = calculateFullFairValueAnalysis({
      reportType: reviewData.periodInfo.reportType,
      statementScope: reviewData.periodInfo.statementScope,
      currentStockPriceRaw: reviewData.stockInfo.currentPrice,
      manualEPSRaw: reviewData.stockInfo.eps,
      calculatedEPSValue: analysis.profitability.calculatedEPS.value,
      expectedGrowthRaw: reviewData.valuation.expectedEarningsGrowth,
      futurePeRatioRaw: reviewData.valuation.futurePeRatio,
      requiredReturnRateRaw: reviewData.valuation.requiredReturnRate,
      desiredMarginOfSafetyRaw: reviewData.valuation.desiredMarginOfSafety,
      investmentHorizonYearsRaw: reviewData.valuation.investmentHorizonYears,
      dividendPerShareRaw: reviewData.stockInfo.dividendPerShare,
      manualFairValueRaw: '',
      dividendMode: 'exclude',
    });
    const shariahReport = performShariahScreening(reviewData, reviewData.shariah.methodology);

    assert.strictEqual(shariahReport.verdict, 'REVIEW_REQUIRED');

    const buyMonthResult = computeBuyThisMonthScore(reviewData, qualityResult, fairValueResult, shariahReport);
    assert.strictEqual(buyMonthResult.isPendingShariah, true);

    const report = computeInvestmentDecision(qualityResult, buyMonthResult, fairValueResult, shariahReport, reviewData);
    assert.strictEqual(report.decision.type, 'WAIT');
    assert.ok(report.decision.title.includes('SHARIAH') || report.decision.headline.includes('Shariah'));
  });

  it('génère BUY_CANDIDATE quand la qualité est forte, Shariah conforme et le cours offre une marge de sécurité', () => {
    // Si le cours est à 450 MAD (alors que la juste valeur est ~614 MAD et le target price ~491 MAD)
    const cheapData: FinancialChecklistData = {
      ...AKDITAL_MOCK_DATA,
      stockInfo: {
        ...AKDITAL_MOCK_DATA.stockInfo,
        currentPrice: '450', // Inférieur au prix cible de 491 MAD
      },
    };

    const analysis = computeFundamentalAnalysis(cheapData);
    const qualityResult = computeCompanyQualityScore(cheapData, analysis);
    const fairValueResult = calculateFullFairValueAnalysis({
      reportType: cheapData.periodInfo.reportType,
      statementScope: cheapData.periodInfo.statementScope,
      currentStockPriceRaw: cheapData.stockInfo.currentPrice,
      manualEPSRaw: cheapData.stockInfo.eps,
      calculatedEPSValue: analysis.profitability.calculatedEPS.value,
      expectedGrowthRaw: cheapData.valuation.expectedEarningsGrowth,
      futurePeRatioRaw: cheapData.valuation.futurePeRatio,
      requiredReturnRateRaw: cheapData.valuation.requiredReturnRate,
      desiredMarginOfSafetyRaw: cheapData.valuation.desiredMarginOfSafety,
      investmentHorizonYearsRaw: cheapData.valuation.investmentHorizonYears,
      dividendPerShareRaw: cheapData.stockInfo.dividendPerShare,
      manualFairValueRaw: '',
      dividendMode: 'exclude',
    });
    const shariahReport = performShariahScreening(cheapData, cheapData.shariah.methodology);

    const buyMonthResult = computeBuyThisMonthScore(cheapData, qualityResult, fairValueResult, shariahReport);
    assert.ok(buyMonthResult.totalScore >= 65, `Buy score attendu >= 65, obtenu: ${buyMonthResult.totalScore}`);

    const report = computeInvestmentDecision(qualityResult, buyMonthResult, fairValueResult, shariahReport, cheapData);
    assert.strictEqual(report.decision.type, 'BUY_CANDIDATE');
  });

  it('retourne INSUFFICIENT_DATA si des champs critiques sont absents', () => {
    const emptyData: FinancialChecklistData = {
      ...DEFAULT_CHECKLIST_DATA,
      stockInfo: {
        ...DEFAULT_CHECKLIST_DATA.stockInfo,
        companyName: '',
        currentPrice: '',
      },
    };

    const analysis = computeFundamentalAnalysis(emptyData);
    const qualityResult = computeCompanyQualityScore(emptyData, analysis);
    const fairValueResult = calculateFullFairValueAnalysis({
      reportType: emptyData.periodInfo.reportType,
      statementScope: emptyData.periodInfo.statementScope,
      currentStockPriceRaw: '',
      manualEPSRaw: '',
      calculatedEPSValue: null,
      expectedGrowthRaw: '',
      futurePeRatioRaw: '',
      requiredReturnRateRaw: '',
      desiredMarginOfSafetyRaw: '',
      investmentHorizonYearsRaw: '',
      dividendPerShareRaw: '',
      manualFairValueRaw: '',
      dividendMode: 'exclude',
    });
    const shariahReport = performShariahScreening(emptyData, emptyData.shariah.methodology);

    const buyMonthResult = computeBuyThisMonthScore(emptyData, qualityResult, fairValueResult, shariahReport);
    const report = computeInvestmentDecision(qualityResult, buyMonthResult, fairValueResult, shariahReport, emptyData);

    assert.strictEqual(report.decision.type, 'INSUFFICIENT_DATA');
    assert.strictEqual(report.dataQuality.isSufficientForDecision, false);
  });
});
