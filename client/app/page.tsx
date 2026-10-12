'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
} from 'lucide-react';
import {
  FinancialChecklistData,
  FormValidationErrors,
  CurrencyUnit,
  ReportType,
  StatementScope,
  TriStateAnswer,
} from '@/lib/types';
import {
  loadChecklistData,
  saveChecklistData,
  clearChecklistData,
  validateForm,
  DEFAULT_CHECKLIST_DATA,
} from '@/lib/storage';
import { computeFundamentalAnalysis } from '@/lib/financialMath';
import { TOOLTIPS } from '@/lib/tooltips';
import { FormField } from '@/components/FormField';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { HeaderActions } from '@/components/HeaderActions';
import { SummaryCard } from '@/components/SummaryCard';
import { FundamentalAnalysisDashboard } from '@/components/FundamentalAnalysisDashboard';
import { ShariahScreeningSection } from '@/components/ShariahScreeningSection';
import { FairValueCalculatorSection } from '@/components/FairValueCalculatorSection';
import { InvestmentConfidenceSection } from '@/components/InvestmentConfidenceSection';
import { calculateFullFairValueAnalysis } from '@/lib/fairValueCalculator';
import {
  computeCompanyQualityScore,
  computeBuyThisMonthScore,
  computeInvestmentDecision,
} from '@/lib/confidenceScoringEngine';
import { performShariahScreening } from '@/lib/shariahScreening';
import { parseFinancialNumber } from '@/lib/financialMath';
import { Tooltip } from '@/components/Tooltip';

const SECTORS = [
  'Biens de consommation & agroalimentaire',
  'Santé & pharmacie',
  'Télécommunications',
  'Mines & métaux',
  'Ports & logistique',
  'Construction & matériaux',
  'Énergie',
  'Technologie',
  'Autre',
];

