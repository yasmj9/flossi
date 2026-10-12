import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  evaluateBusinessActivity,
  performShariahScreening,
} from './shariahScreening';
import { DEFAULT_CHECKLIST_DATA } from './storage';
import { FinancialChecklistData, ShariahBusinessActivityChecklist } from './types';

describe('Shariah Compliance Screening Engine', () => {
  const cleanActivityChecklist: ShariahBusinessActivityChecklist = {
    isPrimaryActivityPermissible: 'yes',
    operatesConventionalBanking: 'no',
    operatesConventionalInsurance: 'no',
    generatesGamblingRevenue: 'no',
    generatesAlcoholRevenue: 'no',
    operatesOtherProhibited: 'no',
    hasMixedActivitiesRequiringAnalysis: 'no',
  };

  describe('Business Activity Screening', () => {
    it('passes when all core questions are permissible and description is provided', () => {
      const res = evaluateBusinessActivity(
        cleanActivityChecklist,
        'Santé et exploitation de cliniques médicales'
      );
      assert.strictEqual(res.status, 'PASS');
      assert.strictEqual(res.failedItems.length, 0);
    });

    it('fails when conventional banking is indicated', () => {
      const res = evaluateBusinessActivity(
        { ...cleanActivityChecklist, operatesConventionalBanking: 'yes' },
        'Services bancaires'
      );
      assert.strictEqual(res.status, 'FAIL');
      assert.ok(res.failedItems.some((f) => f.includes('bancaire')));
    });

    it('fails when alcohol revenue is generated', () => {
      const res = evaluateBusinessActivity(
        { ...cleanActivityChecklist, generatesAlcoholRevenue: 'yes' },
        'Boissons'
      );
      assert.strictEqual(res.status, 'FAIL');
    });

    it('requires review when any activity question is unknown', () => {
      const res = evaluateBusinessActivity(
        { ...cleanActivityChecklist, operatesConventionalBanking: 'unknown' },
        'Société financière'
      );
      assert.strictEqual(res.status, 'REVIEW_REQUIRED');
      assert.ok(res.unknownItems.length > 0);
    });

    it('requires review when business description is empty', () => {
      const res = evaluateBusinessActivity(cleanActivityChecklist, '');
      assert.strictEqual(res.status, 'REVIEW_REQUIRED');
    });
  });

  describe('Strict No-Riba Screening Methodology', () => {
    it('fails when company has confirmed interest-bearing debt', () => {
      const data: FinancialChecklistData = {
        ...DEFAULT_CHECKLIST_DATA,
        shariah: {
          ...DEFAULT_CHECKLIST_DATA.shariah,
          businessActivity: 'Distribution alimentaire',
          activityChecklist: cleanActivityChecklist,
          interestBearingDebt: '50',
          interestIncome: '0',
          totalRevenue: '500',
          totalAssets: '1000',
        },
      };

      const report = performShariahScreening(data, 'STRICT_NO_RIBA');
      assert.strictEqual(report.verdict, 'FAILED');
      const debtCrit = report.financialCriteria.find((c) => c.id === 'debt_strict');
      assert.strictEqual(debtCrit?.status, 'FAIL');
    });

    it('fails when company has interest income > 0 under strict policy', () => {
      const data: FinancialChecklistData = {
        ...DEFAULT_CHECKLIST_DATA,
        shariah: {
          ...DEFAULT_CHECKLIST_DATA.shariah,
          businessActivity: 'Distribution',
          activityChecklist: cleanActivityChecklist,
          interestBearingDebt: '0',
          interestIncome: '1.5',
          totalRevenue: '500',
          totalAssets: '1000',
        },
      };

      const report = performShariahScreening(data, 'STRICT_NO_RIBA');
      assert.strictEqual(report.verdict, 'FAILED');
      const incCrit = report.financialCriteria.find((c) => c.id === 'income_strict');
      assert.strictEqual(incCrit?.status, 'FAIL');
    });

    it('passes when debt=0, interest income=0 and business is halal', () => {
      const data: FinancialChecklistData = {
        ...DEFAULT_CHECKLIST_DATA,
        shariah: {
          ...DEFAULT_CHECKLIST_DATA.shariah,
          businessActivity: 'Technologie logicielle',
          activityChecklist: cleanActivityChecklist,
          interestBearingDebt: '0',
          interestIncome: '0',
          nonPermissibleIncome: '0',
          totalRevenue: '200',
          totalAssets: '500',
        },
      };

      const report = performShariahScreening(data, 'STRICT_NO_RIBA');
      assert.strictEqual(report.verdict, 'PASSED');
    });
  });

  describe('AAOIFI Methodology Screening', () => {
    it('passes when debt/assets < 30% and impure income < 5%', () => {
      const data: FinancialChecklistData = {
        ...DEFAULT_CHECKLIST_DATA,
        periodInfo: { ...DEFAULT_CHECKLIST_DATA.periodInfo, unit: 'millions' },
        shariah: {
          ...DEFAULT_CHECKLIST_DATA.shariah,
          businessActivity: 'Services de santé',
          activityChecklist: cleanActivityChecklist,
          interestBearingDebt: '250', // 250 / 1000 = 25% < 30%
          cashAndInterestSecurities: '150', // 150 / 1000 = 15% < 30%
          interestIncome: '2', // 2 / 200 = 1% < 5%
          nonPermissibleIncome: '0',
          totalRevenue: '200',
          totalAssets: '1000',
          receivables: '200',
        },
      };

      const report = performShariahScreening(data, 'AAOIFI');
      assert.strictEqual(report.verdict, 'PASSED');
    });

    it('fails when interest-bearing debt / assets >= 30%', () => {
      const data: FinancialChecklistData = {
        ...DEFAULT_CHECKLIST_DATA,
        periodInfo: { ...DEFAULT_CHECKLIST_DATA.periodInfo, unit: 'millions' },
        shariah: {
          ...DEFAULT_CHECKLIST_DATA.shariah,
          businessActivity: 'Services hospitaliers',
          activityChecklist: cleanActivityChecklist,
          interestBearingDebt: '350', // 350 / 1000 = 35% > 30%
          cashAndInterestSecurities: '100',
          interestIncome: '1',
          totalRevenue: '500',
          totalAssets: '1000',
        },
      };

      const report = performShariahScreening(data, 'AAOIFI');
      assert.strictEqual(report.verdict, 'FAILED');
      const debtCrit = report.financialCriteria.find((c) => c.id === 'debt_ratio');
      assert.strictEqual(debtCrit?.status, 'FAIL');
    });

    it('requires review when interest income is grouped without unbundling', () => {
      const data: FinancialChecklistData = {
        ...DEFAULT_CHECKLIST_DATA,
        periodInfo: { ...DEFAULT_CHECKLIST_DATA.periodInfo, unit: 'millions' },
        shariah: {
          ...DEFAULT_CHECKLIST_DATA.shariah,
          businessActivity: 'Santé',
          activityChecklist: cleanActivityChecklist,
          interestBearingDebt: '200',
          cashAndInterestSecurities: '100',
          interestIncome: '2',
          isInterestIncomeUnbundled: false, // grouped without ventilation
          totalRevenue: '500',
          totalAssets: '1000',
        },
      };

      const report = performShariahScreening(data, 'AAOIFI');
      assert.strictEqual(report.verdict, 'REVIEW_REQUIRED');
      assert.ok(report.missingInformation.some((m) => m.includes('Ventilation')));
    });

    it('never declares compliance when essential assets are missing', () => {
      const data: FinancialChecklistData = {
        ...DEFAULT_CHECKLIST_DATA,
        shariah: {
          ...DEFAULT_CHECKLIST_DATA.shariah,
          businessActivity: 'Santé',
          activityChecklist: cleanActivityChecklist,
          interestBearingDebt: '100',
          totalAssets: '', // missing
        },
      };

      const report = performShariahScreening(data, 'AAOIFI');
      assert.strictEqual(report.verdict, 'REVIEW_REQUIRED');
    });
  });

  describe('Akdital sample evaluation', () => {
    it('evaluates Akdital real figures with AAOIFI and Strict No-Riba', () => {
      // Akdital figures: Debt with interest ~1380M, Assets ~4620M => Debt ratio ~ 29.87% (< 30% AAOIFI)
      // Under Strict No-Riba: Debt > 0 => FAILED
      const akditalData: FinancialChecklistData = {
        ...DEFAULT_CHECKLIST_DATA,
        periodInfo: { ...DEFAULT_CHECKLIST_DATA.periodInfo, unit: 'millions' },
        shariah: {
          ...DEFAULT_CHECKLIST_DATA.shariah,
          businessActivity: 'Prestations de santé et soins hospitaliers privés',
          activityChecklist: cleanActivityChecklist,
          interestBearingDebt: '1380',
          cashAndInterestSecurities: '335',
          interestIncome: '1.2',
          nonPermissibleIncome: '0',
          totalRevenue: '1907',
          totalAssets: '4620',
          receivables: '460',
        },
      };

      // Strict No-Riba -> FAILED
      const strictReport = performShariahScreening(akditalData, 'STRICT_NO_RIBA');
      assert.strictEqual(strictReport.verdict, 'FAILED');

      // AAOIFI -> Ratio dette = 1380/4620 = 29.87% < 30% -> PASSED
      const aaoifiReport = performShariahScreening(akditalData, 'AAOIFI');
      const debtCrit = aaoifiReport.financialCriteria.find((c) => c.id === 'debt_ratio');
      assert.ok(debtCrit && debtCrit.ratioPercent !== null && debtCrit.ratioPercent < 30);
      assert.strictEqual(debtCrit?.status, 'PASS');
      assert.strictEqual(aaoifiReport.verdict, 'PASSED');
    });
  });
});
