'use client';

import React, { useState } from 'react';
import {
  Award,
  AlertTriangle,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Info,
  Lock,
  Sliders,
} from 'lucide-react';
import {
  FullInvestmentConfidenceReport,
  ScoredMetricDetail,
} from '@/lib/confidenceScoringEngine';

interface InvestmentConfidenceSectionProps {
  report: FullInvestmentConfidenceReport;
  companyName: string;
  ticker: string;
  currentPriceMAD: number | null;
  targetBuyPriceMAD: number | null;
  fairValueMAD: number | null;
  desiredMarginOfSafetyPercent: number;
}

export function InvestmentConfidenceSection({
  report,
  companyName,
  ticker,
  currentPriceMAD,
  targetBuyPriceMAD,
  fairValueMAD,
  desiredMarginOfSafetyPercent,
}: InvestmentConfidenceSectionProps) {
  const { qualityScore, buyMonthScore, decision, dataQuality, disclaimer } = report;

  const [activeTab, setActiveTab] = useState<'decision' | 'quality' | 'buyMonth' | 'rules'>('decision');
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    growth: true,
    profitability: true,
    debt: true,
    cashFlow: true,
  });

  const toggleCategory = (cat: string) => {
    setExpandedCategories((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  // Décision visuelle
  const isBuy = decision.type === 'BUY_CANDIDATE';
  const isWait = decision.type === 'WAIT';
  const isAvoid = decision.type === 'AVOID';

  const decisionBg = isBuy
    ? 'bg-emerald-50/70 border-emerald-300'
    : isWait
    ? 'bg-amber-50/70 border-amber-300'
    : isAvoid
    ? 'bg-rose-50/70 border-rose-300'
    : 'bg-slate-50 border-slate-300';

  const decisionTextColor = isBuy
    ? 'text-emerald-950'
    : isWait
    ? 'text-amber-950'
    : isAvoid
    ? 'text-rose-950'
    : 'text-slate-900';

  const decisionBadgeStyle = isBuy
    ? 'bg-emerald-700 text-white'
    : isWait
    ? 'bg-amber-600 text-white'
    : isAvoid
    ? 'bg-rose-700 text-white'
    : 'bg-slate-700 text-white';

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col gap-6">
      {/* En-tête de section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 shrink-0">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-slate-900 tracking-tight">
                Moteur de Scoring & Décision d’Investissement
              </h2>
              <span className="text-xs px-2 py-0.5 rounded font-mono bg-indigo-50 text-indigo-800 border border-indigo-200">
                Feature 5
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Évaluation heuristique déterministe pour investisseur fondamental à la Bourse de Casablanca (Horizon 4 ans · 4 000 MAD/mois)
              {companyName && (
                <span className="font-mono text-slate-700 ml-1">
                  · {companyName}{ticker ? ` (${ticker})` : ''}
                  {currentPriceMAD !== null ? ` · Cours : ${currentPriceMAD} MAD` : ''}
                  {fairValueMAD !== null ? ` · Fair Value : ${fairValueMAD.toFixed(1)} MAD` : ''}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Navigation des sous-onglets */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg shrink-0 self-start sm:self-auto text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('decision')}
            className={`px-3 py-1.5 font-medium rounded-md transition-colors ${
              activeTab === 'decision'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Vue Synthétique & Décision
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('quality')}
            className={`px-3 py-1.5 font-medium rounded-md transition-colors ${
              activeTab === 'quality'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Qualité Entreprise ({qualityScore.totalScore}/100)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('buyMonth')}
            className={`px-3 py-1.5 font-medium rounded-md transition-colors ${
              activeTab === 'buyMonth'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Score Achat du Mois ({buyMonthScore.totalScore}/100)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('rules')}
            className={`px-3 py-1.5 font-medium rounded-md transition-colors ${
              activeTab === 'rules'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Règles & Barème
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* CARTE HERO DE DÉCISION FINALE (Toujours visible et prépondérante) */}
      {/* ============================================================== */}
      <div className={`border rounded-xl p-5 ${decisionBg} flex flex-col gap-4 transition-all`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`px-2.5 py-1 text-xs font-bold tracking-wider rounded uppercase ${decisionBadgeStyle}`}>
                {decision.shortLabel}
              </span>

              {/* Tag Shariah unboxed */}
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-700 bg-white/80 px-2 py-0.5 rounded border border-slate-200/80">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>{decision.shariahStatusSummary}</span>
              </div>

              {/* Tag calibration sectorielle */}
              <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-white/80 px-2 py-0.5 rounded border border-slate-200/80">
                <Sliders className="w-3.5 h-3.5 text-indigo-600" />
                <span>{qualityScore.isCustomCalibrated ? `Secteur : ${qualityScore.sectorName}` : 'Seuils standards'}</span>
              </div>
            </div>

            <h3 className={`text-xl font-bold tracking-tight mt-1 ${decisionTextColor}`}>
              {decision.title}
            </h3>
            <p className="text-sm text-slate-700 font-normal leading-relaxed">
              {decision.headline}
            </p>
          </div>

          {/* Jauges doubles de scores */}
          <div className="flex items-center gap-4 shrink-0 bg-white/95 p-3 rounded-xl border border-slate-200/90 shadow-2xs">
            {/* Score 1 : Qualité de l'entreprise */}
            <div className="flex flex-col items-center text-center px-2">
              <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                Qualité Entreprise
              </span>
              <div className="flex items-baseline gap-0.5 mt-0.5">
                <span className={`text-2xl font-bold font-mono tabular-nums ${qualityScore.levelColor}`}>
                  {qualityScore.totalScore}
                </span>
                <span className="text-xs text-slate-400 font-mono">/100</span>
              </div>
              <span className="text-[10px] text-slate-600 font-medium mt-0.5">
                {qualityScore.levelLabel}
              </span>
            </div>

            <div className="w-px h-12 bg-slate-200" />

            {/* Score 2 : Achat du mois */}
            <div className="flex flex-col items-center text-center px-2">
              <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                Achat Ce Mois-ci
              </span>
              <div className="flex items-baseline gap-0.5 mt-0.5">
                <span
                  className={`text-2xl font-bold font-mono tabular-nums ${
                    buyMonthScore.isBlockedByShariah
                      ? 'text-rose-600'
                      : buyMonthScore.totalScore >= 65
                      ? 'text-emerald-700'
                      : buyMonthScore.totalScore >= 50
                      ? 'text-amber-600'
                      : 'text-slate-700'
                  }`}
                >
                  {buyMonthScore.totalScore}
                </span>
                <span className="text-xs text-slate-400 font-mono">/100</span>
              </div>
              <span className="text-[10px] text-slate-600 font-medium mt-0.5">
                {buyMonthScore.isBlockedByShariah
                  ? 'Verrou Shariah'
                  : buyMonthScore.totalScore >= 65
                  ? 'Forte Attractivité'
                  : buyMonthScore.totalScore >= 50
                  ? 'Attractivité Modérée'
                  : 'Hors Zone d’Achat'}
              </span>
            </div>
          </div>
        </div>

        {/* Détails de rationales & Conditions de marché */}
        <div className="pt-3 border-t border-slate-200/60 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <span className="font-semibold text-slate-800 block mb-1.5">
              Justifications financières principales :
            </span>
            <ul className="space-y-1 text-slate-700">
              {decision.rationales.map((r, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="text-slate-400 mt-0.5">•</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white/70 p-3 rounded-lg border border-slate-200/80 flex flex-col justify-between gap-2">
            <div>
              <span className="font-semibold text-slate-800 block mb-1">
                Point d’entrée & Consigne opérationnelle :
              </span>
              <p className="text-slate-700 leading-relaxed">
                {decision.actionGuidance}
              </p>
            </div>
            <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
              <span className="text-slate-500">Condition cible :</span>
              <span className="font-mono font-medium text-slate-900">
                {decision.targetEntryCondition}
              </span>
            </div>
          </div>
        </div>

        {/* Avertissement de blocage Shariah si applicable */}
        {buyMonthScore.isBlockedByShariah && (
          <div className="bg-rose-100/90 border border-rose-300 rounded-lg p-3 text-xs text-rose-900 flex items-start gap-2">
            <Lock className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Achat bloqué par la conformité éthique :</span>
              <p className="mt-0.5">{buyMonthScore.shariahBlockReason}</p>
            </div>
          </div>
        )}

        {/* Avertissement revue Shariah en attente */}
        {buyMonthScore.isPendingShariah && !buyMonthScore.isBlockedByShariah && (
          <div className="bg-amber-100/90 border border-amber-300 rounded-lg p-3 text-xs text-amber-900 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Recommandation suspendue :</span>
              <p className="mt-0.5">
                Certains éléments de conformité Shariah sont en statut « Vérification requise ». Veuillez confirmer
                l&apos;absence de revenus illicites ou de placements à intérêts dans la Section 7 avant d&apos;initier tout ordre d&apos;achat.
              </p>
            </div>
          </div>
        )}

        {/* Message données insuffisantes */}
        {!dataQuality.isSufficientForDecision && dataQuality.missingCriticalFields.length > 0 && (
          <div className="bg-slate-100/90 border border-slate-300 rounded-lg p-3 text-xs text-slate-800 flex items-start gap-2">
            <Info className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Données nécessaires pour fiabiliser la recommandation :</span>
              <p className="mt-0.5">
                Veuillez renseigner : {dataQuality.missingCriticalFields.join(', ')}.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* VUE 1 : SYNTHÈSE DES PILIERS & DÉCISION (activeTab === 'decision') */}
      {/* ============================================================== */}
      {activeTab === 'decision' && (
        <div className="flex flex-col gap-6">
          {/* Grille des 4 piliers de qualité */}
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-800">
                Piliers de Qualité Fondamentale ({qualityScore.totalScore}/100)
              </h3>
              <span className="text-xs text-slate-500">
                {qualityScore.calibrationLabel}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3">
              {/* Croissance */}
              <div className="bg-slate-50/70 border border-slate-200/80 rounded-lg p-3 text-xs flex flex-col justify-between gap-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-700">1. Croissance</span>
                  <span className="font-mono font-bold text-slate-900">
                    {qualityScore.categories.growth.totalPoints} / 25 pts
                  </span>
                </div>
                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-indigo-600 h-full rounded-full transition-all"
                    style={{ width: `${qualityScore.categories.growth.percentage}%` }}
                  />
                </div>
                <p className="text-[11px] text-slate-500">
                  {qualityScore.categories.growth.summaryNote}
                </p>
              </div>

              {/* Rentabilité */}
              <div className="bg-slate-50/70 border border-slate-200/80 rounded-lg p-3 text-xs flex flex-col justify-between gap-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-700">2. Rentabilité</span>
                  <span className="font-mono font-bold text-slate-900">
                    {qualityScore.categories.profitability.totalPoints} / 25 pts
                  </span>
                </div>
                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-600 h-full rounded-full transition-all"
                    style={{ width: `${qualityScore.categories.profitability.percentage}%` }}
                  />
                </div>
                <p className="text-[11px] text-slate-500">
                  {qualityScore.categories.profitability.summaryNote}
                </p>
              </div>

              {/* Dette & Solidité */}
              <div className="bg-slate-50/70 border border-slate-200/80 rounded-lg p-3 text-xs flex flex-col justify-between gap-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-700">3. Santé & Dette</span>
                  <span className="font-mono font-bold text-slate-900">
                    {qualityScore.categories.debt.totalPoints} / 25 pts
                  </span>
                </div>
                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-blue-600 h-full rounded-full transition-all"
                    style={{ width: `${qualityScore.categories.debt.percentage}%` }}
                  />
                </div>
                <p className="text-[11px] text-slate-500">
                  {qualityScore.categories.debt.summaryNote}
                </p>
              </div>

              {/* Trésorerie */}
              <div className="bg-slate-50/70 border border-slate-200/80 rounded-lg p-3 text-xs flex flex-col justify-between gap-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-700">4. Flux de Cash</span>
                  <span className="font-mono font-bold text-slate-900">
                    {qualityScore.categories.cashFlow.totalPoints} / 25 pts
                  </span>
                </div>
                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-amber-600 h-full rounded-full transition-all"
                    style={{ width: `${qualityScore.categories.cashFlow.percentage}%` }}
                  />
                </div>
                <p className="text-[11px] text-slate-500">
                  {qualityScore.categories.cashFlow.summaryNote}
                </p>
              </div>
            </div>
          </div>

          {/* Décomposition du Score d'Achat du Mois */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col gap-3 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <span className="font-semibold text-slate-800 text-sm">
                Décomposition du Score « Achat Ce Mois-ci » ({buyMonthScore.totalScore}/100)
              </span>
              <span className="text-slate-500">
                Pondération déterministe en 3 composantes
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
              {/* Composante 1 : Qualité fondamentale */}
              <div className="bg-white p-3 rounded-lg border border-slate-200/80 flex flex-col justify-between gap-2">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-700">Qualité Fondamentale</span>
                    <span className="font-mono font-bold text-indigo-700">
                      {buyMonthScore.qualityContribution.pointsAwarded} / 40 pts
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {buyMonthScore.qualityContribution.explanation}
                  </p>
                </div>
                <div className="text-[10px] text-slate-400">
                  Formule : ({qualityScore.totalScore} / 100) × 40 points
                </div>
              </div>

              {/* Composante 2 : Valorisation & Marge de Sécurité */}
              <div className="bg-white p-3 rounded-lg border border-slate-200/80 flex flex-col justify-between gap-2">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-700">Valorisation & Marge</span>
                    <span className="font-mono font-bold text-emerald-700">
                      {buyMonthScore.valuationContribution.pointsAwarded} / 40 pts
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {buyMonthScore.valuationContribution.ruleLabel}
                  </p>
                </div>
                <div className="text-[10px] text-slate-400">
                  Prix Cible : {targetBuyPriceMAD ? `${targetBuyPriceMAD.toFixed(2)} MAD` : '—'} (Marge : {desiredMarginOfSafetyPercent}%)
                </div>
              </div>

              {/* Composante 3 : Rendement projeté & Timing */}
              <div className="bg-white p-3 rounded-lg border border-slate-200/80 flex flex-col justify-between gap-2">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-700">Rendement 4 ans & 52 sem.</span>
                    <span className="font-mono font-bold text-blue-700">
                      {buyMonthScore.timingReturnContribution.totalTimingPoints} / 20 pts
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {buyMonthScore.timingReturnContribution.projectedReturnExplanation} · {buyMonthScore.timingReturnContribution.price52wRule}
                  </p>
                </div>
                <div className="text-[10px] text-slate-400">
                  Rendement : {buyMonthScore.timingReturnContribution.projectedReturnPoints}/10 pts · 52 sem : {buyMonthScore.timingReturnContribution.price52wPoints}/10 pts
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* VUE 2 : DÉTAIL COMPLET QUALITÉ ENTREPRISE (activeTab === 'quality') */}
      {/* ============================================================== */}
      {activeTab === 'quality' && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 text-xs">
            <div>
              <span className="font-semibold text-slate-800 text-sm">
                Audit détaillé des 4 catégories de solidité fondamentale
              </span>
              <p className="text-slate-500">
                Chaque indicateur est auditable et comparé aux paliers calibrés pour le secteur
              </p>
            </div>
            <span className="font-mono font-bold text-base text-slate-900">
              {qualityScore.totalScore} / 100 pts
            </span>
          </div>

          {/* Catégorie A : Croissance */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => toggleCategory('growth')}
              className="w-full bg-slate-50/80 hover:bg-slate-100/70 p-3.5 flex items-center justify-between text-xs font-medium text-slate-800 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm">A. Croissance de l’Entreprise</span>
                <span className="text-slate-500">
                  (CA YoY, TCAC 3 ans, Dynamique bénéficiaire)
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono font-bold text-indigo-700">
                  {qualityScore.categories.growth.totalPoints} / 25 pts
                </span>
                {expandedCategories.growth ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </div>
            </button>

            {expandedCategories.growth && (
              <div className="p-4 flex flex-col gap-3 divide-y divide-slate-100 text-xs">
                {qualityScore.categories.growth.metrics.map((m) => (
                  <MetricRow key={m.id} metric={m} />
                ))}
              </div>
            )}
          </div>

          {/* Catégorie B : Rentabilité */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => toggleCategory('profitability')}
              className="w-full bg-slate-50/80 hover:bg-slate-100/70 p-3.5 flex items-center justify-between text-xs font-medium text-slate-800 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm">B. Rentabilité & Marges</span>
                <span className="text-slate-500">
                  (ROE, Marge Nette, Marge Opérationnelle EBIT)
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono font-bold text-emerald-700">
                  {qualityScore.categories.profitability.totalPoints} / 25 pts
                </span>
                {expandedCategories.profitability ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </div>
            </button>

            {expandedCategories.profitability && (
              <div className="p-4 flex flex-col gap-3 divide-y divide-slate-100 text-xs">
                {qualityScore.categories.profitability.metrics.map((m) => (
                  <MetricRow key={m.id} metric={m} />
                ))}
              </div>
            )}
          </div>

          {/* Catégorie C : Santé & Dette */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => toggleCategory('debt')}
              className="w-full bg-slate-50/80 hover:bg-slate-100/70 p-3.5 flex items-center justify-between text-xs font-medium text-slate-800 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm">C. Santé Financière & Dette</span>
                <span className="text-slate-500">
                  (Dette Nette / EBITDA, Gearing Dette / CP)
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono font-bold text-blue-700">
                  {qualityScore.categories.debt.totalPoints} / 25 pts
                </span>
                {expandedCategories.debt ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </div>
            </button>

            {expandedCategories.debt && (
              <div className="p-4 flex flex-col gap-3 divide-y divide-slate-100 text-xs">
                {qualityScore.categories.debt.metrics.map((m) => (
                  <MetricRow key={m.id} metric={m} />
                ))}
              </div>
            )}
          </div>

          {/* Catégorie D : Flux de Trésorerie */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => toggleCategory('cashFlow')}
              className="w-full bg-slate-50/80 hover:bg-slate-100/70 p-3.5 flex items-center justify-between text-xs font-medium text-slate-800 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm">D. Flux de Trésorerie & Autofinancement</span>
                <span className="text-slate-500">
                  (Conversion Cash OCF / RN, Qualité du Free Cash Flow)
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono font-bold text-amber-700">
                  {qualityScore.categories.cashFlow.totalPoints} / 25 pts
                </span>
                {expandedCategories.cashFlow ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </div>
            </button>

            {expandedCategories.cashFlow && (
              <div className="p-4 flex flex-col gap-3 divide-y divide-slate-100 text-xs">
                {qualityScore.categories.cashFlow.metrics.map((m) => (
                  <MetricRow key={m.id} metric={m} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* VUE 3 : DÉTAIL DU BUY THIS MONTH SCORE (activeTab === 'buyMonth') */}
      {/* ============================================================== */}
      {activeTab === 'buyMonth' && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 text-xs">
            <div>
              <span className="font-semibold text-slate-800 text-sm">
                Explication détaillée du Score d’Achat du Mois (0–100)
              </span>
              <p className="text-slate-500">
                Pondération stricte de la valorisation actuelle, de la marge de sécurité et de la solidité d’entreprise
              </p>
            </div>
            <span className="font-mono font-bold text-base text-slate-900">
              {buyMonthScore.totalScore} / 100 pts
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {buyMonthScore.breakdownMetrics.map((m) => (
              <div key={m.id} className="p-3.5 bg-slate-50/70 border border-slate-200/90 rounded-xl text-xs flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-900 text-[13px]">{m.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 font-mono">Valeur : {m.observedValueDisplay}</span>
                    <span className="px-2 py-0.5 rounded font-mono font-bold bg-white text-slate-900 border border-slate-200">
                      {m.pointsAwarded} / {m.maxPoints} pts
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-slate-600 bg-white/60 p-2 rounded border border-slate-100">
                  <span className="font-medium text-slate-800 shrink-0">Règle appliquée :</span>
                  <span>{m.ruleLabel}</span>
                </div>

                <p className="text-slate-600 leading-relaxed">{m.explanation}</p>
              </div>
            ))}
          </div>

          {/* Récapitulatif du blocage Shariah */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 text-xs flex flex-col gap-2">
            <span className="font-semibold text-slate-900">
              Condition de validation éthique (Islamic Investing Gate)
            </span>
            <p className="text-slate-600">
              Un score de valorisation élevé ne permet jamais d’acheter une action non conforme. Si l’entreprise ne satisfait pas aux critères de filtrage d’activité ou aux seuils financiers Shariah, le score d’achat du mois est immédiatement réinitialisé à 0 et la recommandation bascule sur <strong>À ÉVITER (AVOID)</strong>.
            </p>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* VUE 4 : RÈGLES & BARÈMES AUDITABLES (activeTab === 'rules') */}
      {/* ============================================================== */}
      {activeTab === 'rules' && (
        <div className="flex flex-col gap-4 text-xs">
          <div className="pb-2 border-b border-slate-100">
            <h3 className="font-semibold text-slate-800 text-sm">
              Transparence & Traçabilité des Seuils Déterministes
            </h3>
            <p className="text-slate-500">
              Tous les calculs reposent sur des fonctions mathématiques auditables, sans boîte noire ni modèle probabiliste d’IA.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col gap-2">
              <span className="font-semibold text-slate-900">
                Structure du Company Quality Score (100 pts)
              </span>
              <ul className="space-y-1.5 text-slate-600 list-disc list-inside">
                <li><strong>Croissance (25 pts) :</strong> CA YoY (10 pts) + TCAC 3 ans (5 pts) + Profits/BPA (10 pts)</li>
                <li><strong>Rentabilité (25 pts) :</strong> ROE (10 pts) + Marge nette (10 pts) + Marge opérationnelle (5 pts)</li>
                <li><strong>Santé Financière & Dette (25 pts) :</strong> Dette Nette / EBITDA (15 pts) + Gearing Dette/CP (10 pts)</li>
                <li><strong>Trésorerie (25 pts) :</strong> Ratio de conversion cash OCF/RN (15 pts) + Qualité FCF (10 pts)</li>
              </ul>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col gap-2">
              <span className="font-semibold text-slate-900">
                Structure du Buy This Month Score (100 pts)
              </span>
              <ul className="space-y-1.5 text-slate-600 list-disc list-inside">
                <li><strong>Qualité d’entreprise (40 pts) :</strong> 40% direct du Company Quality Score</li>
                <li><strong>Décote & Marge de sécurité (40 pts) :</strong> Plein score (40 pts) si Cours ≤ Prix Cible ; 30 pts si décote &ge; 10% ; 20 pts si cours proche de la juste valeur ; 0 pt si surcote &gt; 25%</li>
                <li><strong>Rendement 4 ans (10 pts) :</strong> &ge; 15%/an (10 pts) ; 10% à 15% (8 pts) ; 6% à 10% (5 pts)</li>
                <li><strong>Point d’entrée 52 sem. (10 pts) :</strong> Quartile inférieur du range (10 pts) ; médiane basse (7.5 pts) ; haut de cycle (1 pt)</li>
              </ul>
            </div>
          </div>

          <div className="bg-amber-50/70 border border-amber-200 p-3.5 rounded-xl text-amber-900 flex items-start gap-2">
            <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Note sur la calibration sectorielle :</span>
              <p className="mt-0.5">
                Certains secteurs (comme la santé privée avec Akdital) nécessitent des investissements lourds en cliniques, justifiant une tolérance accrue pour les CapEx d’expansion et le levier financier. Les secteurs non spécifiquement calibrés appliquent les seuils standards du marché de Casablanca.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Mention de responsabilité obligatoire */}
      <div className="pt-3 border-t border-slate-100 flex items-start gap-2 text-[11px] text-slate-500">
        <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
        <p className="leading-relaxed">{disclaimer}</p>
      </div>
    </div>
  );
}

// Composant interne pour une ligne d'indicateur auditable
function MetricRow({ metric }: { metric: ScoredMetricDetail }) {
  const isZero = metric.pointsAwarded === 0;
  const isFull = metric.pointsAwarded === metric.maxPoints;

  return (
    <div className="pt-3 first:pt-0 flex flex-col gap-1.5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-900">{metric.name}</span>
          {metric.warningNote && (
            <span className="text-[10px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded border border-amber-200 font-medium">
              Alerte
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="font-mono text-slate-600">
            Observé : <strong className="text-slate-900 font-medium">{metric.observedValueDisplay}</strong>
          </span>
          <span
            className={`font-mono font-bold px-2 py-0.5 rounded text-xs tabular-nums ${
              isFull
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : isZero
                ? 'bg-slate-100 text-slate-500 border border-slate-200'
                : 'bg-indigo-50 text-indigo-800 border border-indigo-200'
            }`}
          >
            {metric.pointsAwarded} / {metric.maxPoints} pts
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-slate-600 text-[11px]">
        <span className="text-slate-400">Palier :</span>
        <span className="font-medium text-slate-800">{metric.ruleLabel}</span>
        <span className="text-slate-300">·</span>
        <span className="text-slate-500">{metric.explanation}</span>
      </div>

      {metric.warningNote && (
        <div className="text-[11px] text-amber-700 bg-amber-50/60 px-2 py-1 rounded border border-amber-200/80">
          {metric.warningNote}
        </div>
      )}
    </div>
  );
}
