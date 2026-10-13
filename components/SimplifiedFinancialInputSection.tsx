'use client';

import React, { useState } from 'react';
import {
  SlidersHorizontal,
  Sparkles,
  HelpCircle,
  FileText,
  DollarSign,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { FinancialChecklistData, CurrencyUnit, ReportType, StatementScope } from '@/lib/types';
import { FullFundamentalAnalysis } from '@/lib/financialMath';
import { FairValueCalculationResult } from '@/lib/fairValueCalculator';
import { ShariahScreeningReport } from '@/lib/shariahScreening';

interface SimplifiedFinancialInputSectionProps {
  data: FinancialChecklistData;
  onFieldChange: (section: keyof FinancialChecklistData, field: string, val: string) => void;
  analysis: FullFundamentalAnalysis;
  fairValueResult: FairValueCalculationResult;
  shariahReport: ShariahScreeningReport;
  showToast: (text: string, type: 'success' | 'error' | 'info') => void;
}

export function SimplifiedFinancialInputSection({
  data,
  onFieldChange,
  analysis,
  shariahReport,
  showToast,
}: SimplifiedFinancialInputSectionProps) {
  const [inputMode, setInputMode] = useState<'simple' | 'advanced'>('simple');
  const [showAdvancedInputs, setShowAdvancedInputs] = useState(false);
  const [activeTooltipField, setActiveTooltipField] = useState<string | null>(null);

  // Helper pour formuler les conseils de l'assistant intelligent
  const missingItems = analysis.completeness.items.filter((item) => !item.isCalculable);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
      {/* En-tête & Bascule de Mode */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">
              Saisie Financière & Assistant Intelligent
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
              {inputMode === 'simple' ? 'Mode Simple (Débutant)' : 'Mode Avancé (Complet)'}
            </span>
          </div>
          <p className="text-sm text-slate-600 mt-1">
            Renseignez les états financiers essentiels de l'entreprise. Le système calcule automatiquement tous les ratios et indicateurs.
          </p>
        </div>

        <div className="flex items-center bg-slate-100 p-1 rounded-xl self-start">
          <button
            type="button"
            onClick={() => {
              setInputMode('simple');
              showToast('Passage en Mode Simple (Saisie guidée et pédagogique).', 'info');
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              inputMode === 'simple'
                ? 'bg-white text-emerald-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Mode Simple
          </button>
          <button
            type="button"
            onClick={() => {
              setInputMode('advanced');
              showToast('Passage en Mode Avancé (Tous les champs et formulaires détaillés).', 'info');
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              inputMode === 'advanced'
                ? 'bg-white text-emerald-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Mode Avancé
          </button>
        </div>
      </div>

      {/* 1. SECTION MODE SIMPLE */}
      {inputMode === 'simple' ? (
        <div className="space-y-6">
          {/* A. Informations du Rapport */}
          <div className="bg-slate-50 rounded-xl p-5 border border-slate-200/80 space-y-4">
            <h3 className="text-md font-semibold text-slate-800 flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-600" />
              1. Informations du Rapport Financier (Bourse de Casablanca)
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Entreprise & Ticker</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={data.stockInfo.companyName}
                    onChange={(e) => onFieldChange('stockInfo', 'companyName', e.target.value)}
                    placeholder="Ex: Akdital SA"
                    className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500"
                  />
                  <input
                    type="text"
                    value={data.stockInfo.ticker}
                    onChange={(e) => onFieldChange('stockInfo', 'ticker', e.target.value.toUpperCase())}
                    placeholder="AKT"
                    className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500 uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Année Financière</label>
                <input
                  type="text"
                  value={data.periodInfo.financialYear}
                  onChange={(e) => onFieldChange('periodInfo', 'financialYear', e.target.value)}
                  placeholder="Ex: 2024 ou 2025"
                  className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Période du Rapport</label>
                <select
                  value={data.periodInfo.reportType}
                  onChange={(e) => onFieldChange('periodInfo', 'reportType', e.target.value as ReportType)}
                  className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="annual">Annuel (FY - 12 mois)</option>
                  <option value="semiannual">1er Semestre (H1 - 6 mois)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Type de Comptes</label>
                <select
                  value={data.periodInfo.statementScope}
                  onChange={(e) => onFieldChange('periodInfo', 'statementScope', e.target.value as StatementScope)}
                  className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="consolidated">Comptes Consolidés (Recommandé)</option>
                  <option value="parent">Comptes Sociaux (Parent)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Unité des Montants</label>
                <select
                  value={data.periodInfo.unit}
                  onChange={(e) => onFieldChange('periodInfo', 'unit', e.target.value as CurrencyUnit)}
                  className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="MAD">Dirhams (MAD)</option>
                  <option value="thousands">Milliers de MAD (k MAD)</option>
                  <option value="millions">Millions de MAD (M MAD)</option>
                  <option value="billions">Milliards de MAD</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Source ou Référence (Optionnel)</label>
                <input
                  type="text"
                  value={data.periodInfo.sourceUrl}
                  onChange={(e) => onFieldChange('periodInfo', 'sourceUrl', e.target.value)}
                  placeholder="Ex: Rapport Annuel CDG Capital 2024"
                  className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* B. Données Financières Essentielles */}
          <div className="bg-emerald-50/50 rounded-xl p-5 border border-emerald-200/80 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-md font-semibold text-emerald-900 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-600" />
                2. Données Financières Essentielles
              </h3>
              <span className="text-xs text-emerald-700 font-medium">
                Saisissez les montants dans l'unité choisie ci-dessus.
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Chiffre d'affaires */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-slate-900">Chiffre d'affaires</label>
                  <button
                    type="button"
                    onClick={() => setActiveTooltipField(activeTooltipField === 'revenue' ? null : 'revenue')}
                    className="text-emerald-600 hover:text-emerald-700 text-xs flex items-center gap-1 font-medium"
                  >
                    <HelpCircle className="w-4 h-4" /> Aide & Exemple
                  </button>
                </div>
                <input
                  type="text"
                  value={
                    data.growth.years.length > 0
                      ? data.growth.years[data.growth.years.length - 1].revenue
                      : ''
                  }
                  onChange={(e) => {
                    const years = [...data.growth.years];
                    const lastIdx = years.length > 0 ? years.length - 1 : 0;
                    if (years.length === 0) {
                      years.push({ year: data.periodInfo.financialYear || '2024', revenue: e.target.value, netProfit: '', netProfitGroupShare: '' });
                    } else {
                      years[lastIdx].revenue = e.target.value;
                    }
                    onFieldChange('growth', 'years', JSON.stringify(years));
                  }}
                  placeholder="Ex: 2400000000 ou 2400 (si millions)"
                  className="w-full px-3 py-2 bg-slate-50 rounded-lg border border-slate-300 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                />
                <p className="text-xs text-slate-500">
                  Libellé comptable usuel : <span className="font-semibold">Chiffre d'affaires consolidé / Produits des activités ordinaires</span>
                </p>
                {activeTooltipField === 'revenue' && (
                  <div className="mt-2 p-3 bg-emerald-50 text-emerald-900 rounded-lg text-xs space-y-1">
                    <p className="font-semibold">Qu'est-ce que c'est ?</p>
                    <p>Le total des ventes de biens et services avant déduction des charges.</p>
                    <p className="italic">Exemple : Une entreprise vend pour 100 millions MAD de prestations. Son chiffre d'affaires est de 100 millions MAD.</p>
                  </div>
                )}
              </div>

              {/* Résultat net */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-slate-900">
                    {data.periodInfo.statementScope === 'consolidated' ? 'Résultat Net (Part du Groupe)' : 'Résultat Net'}
                  </label>
                  <button
                    type="button"
                    onClick={() => setActiveTooltipField(activeTooltipField === 'netProfit' ? null : 'netProfit')}
                    className="text-emerald-600 hover:text-emerald-700 text-xs flex items-center gap-1 font-medium"
                  >
                    <HelpCircle className="w-4 h-4" /> Aide & Exemple
                  </button>
                </div>
                <input
                  type="text"
                  value={
                    data.growth.years.length > 0
                      ? (data.periodInfo.statementScope === 'consolidated'
                          ? data.growth.years[data.growth.years.length - 1].netProfitGroupShare
                          : data.growth.years[data.growth.years.length - 1].netProfit)
                      : ''
                  }
                  onChange={(e) => {
                    const years = [...data.growth.years];
                    const lastIdx = years.length > 0 ? years.length - 1 : 0;
                    if (years.length === 0) {
                      years.push({ year: data.periodInfo.financialYear || '2024', revenue: '', netProfit: e.target.value, netProfitGroupShare: e.target.value });
                    } else {
                      if (data.periodInfo.statementScope === 'consolidated') {
                        years[lastIdx].netProfitGroupShare = e.target.value;
                      } else {
                        years[lastIdx].netProfit = e.target.value;
                      }
                    }
                    onFieldChange('growth', 'years', JSON.stringify(years));
                  }}
                  placeholder="Ex: 350000000"
                  className="w-full px-3 py-2 bg-slate-50 rounded-lg border border-slate-300 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                />
                <p className="text-xs text-slate-500">
                  Libellé comptable usuel : <span className="font-semibold">Résultat net part du groupe (ou Résultat net de l'exercice)</span>
                </p>
                {activeTooltipField === 'netProfit' && (
                  <div className="mt-2 p-3 bg-emerald-50 text-emerald-900 rounded-lg text-xs space-y-1">
                    <p className="font-semibold">Qu'est-ce que c'est ?</p>
                    <p>Le bénéfice réel de l'entreprise après impôts et charges financières.</p>
                    <p className="italic">Exemple : Sur 100M MAD de ventes, après impôts et frais, il reste 15M MAD de bénéfice net.</p>
                  </div>
                )}
              </div>

              {/* Résultat d'exploitation */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-slate-900">Résultat d'Exploitation (EBIT)</label>
                  <button
                    type="button"
                    onClick={() => setActiveTooltipField(activeTooltipField === 'opProfit' ? null : 'opProfit')}
                    className="text-emerald-600 hover:text-emerald-700 text-xs flex items-center gap-1 font-medium"
                  >
                    <HelpCircle className="w-4 h-4" /> Aide
                  </button>
                </div>
                <input
                  type="text"
                  value={data.profitability.operatingProfit}
                  onChange={(e) => onFieldChange('profitability', 'operatingProfit', e.target.value)}
                  placeholder="Ex: 500000000"
                  className="w-full px-3 py-2 bg-slate-50 rounded-lg border border-slate-300 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                />
                <p className="text-xs text-slate-500">
                  Libellé : <span className="font-semibold">Résultat d'exploitation</span> (permet de calculer la marge opérationnelle).
                </p>
              </div>

              {/* Endettement net */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-slate-900">Endettement Net (si connu)</label>
                  <button
                    type="button"
                    onClick={() => setActiveTooltipField(activeTooltipField === 'netDebt' ? null : 'netDebt')}
                    className="text-emerald-600 hover:text-emerald-700 text-xs flex items-center gap-1 font-medium"
                  >
                    <HelpCircle className="w-4 h-4" /> Aide
                  </button>
                </div>
                <input
                  type="text"
                  value={data.debtStability.netDebt}
                  onChange={(e) => onFieldChange('debtStability', 'netDebt', e.target.value)}
                  placeholder="Ex: 900000000 (ou laisser vide pour calcul)"
                  className="w-full px-3 py-2 bg-slate-50 rounded-lg border border-slate-300 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                />
                <p className="text-xs text-slate-500">
                  Dettes financières totales moins trésorerie disponible (laisser vide pour calcul automatique si les sous-composantes sont renseignées).
                </p>
              </div>
            </div>
          </div>

          {/* C. Section Repliable : Informations complémentaires */}
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
            <button
              type="button"
              onClick={() => setShowAdvancedInputs(!showAdvancedInputs)}
              className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
            >
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5 text-emerald-600" />
                <span className="font-semibold text-slate-800 text-sm">
                  Informations complémentaires pour une analyse plus précise (EBITDA, CapEx, Capitaux propres...)
                </span>
              </div>
              {showAdvancedInputs ? <ChevronUp className="w-5 h-5 text-slate-500" /> : <ChevronDown className="w-5 h-5 text-slate-500" />}
            </button>

            {showAdvancedInputs && (
              <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-slate-200 bg-slate-50/50">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">EBITDA</label>
                  <input
                    type="text"
                    value={data.profitability.ebitda}
                    onChange={(e) => onFieldChange('profitability', 'ebitda', e.target.value)}
                    placeholder="EBITDA / Excédent Brut d'Exploitation"
                    className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 text-sm text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Capitaux Propres</label>
                  <input
                    type="text"
                    value={data.profitability.equityGroupShare}
                    onChange={(e) => onFieldChange('profitability', 'equityGroupShare', e.target.value)}
                    placeholder="Capitaux propres part du groupe"
                    className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 text-sm text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Total Dettes Financières</label>
                  <input
                    type="text"
                    value={data.debtStability.totalFinancialDebt}
                    onChange={(e) => onFieldChange('debtStability', 'totalFinancialDebt', e.target.value)}
                    placeholder="Emprunts et dettes de crédit"
                    className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 text-sm text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Trésorerie Disponible</label>
                  <input
                    type="text"
                    value={data.debtStability.cashAndEquivalents}
                    onChange={(e) => onFieldChange('debtStability', 'cashAndEquivalents', e.target.value)}
                    placeholder="Liquidités et équivalents"
                    className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 text-sm text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Cash-Flow Opérationnel</label>
                  <input
                    type="text"
                    value={data.cashFlow.operatingCashFlow}
                    onChange={(e) => onFieldChange('cashFlow', 'operatingCashFlow', e.target.value)}
                    placeholder="Flux générés par l'activité"
                    className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 text-sm text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Investissements (CapEx)</label>
                  <input
                    type="text"
                    value={data.cashFlow.capex}
                    onChange={(e) => onFieldChange('cashFlow', 'capex', e.target.value)}
                    placeholder="Acquisitions d'immobilisations"
                    className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 text-sm text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Nombre d'Actions en Circulation</label>
                  <input
                    type="text"
                    value={data.stockInfo.sharesOutstanding}
                    onChange={(e) => onFieldChange('stockInfo', 'sharesOutstanding', e.target.value)}
                    placeholder="Ex: 15000000"
                    className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 text-sm text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Dettes Portant Intérêt (Shariah)</label>
                  <input
                    type="text"
                    value={data.shariah.interestBearingDebt}
                    onChange={(e) => onFieldChange('shariah', 'interestBearingDebt', e.target.value)}
                    placeholder="Dettes financières à intérêt"
                    className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 text-sm text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Revenus d'Intérêts (Shariah)</label>
                  <input
                    type="text"
                    value={data.shariah.interestIncome}
                    onChange={(e) => onFieldChange('shariah', 'interestIncome', e.target.value)}
                    placeholder="Produits de placements usuraires"
                    className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 text-sm text-slate-900"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* MODE AVANCÉ : Afficher un message de bascule vers le formulaire complet existant */
        <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
          <p className="text-sm text-slate-700 font-medium">
            Vous êtes en <span className="font-bold text-emerald-700">Mode Avancé</span>. Tous les modules complets de la checklist financière (Croissance multi-exercices, Rentabilité, Structure de bilan, Flux de trésorerie, Hypothèses de valorisation et Checklist Shariah détaillée) sont accessibles ci-dessous.
          </p>
          <p className="text-xs text-slate-500">
            Les données saisies en Mode Simple sont entièrement partagées et synchronisées avec le Mode Avancé.
          </p>
        </div>
      )}

      {/* D. Assistant Intelligent de Données Manquantes */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl p-6 space-y-4 shadow-md">
        <div className="flex items-center gap-3 border-b border-slate-700 pb-3">
          <Sparkles className="w-6 h-6 text-emerald-400" />
          <div>
            <h3 className="font-bold text-lg">Assistant Intelligent de Complétude & Analyse</h3>
            <p className="text-xs text-slate-300">
              Vérification automatique des données nécessaires pour chaque pilier d'investissement.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700 space-y-2">
            <div className="flex items-center justify-between font-semibold text-emerald-300">
              <span>Complétude de l'Analyse</span>
              <span className="bg-emerald-900/60 px-2 py-0.5 rounded text-xs">
                {analysis.completeness.calculableCount} / {analysis.completeness.totalCount} indicateurs
              </span>
            </div>
            <p className="text-xs text-slate-300">
              {analysis.completeness.calculableCount === analysis.completeness.totalCount
                ? 'Toutes les données requises sont présentes pour une analyse fondamentale exhaustive.'
                : 'Certains indicateurs nécessitent des informations complémentaires (voir ci-dessous).'}
            </p>
          </div>

          <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700 space-y-2">
            <div className="flex items-center justify-between font-semibold text-emerald-300">
              <span>Statut Filtrage Shariah</span>
              <span className={`px-2 py-0.5 rounded text-xs ${
                shariahReport.verdict === 'PASSED'
                  ? 'bg-emerald-900 text-emerald-200'
                  : shariahReport.verdict === 'FAILED'
                  ? 'bg-rose-900 text-rose-200'
                  : 'bg-amber-900 text-amber-200'
              }`}>
                {shariahReport.verdict}
              </span>
            </div>
            <p className="text-xs text-slate-300">
              {shariahReport.verdict === 'REVIEW_REQUIRED'
                ? 'Renseignez les dettes portant intérêt et les revenus d’intérêts pour valider définitivement la conformité.'
                : shariahReport.verdict === 'PASSED'
                ? 'Conforme aux critères de filtrage éthique et islamique.'
                : 'Attention : Critères de non-conformité détectés.'}
            </p>
          </div>
        </div>

        {missingItems.length > 0 && (
          <div className="bg-amber-950/40 border border-amber-600/40 rounded-xl p-4 text-xs space-y-2">
            <div className="font-semibold text-amber-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              Champs recommandés pour enrichir l'évaluation :
            </div>
            <div className="flex flex-wrap gap-2">
              {missingItems.slice(0, 5).map((mi, idx) => (
                <span key={idx} className="bg-amber-900/40 text-amber-200 px-2.5 py-1 rounded-lg border border-amber-700/50">
                  {mi.name} ({mi.missingInputs.join(', ')})
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
