'use client';

import React, { useState } from 'react';
import {
  Calculator,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Sliders,
  ChevronDown,
  ChevronUp,
  Scale,
  Sparkles,
  Info,
} from 'lucide-react';
import {
  FairValueCalculationResult,
  ScenarioValuationResult,
} from '@/lib/fairValueCalculator';

interface FairValueCalculatorSectionProps {
  calculation: FairValueCalculationResult;
  currentStockPriceMAD: number | null;
  annualDividendMAD: number | null;
  requiredReturnPercent: string;
  desiredMarginOfSafetyPercent: string;
  dividendMode: 'exclude' | 'include';
  onDividendModeChange: (mode: 'exclude' | 'include') => void;
  onValuationParamChange: (
    field:
      | 'expectedEarningsGrowth'
      | 'futurePeRatio'
      | 'requiredReturnRate'
      | 'desiredMarginOfSafety'
      | 'investmentHorizonYears',
    value: string
  ) => void;
}

export function FairValueCalculatorSection({
  calculation,
  currentStockPriceMAD,
  annualDividendMAD,
  requiredReturnPercent,
  desiredMarginOfSafetyPercent,
  dividendMode,
  onDividendModeChange,
  onValuationParamChange,
}: FairValueCalculatorSectionProps) {
  const [showFormulaDetails, setShowFormulaDetails] = useState(false);
  const [activeScenarioTab, setActiveScenarioTab] = useState<'base' | 'conservative' | 'optimistic'>('base');

  const {
    isCalculable,
    missingInputs,
    assumptions,
    baseScenario,
    conservativeScenario,
    optimisticScenario,
    externalFairValueComparison,
    valuationAttractiveness,
    explanationSteps,
  } = calculation;

  const currentScenario: ScenarioValuationResult | null =
    activeScenarioTab === 'conservative'
      ? conservativeScenario
      : activeScenarioTab === 'optimistic'
      ? optimisticScenario
      : baseScenario;

  const effectiveCalculatedFairValue =
    currentScenario !== null
      ? dividendMode === 'include' && currentScenario.fairValueWithDividendsMAD !== null
        ? currentScenario.fairValueWithDividendsMAD
        : currentScenario.fairValueMAD
      : null;

  return (
    <div className="flex flex-col gap-6">
      {/* Intro banner */}
      <div className="bg-slate-900 text-white p-5 rounded-xl border border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0 mt-0.5">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-slate-100">
                Calculateur de Juste Valeur & Marge de Sécurité (Horizon 4 ans)
              </h3>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800/50">
                Forward Earnings
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Déterminez la valeur intrinsèque théorique d&apos;une action de la Bourse de Casablanca en projetant la croissance des bénéfices et le multiple de sortie, avec actualisation au taux de rendement exigé et décote de protection.
            </p>
          </div>
        </div>

        {/* Quick status pill */}
        {isCalculable && currentScenario && (
          <div className="shrink-0 flex md:flex-col items-center md:items-end justify-between gap-1 border-t md:border-t-0 pt-2 md:pt-0 border-slate-800">
            <span className="text-[11px] text-slate-400">Statut de valorisation</span>
            <span
              className={`text-xs font-bold px-3 py-1 rounded-full border ${valuationAttractiveness.badgeColor}`}
            >
              {valuationAttractiveness.badgeLabel}
            </span>
          </div>
        )}
      </div>

      {/* When inputs are missing or report is semi-annual */}
      {!isCalculable && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 flex flex-col gap-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-amber-900">
                Calcul de Juste Valeur en attente de paramètres
              </h4>
              <p className="text-xs text-amber-800 leading-relaxed">
                Le modèle d&apos;actualisation des bénéfices requiert des données annuelles complètes pour générer une estimation rigoureuse sans inventer de chiffres :
              </p>
            </div>
          </div>
          <ul className="list-disc list-inside text-xs text-amber-800/90 pl-8 space-y-1">
            {missingInputs.map((item, idx) => (
              <li key={idx} className="font-medium">
                {item}
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-amber-700 italic pl-8">
            Astuce : Complétez les champs de la Section 1 (Prix, BPA) et de la Section 6 (Croissance attendue, PER futur) ci-dessus pour débloquer l&apos;estimation automatique.
          </p>
        </div>
      )}

      {/* Main Interactive Controls Bar */}
      <div className="p-4 bg-white border border-slate-200/90 rounded-xl shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-slate-600" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Paramètres d&apos;actualisation & Traitement des dividendes
            </h4>
          </div>
          <span className="text-[11px] text-slate-500">
            Source BPA :{' '}
            <strong className="text-slate-700 font-semibold">
              {assumptions.baseEPS !== null ? `${assumptions.baseEPS.toFixed(2)} MAD` : 'Non renseigné'}
            </strong>{' '}
            {assumptions.epsSourceDescription && `(${assumptions.epsSourceDescription})`}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Rendement exigé */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700 flex items-center justify-between">
              <span>Rendement annuel exigé (r)</span>
              <span className="font-mono font-bold text-slate-900">{requiredReturnPercent || '10'} %</span>
            </label>
            <input
              type="range"
              min="5"
              max="20"
              step="0.5"
              value={requiredReturnPercent || '10'}
              onChange={(e) => onValuationParamChange('requiredReturnRate', e.target.value)}
              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-900"
            />
            <p className="text-[10px] text-slate-500">
              Recommandé : 10 % (prime de risque actions au Maroc).
            </p>
          </div>

          {/* Marge de sécurité */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700 flex items-center justify-between">
              <span>Marge de sécurité souhaitée</span>
              <span className="font-mono font-bold text-slate-900">{desiredMarginOfSafetyPercent || '20'} %</span>
            </label>
            <input
              type="range"
              min="5"
              max="40"
              step="5"
              value={desiredMarginOfSafetyPercent || '20'}
              onChange={(e) => onValuationParamChange('desiredMarginOfSafety', e.target.value)}
              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
            />
            <p className="text-[10px] text-slate-500">
              Standard prudent : 20 % de décote par rapport à la juste valeur.
            </p>
          </div>

          {/* Option dividendes explicite */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700 flex items-center justify-between">
              <span>Traitement des dividendes</span>
              <span className="text-[10px] font-semibold text-slate-600">
                {annualDividendMAD !== null && annualDividendMAD > 0
                  ? `${annualDividendMAD.toFixed(2)} MAD/act.`
                  : 'Aucun dividende saisi'}
              </span>
            </label>
            <div className="grid grid-cols-2 gap-1.5 bg-slate-100 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => onDividendModeChange('exclude')}
                className={`py-1 text-xs font-medium rounded-md transition-all ${
                  dividendMode === 'exclude'
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Exclure (Prudent)
              </button>
              <button
                type="button"
                onClick={() => onDividendModeChange('include')}
                disabled={annualDividendMAD === null || annualDividendMAD <= 0}
                className={`py-1 text-xs font-medium rounded-md transition-all ${
                  dividendMode === 'include'
                    ? 'bg-white text-emerald-700 shadow-xs font-semibold'
                    : annualDividendMAD === null || annualDividendMAD <= 0
                    ? 'text-slate-400 cursor-not-allowed opacity-60'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title={
                  annualDividendMAD === null || annualDividendMAD <= 0
                    ? 'Veuillez saisir un dividende par action dans la Section 1 pour activer cette option'
                    : 'Actualiser et ajouter les dividendes prévus'
                }
              >
                Inclure
              </button>
            </div>
            <p className="text-[10px] text-slate-500">
              {dividendMode === 'exclude'
                ? 'Les dividendes ne sont pas pris en compte (approche conservatrice maximale).'
                : 'Les dividendes récurrents sont actualisés et intégrés à la valeur intrinsèque.'}
            </p>
          </div>
        </div>
      </div>

      {isCalculable && currentScenario && (
        <>
          {/* Key Metric Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Fair Value Today */}
            <div className="p-4 bg-white border border-slate-200/90 rounded-xl shadow-xs flex flex-col justify-between">
              <div>
                <span className="text-xs font-medium text-slate-500 block mb-1">
                  Juste Valeur estimée aujourd&apos;hui
                </span>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold font-mono text-slate-900">
                    {effectiveCalculatedFairValue?.toFixed(2)}
                  </span>
                  <span className="text-xs font-semibold text-slate-500">MAD</span>
                </div>
              </div>
              <div className="pt-2 mt-2 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
                <span>Rendement exigé :</span>
                <span className="font-semibold text-slate-700">{assumptions.requiredReturnRatePercent} % / an</span>
              </div>
            </div>

            {/* 2. Target Buy Price */}
            <div className="p-4 bg-emerald-50/60 border border-emerald-200/90 rounded-xl shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-emerald-800">
                    Prix d&apos;achat cible
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-200/70 text-emerald-900 font-bold">
                    -{assumptions.desiredMarginOfSafetyPercent} %
                  </span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold font-mono text-emerald-950">
                    {currentScenario.targetBuyPriceMAD.toFixed(2)}
                  </span>
                  <span className="text-xs font-semibold text-emerald-700">MAD</span>
                </div>
              </div>
              <div className="pt-2 mt-2 border-t border-emerald-200/60 text-[11px] text-emerald-800 flex items-center justify-between">
                <span>Prix max d&apos;entrée conseillé</span>
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              </div>
            </div>

            {/* 3. Discount or Premium to Fair Value */}
            <div className="p-4 bg-white border border-slate-200/90 rounded-xl shadow-xs flex flex-col justify-between">
              <div>
                <span className="text-xs font-medium text-slate-500 block mb-1">
                  {currentScenario.discountToFairValuePercent !== null &&
                  currentScenario.discountToFairValuePercent >= 0
                    ? 'Décote actuelle par rapport à la Fair Value'
                    : 'Surcote actuelle (Prime)'}
                </span>
                <div className="flex items-baseline gap-1">
                  <span
                    className={`text-2xl font-bold font-mono ${
                      currentScenario.discountToFairValuePercent !== null &&
                      currentScenario.discountToFairValuePercent >= assumptions.desiredMarginOfSafetyPercent
                        ? 'text-emerald-600'
                        : currentScenario.discountToFairValuePercent !== null &&
                          currentScenario.discountToFairValuePercent >= 0
                        ? 'text-blue-600'
                        : 'text-rose-600'
                    }`}
                  >
                    {currentScenario.discountToFairValuePercent !== null
                      ? `${currentScenario.discountToFairValuePercent > 0 ? '+' : ''}${currentScenario.discountToFairValuePercent.toFixed(1)} %`
                      : '—'}
                  </span>
                </div>
              </div>
              <div className="pt-2 mt-2 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
                <span>Cours actuel marché :</span>
                <span className="font-semibold text-slate-700">
                  {currentStockPriceMAD !== null ? `${currentStockPriceMAD.toFixed(2)} MAD` : '—'}
                </span>
              </div>
            </div>

            {/* 4. Projected Annualized Return (CAGR) */}
            <div className="p-4 bg-white border border-slate-200/90 rounded-xl shadow-xs flex flex-col justify-between">
              <div>
                <span className="text-xs font-medium text-slate-500 block mb-1">
                  Rendement annualisé projeté (CAGR)
                </span>
                <div className="flex items-baseline gap-1">
                  <span
                    className={`text-2xl font-bold font-mono ${
                      currentScenario.projectedAnnualizedReturnPercent !== null &&
                      currentScenario.projectedAnnualizedReturnPercent >= assumptions.requiredReturnRatePercent
                        ? 'text-emerald-600'
                        : 'text-slate-900'
                    }`}
                  >
                    {currentScenario.projectedAnnualizedReturnPercent !== null
                      ? `${currentScenario.projectedAnnualizedReturnPercent > 0 ? '+' : ''}${currentScenario.projectedAnnualizedReturnPercent.toFixed(1)} %`
                      : '—'}
                  </span>
                  <span className="text-xs font-medium text-slate-500">/ an</span>
                </div>
              </div>
              <div className="pt-2 mt-2 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
                <span>Prix de sortie estimé à {assumptions.investmentHorizonYears} ans :</span>
                <span className="font-semibold text-slate-700">
                  {currentScenario.futureStockPrice.toFixed(0)} MAD
                </span>
              </div>
            </div>
          </div>

          {/* Attractiveness Verdict Banner */}
          <div className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${valuationAttractiveness.badgeColor}`}>
            <div className="flex items-start gap-3">
              <div className="p-1 rounded-full bg-white/60 shrink-0 mt-0.5">
                {valuationAttractiveness.status === 'UNDERVALUED' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-700" />
                ) : valuationAttractiveness.status === 'FAIRLY_VALUED' ? (
                  <Info className="w-5 h-5 text-blue-700" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-rose-700" />
                )}
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider">
                  {valuationAttractiveness.badgeLabel}
                </p>
                <p className="text-xs mt-0.5 leading-relaxed">
                  {valuationAttractiveness.summaryMessage}
                </p>
                <p className="text-[11px] opacity-90 mt-1 italic">
                  💡 {valuationAttractiveness.actionGuidance}
                </p>
              </div>
            </div>

            <div className="shrink-0 text-right sm:border-l sm:pl-4 border-slate-300/40">
              <span className="text-[10px] uppercase font-semibold block opacity-75">
                Marge de sécurité disponible
              </span>
              <span className="text-lg font-bold font-mono">
                {currentScenario.marginOfSafetyBufferPercent !== null
                  ? `${currentScenario.marginOfSafetyBufferPercent.toFixed(1)} %`
                  : '—'}
              </span>
            </div>
          </div>

          {/* Multi-Scenario Analysis (Conservative vs Base vs Optimistic) */}
          <div className="bg-white border border-slate-200/90 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Scale className="w-4 h-4 text-indigo-600" />
                  Sensibilité & Scénarios à horizon {assumptions.investmentHorizonYears} ans
                </h4>
                <p className="text-xs text-slate-500">
                  Comparez la robustesse de votre valorisation face à une variation de croissance et de multiple de sortie.
                </p>
              </div>

              {/* Scenario tab switcher */}
              <div className="inline-flex rounded-lg bg-slate-100 p-1 border border-slate-200/80">
                <button
                  type="button"
                  onClick={() => setActiveScenarioTab('conservative')}
                  className={`px-3 py-1 text-xs rounded-md transition-all ${
                    activeScenarioTab === 'conservative'
                      ? 'bg-white text-slate-900 font-bold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Prudent (Stress-test)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveScenarioTab('base')}
                  className={`px-3 py-1 text-xs rounded-md transition-all ${
                    activeScenarioTab === 'base'
                      ? 'bg-white text-indigo-900 font-bold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Scénario de Base
                </button>
                <button
                  type="button"
                  onClick={() => setActiveScenarioTab('optimistic')}
                  className={`px-3 py-1 text-xs rounded-md transition-all ${
                    activeScenarioTab === 'optimistic'
                      ? 'bg-white text-slate-900 font-bold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Optimiste
                </button>
              </div>
            </div>

            {/* Scenario comparative table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 uppercase font-semibold text-[10px] tracking-wider border-y border-slate-200/80">
                  <tr>
                    <th className="py-2.5 px-3">Scénario</th>
                    <th className="py-2.5 px-3 text-right">Croissance g</th>
                    <th className="py-2.5 px-3 text-right">PER Sortie</th>
                    <th className="py-2.5 px-3 text-right">BPA Futur ({assumptions.investmentHorizonYears} ans)</th>
                    <th className="py-2.5 px-3 text-right">Cours Futur</th>
                    <th className="py-2.5 px-3 text-right">Juste Valeur</th>
                    <th className="py-2.5 px-3 text-right font-bold text-emerald-800 bg-emerald-50/50">
                      Prix d&apos;achat Cible
                    </th>
                    <th className="py-2.5 px-3 text-right">Rendement CAGR</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[conservativeScenario, baseScenario, optimisticScenario].map(
                    (sc, idx) => {
                      if (!sc) return null;
                      const isCurrent = sc.type === activeScenarioTab;
                      const fv =
                        dividendMode === 'include' && sc.fairValueWithDividendsMAD !== null
                          ? sc.fairValueWithDividendsMAD
                          : sc.fairValueMAD;

                      return (
                        <tr
                          key={idx}
                          className={`hover:bg-slate-50/80 transition-colors ${
                            isCurrent ? 'bg-indigo-50/40 font-medium' : ''
                          }`}
                        >
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-1.5">
                              {isCurrent && (
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-600"></span>
                              )}
                              <span className="font-semibold text-slate-800">{sc.label}</span>
                            </div>
                            <span className="text-[10px] text-slate-400 block">{sc.subtitle}</span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                            {sc.growthRatePercent.toFixed(1)} %
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                            {sc.futurePeRatio.toFixed(1)}x
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                            {sc.futureEPS.toFixed(2)} MAD
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-800">
                            {sc.futureStockPrice.toFixed(2)} MAD
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                            {fv.toFixed(2)} MAD
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-900 bg-emerald-50/50">
                            {sc.targetBuyPriceMAD.toFixed(2)} MAD
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono">
                            <span
                              className={
                                sc.projectedAnnualizedReturnPercent !== null &&
                                sc.projectedAnnualizedReturnPercent >= assumptions.requiredReturnRatePercent
                                  ? 'text-emerald-700 font-semibold'
                                  : 'text-slate-600'
                              }
                            >
                              {sc.projectedAnnualizedReturnPercent !== null
                                ? `${sc.projectedAnnualizedReturnPercent > 0 ? '+' : ''}${sc.projectedAnnualizedReturnPercent.toFixed(1)} %`
                                : '—'}
                            </span>
                          </td>
                        </tr>
                      );
                    }
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* External Fair Value Discrepancy Box */}
          {externalFairValueComparison.manualFairValueMAD !== null && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                  Rapprochement avec votre Fair Value manuelle externe (analyste / broker)
                </span>
                {externalFairValueComparison.differencePercent !== null && (
                  <span
                    className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${
                      Math.abs(externalFairValueComparison.differencePercent) <= 5
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}
                  >
                    Écart : {externalFairValueComparison.differencePercent > 0 ? '+' : ''}
                    {externalFairValueComparison.differencePercent.toFixed(1)} %
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                <div className="p-2.5 bg-white rounded-lg border border-slate-200/80">
                  <span className="text-slate-500 block text-[11px]">Fair Value manuelle saisie</span>
                  <span className="text-base font-bold font-mono text-slate-900">
                    {externalFairValueComparison.manualFairValueMAD.toFixed(2)} MAD
                  </span>
                </div>
                <div className="p-2.5 bg-white rounded-lg border border-slate-200/80">
                  <span className="text-slate-500 block text-[11px]">Fair Value calculée par le modèle</span>
                  <span className="text-base font-bold font-mono text-indigo-700">
                    {effectiveCalculatedFairValue?.toFixed(2)} MAD
                  </span>
                </div>
              </div>
              {externalFairValueComparison.divergenceExplanation && (
                <p className="text-xs text-slate-600 bg-white p-2.5 rounded-lg border border-slate-200/80 leading-relaxed">
                  💡 {externalFairValueComparison.divergenceExplanation}
                </p>
              )}
            </div>
          )}

          {/* Explainability Accordion: Step-by-Step Mathematical Walkthrough */}
          <div className="border border-slate-200 rounded-xl bg-white overflow-hidden shadow-xs">
            <button
              type="button"
              onClick={() => setShowFormulaDetails(!showFormulaDetails)}
              className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Détail pédagogique des 4 étapes de calcul (Méthode transparente)
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>{showFormulaDetails ? 'Masquer les formules' : 'Afficher les formules'}</span>
                {showFormulaDetails ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </div>
            </button>

            {showFormulaDetails && (
              <div className="p-4 pt-0 border-t border-slate-100 space-y-4 text-xs">
                <p className="text-slate-600 text-[11px] pt-3 leading-relaxed">
                  Chaque étape est reproductible manuellement à l&apos;aide d&apos;une simple calculatrice financière :
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {explanationSteps.map((step) => (
                    <div
                      key={step.stepNumber}
                      className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/90 space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 text-xs">
                          Étape {step.stepNumber} : {step.title}
                        </span>
                        <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200 text-xs">
                          {step.result}
                        </span>
                      </div>
                      <div className="font-mono text-[10px] text-slate-500 bg-slate-100 p-1.5 rounded">
                        Formule : {step.formula}
                      </div>
                      <div className="font-mono text-[10px] text-slate-700 bg-white p-1.5 rounded border border-slate-200">
                        Application : {step.appliedFormula} = {step.result}
                      </div>
                      <p className="text-[11px] text-slate-600 leading-tight">
                        {step.interpretation}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