export default function Home() {
  const [data, setData] = useState<FinancialChecklistData>(DEFAULT_CHECKLIST_DATA);
  const [errors, setErrors] = useState<FormValidationErrors>({});
  const [toastMessage, setToastMessage] = useState<{
    text: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const analysis = useMemo(() => computeFundamentalAnalysis(data), [data]);

  const fairValueAnalysis = useMemo(
    () =>
      calculateFullFairValueAnalysis({
        reportType: data.periodInfo.reportType,
        statementScope: data.periodInfo.statementScope,
        currentStockPriceRaw: data.stockInfo.currentPrice,
        manualEPSRaw: data.stockInfo.eps,
        calculatedEPSValue: analysis.profitability.calculatedEPS.value,
        expectedGrowthRaw: data.valuation.expectedEarningsGrowth,
        futurePeRatioRaw: data.valuation.futurePeRatio,
        requiredReturnRateRaw: data.valuation.requiredReturnRate,
        desiredMarginOfSafetyRaw: data.valuation.desiredMarginOfSafety,
        investmentHorizonYearsRaw: data.valuation.investmentHorizonYears,
        dividendPerShareRaw: data.stockInfo.dividendPerShare,
        manualFairValueRaw: data.valuation.manualFairValue,
        dividendMode: data.valuation.dividendMode || 'exclude',
      }),
    [data, analysis.profitability.calculatedEPS.value]
  );

  const shariahReport = useMemo(
    () => performShariahScreening(data, data.shariah.methodology),
    [data]
  );

  const confidenceReport = useMemo(() => {
    const quality = computeCompanyQualityScore(data, analysis);
    const buyMonth = computeBuyThisMonthScore(data, quality, fairValueAnalysis, shariahReport);
    return computeInvestmentDecision(quality, buyMonth, fairValueAnalysis, shariahReport, data);
  }, [data, analysis, fairValueAnalysis, shariahReport]);

  const handleDividendModeChange = (mode: 'exclude' | 'include') => {
    setData((prev) => {
      const next = {
        ...prev,
        valuation: {
          ...prev.valuation,
          dividendMode: mode,
        },
      };
      saveChecklistData(next);
      return next;
    });
  };

  const handleValuationParamChange = (
    field:
      | 'expectedEarningsGrowth'
      | 'futurePeRatio'
      | 'requiredReturnRate'
      | 'desiredMarginOfSafety'
      | 'investmentHorizonYears',
    val: string
  ) => {
    handleFieldChange('valuation', field, val);
  };

  // Load from localStorage on client mount
  useEffect(() => {
    const timer = setTimeout(() => {
      const saved = loadChecklistData();
      setData(saved);
      setErrors(validateForm(saved));
      setIsLoaded(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // Show notification toast with auto-dismiss
  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage((prev) => (prev?.text === text ? null : prev));
    }, 4000);
  };

  const handleFieldChange = (section: keyof FinancialChecklistData, field: string, val: string) => {
    setData((prev) => {
      const sectionData = { ...(prev[section] as Record<string, unknown>) };
      sectionData[field] = val;
      const next = { ...prev, [section]: sectionData };
      setErrors(validateForm(next));
      return next;
    });
  };

  const handleGrowthYearChange = (index: number, field: string, val: string) => {
    setData((prev) => {
      const newYears = [...prev.growth.years];
      newYears[index] = { ...newYears[index], [field]: val };
      const next = { ...prev, growth: { years: newYears } };
      return next;
    });
  };

  const handleShariahFieldChange = (field: string, val: unknown) => {
    setData((prev) => {
      const next = {
        ...prev,
        shariah: {
          ...prev.shariah,
          [field]: val,
        },
      };
      saveChecklistData(next);
      return next;
    });
  };

  const handleActivityQuestionChange = (key: string, val: TriStateAnswer) => {
    setData((prev) => {
      const next = {
        ...prev,
        shariah: {
          ...prev.shariah,
          activityChecklist: {
            ...prev.shariah.activityChecklist,
            [key]: val,
          },
        },
      };
      saveChecklistData(next);
      return next;
    });
  };

  const handleSave = () => {
    const currentErrors = validateForm(data);
    setErrors(currentErrors);
    saveChecklistData(data);
    if (Object.keys(currentErrors).length > 0) {
      showToast('Données enregistrées (certaines anomalies de saisie sont signalées).', 'info');
    } else {
      showToast('Données enregistrées avec succès dans le navigateur.', 'success');
    }
  };

  const handleReset = () => {
    clearChecklistData();
    setData(DEFAULT_CHECKLIST_DATA);
    setErrors({});
    showToast('La checklist a été réinitialisée.', 'info');
  };

  const handleImport = (importedData: FinancialChecklistData) => {
    setData(importedData);
    setErrors(validateForm(importedData));
    saveChecklistData(importedData);
  };

  // Helper template for Akdital to quickly verify acceptance criteria
  const loadAkditalTemplate = () => {
    const akditalData: FinancialChecklistData = {
      periodInfo: {
        financialYear: '2023',
        reportType: 'annual',
        statementScope: 'consolidated',
        reportDate: '2024-04-30',
        sourceUrl: 'https://www.akdital.ma/investisseurs',
        unit: 'millions',
      },
      stockInfo: {
        companyName: 'Akdital S.A.',
        ticker: 'AKT',
        sector: 'Santé & pharmacie',
        currentPrice: '715',
        price52wLow: '490',
        price52wHigh: '745',
        eps: '23.8',
        peRatio: '30.0',
        pbRatio: '4.2',
        sharesOutstanding: '4331000',
        dividendPerShare: '12.0',
        priceObservationDate: '2024-10-10',
      },
      growth: {
        years: [
          {
            year: '2021',
            revenue: '774',
            netProfit: '102',
            netProfitGroupShare: '98',
          },
          {
            year: '2022',
            revenue: '1036',
            netProfit: '128',
            netProfitGroupShare: '121',
          },
          {
            year: '2023',
            revenue: '1907',
            netProfit: '211',
            netProfitGroupShare: '198',
          },
        ],
      },
      profitability: {
        operatingProfit: '286',
        ebitda: '511',
        equity: '1220',
        equityGroupShare: '1150',
        roe: '17.2',
        operatingMargin: '15.0',
        netMargin: '10.4',
      },
      debtStability: {
        totalFinancialDebt: '1450',
        interestBearingDebt: '1380',
        cashAndEquivalents: '335',
        netDebt: '1115',
        interestExpense: '72',
        totalAssets: '4620',
      },
      cashFlow: {
        operatingCashFlow: '445',
        capex: '380',
        freeCashFlow: '65',
      },
      valuation: {
        expectedEarningsGrowth: '14.5',
        futurePeRatio: '22',
        requiredReturnRate: '10',
        manualFairValue: '780',
        desiredMarginOfSafety: '20',
        investmentHorizonYears: '4',
      },
      shariah: {
        businessActivity: 'Prestations de santé et soins hospitaliers privés',
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
        interestBearingDebt: '1380',
        interestIncome: '1.2',
        isInterestIncomeUnbundled: true,
        nonPermissibleIncome: '0',
        totalRevenue: '1907',
        cashAndInterestSecurities: '335',
        receivables: '460',
        totalAssets: '4620',
        marketCap: '3096',
      },
    };

    setData(akditalData);
    setErrors(validateForm(akditalData));
    saveChecklistData(akditalData);
    showToast('Exemple concret Akdital chargé avec succès !', 'success');
  };

  const currentUnit = data.periodInfo.unit;
  const unitSuffix =
    currentUnit === 'billions'
      ? 'Mds MAD'
      : currentUnit === 'millions'
      ? 'M MAD'
      : currentUnit === 'thousands'
      ? 'k MAD'
      : 'MAD';

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-sm text-slate-500">
        Chargement de la checklist financière...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      {/* Top Bar */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-white shrink-0">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold tracking-tight text-slate-900">
                  Stock Investment Analyzer
                </span>
                <span className="text-xs text-slate-400">·</span>
                <span className="text-xs font-medium text-slate-600">Bourse de Casablanca</span>
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block">
                Checklist fondamentale & conformité Shariah pour investisseurs long terme
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={loadAkditalTemplate}
              className="text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/60 px-3 py-2 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
              title="Charger un jeu de données réel issu du rapport financier d'Akdital"
            >
              Charger exemple Akdital
            </button>

            <HeaderActions
              data={data}
              onSave={handleSave}
              onReset={handleReset}
              onImport={handleImport}
              onShowMessage={showToast}
            />
          </div>
        </div>
      </header>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div
            className={`flex items-center gap-2.5 px-4 py-3 rounded-lg shadow-lg text-xs font-medium border ${
              toastMessage.type === 'success'
                ? 'bg-slate-900 text-emerald-300 border-slate-800'
                : toastMessage.type === 'error'
                ? 'bg-rose-950 text-rose-200 border-rose-800'
                : 'bg-slate-900 text-slate-200 border-slate-800'
            }`}
          >
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* Main Content Viewport */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-8 flex flex-col gap-8">
        {/* Title Header */}
        <div className="flex flex-col gap-1.5 pb-2 border-b border-slate-200/80">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Analyse d&apos;investissement
          </h1>
          <p className="text-sm text-slate-600 max-w-2xl leading-relaxed">
            Analysez les fondamentaux d&apos;une entreprise avant d&apos;investir. Renseignez la grille ci-dessous à
            partir du dernier rapport financier publié (annuel ou semestriel).
          </p>
        </div>

        {/* Global Validation Banner if any error */}
        {Object.keys(errors).length > 0 && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex flex-col gap-1">
              <span className="font-semibold">Vérification de cohérence des données :</span>
              <ul className="list-disc list-inside space-y-0.5 text-rose-700">
                {Object.values(errors).map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* CADRE & RÉFÉRENTIEL FINANCIER */}
        <section className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-700" />
              <h2 className="text-sm font-semibold text-slate-900 tracking-tight">
                Période & Référentiel financier du rapport
              </h2>
            </div>
            <span className="text-[11px] text-slate-500">
              Standardise les montants et le périmètre d&apos;analyse
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            {/* Année financière */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="period-year" className="font-medium text-slate-700">
                Exercice financier de référence
              </label>
              <input
                id="period-year"
                type="text"
                value={data.periodInfo.financialYear}
                onChange={(e) => handleFieldChange('periodInfo', 'financialYear', e.target.value)}
                placeholder="ex : 2023"
                className="px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-800 tabular-nums"
              />
            </div>

            {/* Type de rapport */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="period-type" className="font-medium text-slate-700">
                Type de publication
              </label>
              <select
                id="period-type"
                value={data.periodInfo.reportType}
                onChange={(e) =>
                  handleFieldChange('periodInfo', 'reportType', e.target.value as ReportType)
                }
                className="px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-800"
              >
                <option value="annual">Rapport annuel (12 mois)</option>
                <option value="semiannual">Rapport semestriel (6 mois)</option>
              </select>
            </div>

            {/* Périmètre des comptes */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="period-scope" className="font-medium text-slate-700">
                Périmètre des comptes
              </label>
              <select
                id="period-scope"
                value={data.periodInfo.statementScope}
                onChange={(e) =>
                  handleFieldChange('periodInfo', 'statementScope', e.target.value as StatementScope)
                }
                className="px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-800"
              >
                <option value="consolidated">Comptes consolidés (Groupe - recommandé)</option>
                <option value="parent">Comptes sociaux / société mère</option>
              </select>
            </div>

            {/* Date du rapport */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="period-date" className="font-medium text-slate-700">
                Date de publication du rapport <span className="text-slate-400 font-normal">(optionnel)</span>
              </label>
              <input
                id="period-date"
                type="date"
                value={data.periodInfo.reportDate}
                onChange={(e) => handleFieldChange('periodInfo', 'reportDate', e.target.value)}
                className="px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-800"
              />
            </div>

            {/* Source ou URL */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="period-source" className="font-medium text-slate-700">
                Lien ou référence du document <span className="text-slate-400 font-normal">(optionnel)</span>
              </label>
              <input
                id="period-source"
                type="text"
                value={data.periodInfo.sourceUrl}
                onChange={(e) => handleFieldChange('periodInfo', 'sourceUrl', e.target.value)}
                placeholder="ex : Rapport financier annuel 2023 AMMC / Site investisseurs"
                className="px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-800"
              />
            </div>

            {/* Unité financière */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5 font-medium text-slate-700">
                <label htmlFor="period-unit">Unité des montants saisis</label>
                <Tooltip
                  info={{
                    title: 'Normalisation de l&apos;unité financière',
                    description:
                      'Choisissez l&apos;unité utilisée dans le rapport financier afin de saisir directement les valeurs publiées sans conversion manuelle préalable.',
                    example:
                      'Si le rapport indique 1 907 dans un tableau libellé "en millions de MAD", sélectionnez "Millions de MAD".',
                  }}
                />
              </div>
              <select
                id="period-unit"
                value={data.periodInfo.unit}
                onChange={(e) =>
                  handleFieldChange('periodInfo', 'unit', e.target.value as CurrencyUnit)
                }
                className="px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white font-medium text-indigo-950 focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-800"
              >
                <option value="millions">Millions de MAD (M MAD - le plus fréquent)</option>
                <option value="thousands">Milliers de MAD (k MAD)</option>
                <option value="billions">Milliards de MAD (Mds MAD)</option>
                <option value="MAD">MAD bruts (Dirhams simples)</option>
              </select>
            </div>
          </div>
        </section>

        {/* FORMULAIRE EN SECTIONS PLIABLES */}
        <div className="flex flex-col gap-5">
          {/* Section 1 — Informations sur l'action */}
          <CollapsibleSection
            id="sec-stock"
            title="Section 1 — Informations sur l'action"
            subtitle="Cote boursière, multiple de valorisation actuel et identification du titre"
            countLabel={data.stockInfo.companyName ? data.stockInfo.companyName : undefined}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-4 pt-2">
              <FormField
                id="stock-name"
                label="Nom de l'entreprise"
                value={data.stockInfo.companyName}
                onChange={(v) => handleFieldChange('stockInfo', 'companyName', v)}
                placeholder="ex : Akdital"
                required
              />

              <FormField
                id="stock-ticker"
                label="Ticker boursier"
                value={data.stockInfo.ticker}
                onChange={(v) => handleFieldChange('stockInfo', 'ticker', v.toUpperCase())}
                placeholder="ex : AKT"
                required
              />

              {/* Secteur */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="stock-sector" className="text-xs font-medium text-slate-700">
                  Secteur d&apos;activité <span className="text-rose-500 font-semibold">*</span>
                </label>
                <select
                  id="stock-sector"
                  value={data.stockInfo.sector}
                  onChange={(e) => handleFieldChange('stockInfo', 'sector', e.target.value)}
                  className="px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-800"
                >
                  {SECTORS.map((sec) => (
                    <option key={sec} value={sec}>
                      {sec}
                    </option>
                  ))}
                </select>
              </div>

              <FormField
                id="stock-currentPrice"
                label="Prix actuel de l'action"
                value={data.stockInfo.currentPrice}
                onChange={(v) => handleFieldChange('stockInfo', 'currentPrice', v)}
                placeholder="ex : 715"
                suffix="MAD"
                type="number"
                required
                error={errors['stockInfo.currentPrice']}
                tooltip={TOOLTIPS.currentPrice}
              />

              <FormField
                id="stock-price52wLow"
                label="Prix le plus bas (52 semaines)"
                value={data.stockInfo.price52wLow}
                onChange={(v) => handleFieldChange('stockInfo', 'price52wLow', v)}
                placeholder="ex : 490"
                suffix="MAD"
                type="number"
                error={errors['stockInfo.price52wLow']}
                tooltip={TOOLTIPS.price52wLow}
              />

              <FormField
                id="stock-price52wHigh"
                label="Prix le plus haut (52 semaines)"
                value={data.stockInfo.price52wHigh}
                onChange={(v) => handleFieldChange('stockInfo', 'price52wHigh', v)}
                placeholder="ex : 745"
                suffix="MAD"
                type="number"
                error={errors['stockInfo.price52wHigh']}
                tooltip={TOOLTIPS.price52wHigh}
              />

              <FormField
                id="stock-eps"
                label="EPS — Bénéfice par action (BPA)"
                value={data.stockInfo.eps}
                onChange={(v) => handleFieldChange('stockInfo', 'eps', v)}
                placeholder="ex : 23.8"
                suffix="MAD"
                type="number"
                tooltip={TOOLTIPS.eps}
              />

              <FormField
                id="stock-peRatio"
                label="PER (Price Earnings Ratio)"
                value={data.stockInfo.peRatio}
                onChange={(v) => handleFieldChange('stockInfo', 'peRatio', v)}
                placeholder="ex : 30.0"
                suffix="x"
                type="number"
                tooltip={TOOLTIPS.peRatio}
              />

              <FormField
                id="stock-pbRatio"
                label="PBR (Price to Book Ratio)"
                value={data.stockInfo.pbRatio}
                onChange={(v) => handleFieldChange('stockInfo', 'pbRatio', v)}
                placeholder="ex : 4.2"
                suffix="x"
                type="number"
                tooltip={TOOLTIPS.pbRatio}
              />

              <FormField
                id="stock-shares"
                label="Nombre d'actions"
                value={data.stockInfo.sharesOutstanding}
                onChange={(v) => handleFieldChange('stockInfo', 'sharesOutstanding', v)}
                placeholder="ex : 4331000"
                type="number"
                error={errors['stockInfo.sharesOutstanding']}
                tooltip={TOOLTIPS.sharesOutstanding}
              />

              <FormField
                id="stock-dividend"
                label="Dividende par action"
                value={data.stockInfo.dividendPerShare}
                onChange={(v) => handleFieldChange('stockInfo', 'dividendPerShare', v)}
                placeholder="ex : 12.0"
                suffix="MAD"
                type="number"
                tooltip={TOOLTIPS.dividendPerShare}
              />

              <FormField
                id="stock-observationDate"
                label="Date du prix observé"
                value={data.stockInfo.priceObservationDate}
                onChange={(v) => handleFieldChange('stockInfo', 'priceObservationDate', v)}
                placeholder="ex : 2024-10-12"
                type="text"
                tooltip={TOOLTIPS.priceObservationDate}
              />
            </div>
          </CollapsibleSection>

          {/* Section 2 — Croissance */}
          <CollapsibleSection
            id="sec-growth"
            title="Section 2 — Croissance"
            subtitle="Historique des 3 derniers exercices financiers pour évaluer la trajectoire de l'activité"
          >
            <div className="pt-2 flex flex-col gap-3">
              <p className="text-xs text-slate-500">
                Renseignez les montants en <span className="font-semibold text-slate-700">{unitSuffix}</span> selon
                l&apos;unité choisie. Les montants négatifs (pertes) sont acceptés en commençant par le signe &quot;-&quot;.
              </p>

              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-700 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3 font-semibold w-28">Année</th>
                      <th className="py-2.5 px-3 font-semibold">
                        <div className="flex items-center gap-1">
                          <span>Chiffre d&apos;affaires</span>
                          <Tooltip info={TOOLTIPS.revenue} />
                        </div>
                      </th>
                      <th className="py-2.5 px-3 font-semibold">
                        <div className="flex items-center gap-1">
                          <span>Résultat net</span>
                          <Tooltip info={TOOLTIPS.netProfit} />
                        </div>
                      </th>
                      <th className="py-2.5 px-3 font-semibold">
                        <div className="flex items-center gap-1">
                          <span>Résultat net part du groupe (RNPG)</span>
                          <Tooltip info={TOOLTIPS.netProfitGroupShare} />
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {data.growth.years.map((yearRow, index) => (
                      <tr key={index} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-3">
                          <input
                            type="text"
                            value={yearRow.year}
                            onChange={(e) => handleGrowthYearChange(index, 'year', e.target.value)}
                            placeholder="Année"
                            className="w-20 px-2 py-1.5 border border-slate-300 rounded font-medium text-slate-900 bg-slate-50/40 text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 tabular-nums"
                          />
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="relative">
                            <input
                              type="text"
                              inputMode="decimal"
                              value={yearRow.revenue}
                              onChange={(e) =>
                                handleGrowthYearChange(index, 'revenue', e.target.value)
                              }
                              placeholder="0.00"
                              className="w-full px-2.5 py-1.5 pr-14 border border-slate-300 rounded text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 tabular-nums"
                            />
                            <span className="absolute inset-y-0 right-2 flex items-center text-[10px] text-slate-600 pointer-events-none">
                              {unitSuffix}
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="relative">
                            <input
                              type="text"
                              inputMode="decimal"
                              value={yearRow.netProfit}
                              onChange={(e) =>
                                handleGrowthYearChange(index, 'netProfit', e.target.value)
                              }
                              placeholder="0.00"
                              className="w-full px-2.5 py-1.5 pr-14 border border-slate-300 rounded text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 tabular-nums"
                            />
                            <span className="absolute inset-y-0 right-2 flex items-center text-[10px] text-slate-600 pointer-events-none">
                              {unitSuffix}
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="relative">
                            <input
                              type="text"
                              inputMode="decimal"
                              value={yearRow.netProfitGroupShare}
                              onChange={(e) =>
                                handleGrowthYearChange(index, 'netProfitGroupShare', e.target.value)
                              }
                              placeholder="0.00"
                              className="w-full px-2.5 py-1.5 pr-14 border border-slate-300 rounded text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 tabular-nums"
                            />
                            <span className="absolute inset-y-0 right-2 flex items-center text-[10px] text-slate-600 pointer-events-none">
                              {unitSuffix}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </CollapsibleSection>

          {/* Section 3 — Rentabilité */}
          <CollapsibleSection
            id="sec-profit"
            title="Section 3 — Rentabilité"
            subtitle="Capacité de l'entreprise à générer du résultat opérationnel et rémunérer ses capitaux"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-4 pt-2">
              <FormField
                id="prof-opProfit"
                label="Résultat d'exploitation (EBIT)"
                value={data.profitability.operatingProfit}
                onChange={(v) => handleFieldChange('profitability', 'operatingProfit', v)}
                placeholder="0.00"
                suffix={unitSuffix}
                type="number"
                tooltip={TOOLTIPS.operatingProfit}
              />

              <FormField
                id="prof-ebitda"
                label="EBITDA"
                value={data.profitability.ebitda}
                onChange={(v) => handleFieldChange('profitability', 'ebitda', v)}
                placeholder="0.00"
                suffix={unitSuffix}
                type="number"
                tooltip={TOOLTIPS.ebitda}
              />

              <FormField
                id="prof-equity"
                label="Capitaux propres totaux"
                value={data.profitability.equity}
                onChange={(v) => handleFieldChange('profitability', 'equity', v)}
                placeholder="0.00"
                suffix={unitSuffix}
                type="number"
                tooltip={TOOLTIPS.equity}
              />

              <FormField
                id="prof-equityGroup"
                label="Capitaux propres part du groupe"
                value={data.profitability.equityGroupShare}
                onChange={(v) => handleFieldChange('profitability', 'equityGroupShare', v)}
                placeholder="0.00"
                suffix={unitSuffix}
                type="number"
                tooltip={TOOLTIPS.equityGroupShare}
              />

              <FormField
                id="prof-roe"
                label="ROE (Rentabilité des fonds propres)"
                value={data.profitability.roe}
                onChange={(v) => handleFieldChange('profitability', 'roe', v)}
                placeholder="ex : 15.0"
                suffix="%"
                type="number"
                tooltip={TOOLTIPS.roe}
              />

              <FormField
                id="prof-opMargin"
                label="Marge opérationnelle"
                value={data.profitability.operatingMargin}
                onChange={(v) => handleFieldChange('profitability', 'operatingMargin', v)}
                placeholder="ex : 18.5"
                suffix="%"
                type="number"
                tooltip={TOOLTIPS.operatingMargin}
              />

              <FormField
                id="prof-netMargin"
                label="Marge nette"
                value={data.profitability.netMargin}
                onChange={(v) => handleFieldChange('profitability', 'netMargin', v)}
                placeholder="ex : 11.2"
                suffix="%"
                type="number"
                tooltip={TOOLTIPS.netMargin}
              />
            </div>
          </CollapsibleSection>

          {/* Section 4 — Endettement */}
          <CollapsibleSection
            id="sec-debt"
            title="Section 4 — Endettement & Stabilité financière"
            subtitle="Structure financière, trésorerie disponible et couverture des engagements"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-4 pt-2">
              <FormField
                id="debt-total"
                label="Dettes financières totales"
                value={data.debtStability.totalFinancialDebt}
                onChange={(v) => handleFieldChange('debtStability', 'totalFinancialDebt', v)}
                placeholder="0.00"
                suffix={unitSuffix}
                type="number"
                tooltip={TOOLTIPS.totalFinancialDebt}
              />

              <FormField
                id="debt-interest"
                label="Dettes portant intérêt"
                value={data.debtStability.interestBearingDebt}
                onChange={(v) => handleFieldChange('debtStability', 'interestBearingDebt', v)}
                placeholder="0.00"
                suffix={unitSuffix}
                type="number"
                tooltip={TOOLTIPS.interestBearingDebt}
              />

              <FormField
                id="debt-cash"
                label="Trésorerie disponible"
                value={data.debtStability.cashAndEquivalents}
                onChange={(v) => handleFieldChange('debtStability', 'cashAndEquivalents', v)}
                placeholder="0.00"
                suffix={unitSuffix}
                type="number"
                tooltip={TOOLTIPS.cashAndEquivalents}
              />

              <FormField
                id="debt-net"
                label="Endettement net (si déjà calculé)"
                value={data.debtStability.netDebt}
                onChange={(v) => handleFieldChange('debtStability', 'netDebt', v)}
                placeholder="0.00"
                suffix={unitSuffix}
                type="number"
                tooltip={TOOLTIPS.netDebt}
              />

              <FormField
                id="debt-interestExpense"
                label="Charges d'intérêts"
                value={data.debtStability.interestExpense}
                onChange={(v) => handleFieldChange('debtStability', 'interestExpense', v)}
                placeholder="0.00"
                suffix={unitSuffix}
                type="number"
                tooltip={TOOLTIPS.interestExpense}
              />

              <FormField
                id="debt-assets"
                label="Total actif du bilan"
                value={data.debtStability.totalAssets}
                onChange={(v) => handleFieldChange('debtStability', 'totalAssets', v)}
                placeholder="0.00"
                suffix={unitSuffix}
                type="number"
                tooltip={TOOLTIPS.totalAssets}
              />
            </div>
          </CollapsibleSection>

          {/* Section 5 — Flux de trésorerie */}
          <CollapsibleSection
            id="sec-cashflow"
            title="Section 5 — Flux de trésorerie"
            subtitle="Génération réelle de liquidités par l'exploitation et intensité capitalistique (CapEx)"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-4 pt-2">
              <FormField
                id="cf-operating"
                label="Flux de trésorerie opérationnel"
                value={data.cashFlow.operatingCashFlow}
                onChange={(v) => handleFieldChange('cashFlow', 'operatingCashFlow', v)}
                placeholder="0.00"
                suffix={unitSuffix}
                type="number"
                tooltip={TOOLTIPS.operatingCashFlow}
              />

              <FormField
                id="cf-capex"
                label="Investissements / CapEx"
                value={data.cashFlow.capex}
                onChange={(v) => handleFieldChange('cashFlow', 'capex', v)}
                placeholder="0.00"
                suffix={unitSuffix}
                type="number"
                tooltip={TOOLTIPS.capex}
              />

              <FormField
                id="cf-fcf"
                label="Free Cash Flow (si déjà fourni)"
                value={data.cashFlow.freeCashFlow}
                onChange={(v) => handleFieldChange('cashFlow', 'freeCashFlow', v)}
                placeholder="0.00"
                suffix={unitSuffix}
                type="number"
                tooltip={TOOLTIPS.freeCashFlow}
              />
            </div>
          </CollapsibleSection>

          {/* Section 6 — Valorisation */}
          <CollapsibleSection
            id="sec-valuation"
            title="Section 6 — Hypothèses de valorisation"
            subtitle="Paramètres de votre stratégie d'investissement et marge de sécurité exigée"
          >
            <div className="flex flex-col gap-4 pt-2">
              <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-lg text-xs text-slate-600 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span>
                  Horizon d&apos;investissement par défaut :{' '}
                  <strong className="text-slate-900 font-semibold font-mono">
                    {data.valuation.investmentHorizonYears || '4'} ans
                  </strong>
                </span>
                <span>
                  Marge de sécurité recommandée :{' '}
                  <strong className="text-slate-900 font-semibold font-mono">20 %</strong>
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-4">
                <FormField
                  id="val-growth"
                  label="Croissance annuelle attendue des bénéfices"
                  value={data.valuation.expectedEarningsGrowth}
                  onChange={(v) => handleFieldChange('valuation', 'expectedEarningsGrowth', v)}
                  placeholder="ex : 12.0"
                  suffix="%"
                  type="number"
                  tooltip={TOOLTIPS.expectedEarningsGrowth}
                />

                <FormField
                  id="val-peFuture"
                  label="PER futur estimé (sortie)"
                  value={data.valuation.futurePeRatio}
                  onChange={(v) => handleFieldChange('valuation', 'futurePeRatio', v)}
                  placeholder="ex : 20.0"
                  suffix="x"
                  type="number"
                  tooltip={TOOLTIPS.futurePeRatio}
                />

                <FormField
                  id="val-requiredReturn"
                  label="Rendement annuel exigé"
                  value={data.valuation.requiredReturnRate}
                  onChange={(v) => handleFieldChange('valuation', 'requiredReturnRate', v)}
                  placeholder="10.0"
                  suffix="%"
                  type="number"
                  tooltip={TOOLTIPS.requiredReturnRate}
                />

                <FormField
                  id="val-fairValueManual"
                  label="Fair Value estimée (saisie manuelle)"
                  value={data.valuation.manualFairValue}
                  onChange={(v) => handleFieldChange('valuation', 'manualFairValue', v)}
                  placeholder="ex : 780"
                  suffix="MAD"
                  type="number"
                  tooltip={TOOLTIPS.manualFairValue}
                  helperText="Objectif externe (analyste / broker) comparé automatiquement avec le modèle calculé."
                />

                <FormField
                  id="val-marginSafety"
                  label="Marge de sécurité souhaitée"
                  value={data.valuation.desiredMarginOfSafety}
                  onChange={(v) => handleFieldChange('valuation', 'desiredMarginOfSafety', v)}
                  placeholder="20"
                  suffix="%"
                  type="number"
                  tooltip={TOOLTIPS.desiredMarginOfSafety}
                />

                <FormField
                  id="val-horizon"
                  label="Horizon d'investissement"
                  value={data.valuation.investmentHorizonYears}
                  onChange={(v) => handleFieldChange('valuation', 'investmentHorizonYears', v)}
                  placeholder="4"
                  suffix="ans"
                  type="number"
                  error={errors['valuation.investmentHorizonYears']}
                  tooltip={TOOLTIPS.investmentHorizonYears}
                />
              </div>
            </div>
          </CollapsibleSection>

          {/* Section 7 — Conformité Shariah */}
          <CollapsibleSection
            id="sec-shariah"
            title="Section 7 — Conformité Shariah"
            subtitle="Filtrage qualitatif de l'activité éthique et respect des ratios financiers islamiques (Strict, AAOIFI, MSCI, FTSE)"
            defaultOpen={true}
          >
            <div className="pt-2">
              <ShariahScreeningSection
                data={data}
                unitSuffix={unitSuffix}
                onChangeField={handleShariahFieldChange}
                onChangeActivityQuestion={handleActivityQuestionChange}
              />
            </div>
          </CollapsibleSection>
        </div>

        {/* Dashboard d'analyse fondamentale */}
        <FundamentalAnalysisDashboard
          analysis={analysis}
          unit={data.periodInfo.unit}
          reportType={data.periodInfo.reportType}
          companyName={data.stockInfo.companyName}
          ticker={data.stockInfo.ticker}
        />

        {/* Calculateur de Juste Valeur & Marge de Sécurité */}
        <section className="pt-2">
          <FairValueCalculatorSection
            calculation={fairValueAnalysis}
            currentStockPriceMAD={parseFinancialNumber(data.stockInfo.currentPrice)}
            annualDividendMAD={parseFinancialNumber(data.stockInfo.dividendPerShare)}
            requiredReturnPercent={data.valuation.requiredReturnRate}
            desiredMarginOfSafetyPercent={data.valuation.desiredMarginOfSafety}
            dividendMode={data.valuation.dividendMode || 'exclude'}
            onDividendModeChange={handleDividendModeChange}
            onValuationParamChange={handleValuationParamChange}
          />
        </section>

        {/* Section Scoring d'Investissement & Décision Finale (Feature 5) */}
        <section className="pt-2">
          <InvestmentConfidenceSection
            report={confidenceReport}
            companyName={data.stockInfo.companyName}
            ticker={data.stockInfo.ticker}
            currentPriceMAD={parseFinancialNumber(data.stockInfo.currentPrice)}
            targetBuyPriceMAD={fairValueAnalysis.baseScenario?.targetBuyPriceMAD ?? null}
            fairValueMAD={fairValueAnalysis.baseScenario?.fairValueMAD ?? null}
            desiredMarginOfSafetyPercent={
              parseFinancialNumber(data.valuation.desiredMarginOfSafety) ?? 20
            }
          />
        </section>

        {/* Synthèse finale en bas de page */}
        <SummaryCard data={data} confidenceReport={confidenceReport} />
      </main>
    </div>
  );
}
