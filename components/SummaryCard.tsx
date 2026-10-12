'use client';

import React from 'react';
import { FinancialChecklistData } from '@/lib/types';
import { METHODOLOGIES_CONFIG, performShariahScreening } from '@/lib/shariahScreening';
import { FullInvestmentConfidenceReport } from '@/lib/confidenceScoringEngine';

interface SummaryCardProps {
  data: FinancialChecklistData;
  confidenceReport?: FullInvestmentConfidenceReport;
}

export function SummaryCard({ data, confidenceReport }: SummaryCardProps) {
  const { stockInfo, periodInfo, growth, profitability, debtStability, cashFlow, valuation, shariah } = data;
  const shariahReport = performShariahScreening(data, shariah.methodology);
  const shariahConfig = METHODOLOGIES_CONFIG[shariah.methodology] || METHODOLOGIES_CONFIG.AAOIFI;

  const unitLabel =
    periodInfo.unit === 'billions'
      ? 'Milliards de MAD'
      : periodInfo.unit === 'millions'
      ? 'Millions de MAD'
      : periodInfo.unit === 'thousands'
      ? 'Milliers de MAD'
      : 'MAD';

  const reportTypeLabel = periodInfo.reportType === 'annual' ? 'Rapport Annuel' : 'Rapport Semestriel';
  const scopeLabel = periodInfo.statementScope === 'consolidated' ? 'Comptes Consolidés' : 'Comptes Sociaux (Mère)';

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-base font-semibold text-slate-900 tracking-tight">
            Synthèse des informations saisies
          </h2>
          <p className="text-xs text-slate-500">
            Récapitulatif factuel de la checklist financière avant modélisation des scores
          </p>
        </div>
        <div className="text-xs text-slate-500 font-mono">
          {stockInfo.companyName ? stockInfo.companyName : 'Aucune entreprise'}
          {stockInfo.ticker && ` (${stockInfo.ticker})`}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4 text-xs">
        {/* Fiche Entreprise & Marché */}
        <div className="flex flex-col gap-2">
          <h3 className="font-semibold text-slate-800 text-[13px] pb-1 border-b border-slate-100">
            Action & Cote boursière
          </h3>
          <div className="flex justify-between py-0.5">
            <span className="text-slate-500">Secteur</span>
            <span className="font-medium text-slate-900">{stockInfo.sector || '—'}</span>
          </div>
          <div className="flex justify-between py-0.5">
            <span className="text-slate-500">Prix actuel</span>
            <span className="font-semibold text-slate-900 font-mono tabular-nums">
              {stockInfo.currentPrice ? `${stockInfo.currentPrice} MAD` : 'Non renseigné'}
            </span>
          </div>
          <div className="flex justify-between py-0.5">
            <span className="text-slate-500">Fourchette 52 semaines</span>
            <span className="font-mono tabular-nums text-slate-800">
              {stockInfo.price52wLow || '—'} / {stockInfo.price52wHigh || '—'} MAD
            </span>
          </div>
          <div className="flex justify-between py-0.5">
            <span className="text-slate-500">BPA (EPS) saisi</span>
            <span className="font-mono tabular-nums text-slate-800">
              {stockInfo.eps ? `${stockInfo.eps} MAD` : '—'}
            </span>
          </div>
          <div className="flex justify-between py-0.5">
            <span className="text-slate-500">PER saisi</span>
            <span className="font-mono tabular-nums text-slate-800">
              {stockInfo.peRatio ? `${stockInfo.peRatio}x` : '—'}
            </span>
          </div>
          <div className="flex justify-between py-0.5">
            <span className="text-slate-500">PBR saisi</span>
            <span className="font-mono tabular-nums text-slate-800">
              {stockInfo.pbRatio ? `${stockInfo.pbRatio}x` : '—'}
            </span>
          </div>
          <div className="flex justify-between py-0.5">
            <span className="text-slate-500">Dividende par action</span>
            <span className="font-mono tabular-nums text-slate-800">
              {stockInfo.dividendPerShare ? `${stockInfo.dividendPerShare} MAD` : '—'}
            </span>
          </div>
        </div>

        {/* Référentiel & Données financières */}
        <div className="flex flex-col gap-2">
          <h3 className="font-semibold text-slate-800 text-[13px] pb-1 border-b border-slate-100">
            Cadre financier ({unitLabel})
          </h3>
          <div className="flex justify-between py-0.5">
            <span className="text-slate-500">Nature du rapport</span>
            <span className="text-slate-900">{reportTypeLabel} · {periodInfo.financialYear}</span>
          </div>
          <div className="flex justify-between py-0.5">
            <span className="text-slate-500">Périmètre</span>
            <span className="text-slate-900">{scopeLabel}</span>
          </div>
          <div className="flex justify-between py-0.5">
            <span className="text-slate-500">Dernier CA saisi</span>
            <span className="font-mono tabular-nums text-slate-900">
              {growth.years[growth.years.length - 1]?.revenue || '—'}
            </span>
          </div>
          <div className="flex justify-between py-0.5">
            <span className="text-slate-500">Dernier Résultat Net (RNPG)</span>
            <span className="font-mono tabular-nums text-slate-900">
              {growth.years[growth.years.length - 1]?.netProfitGroupShare ||
                growth.years[growth.years.length - 1]?.netProfit ||
                '—'}
            </span>
          </div>
          <div className="flex justify-between py-0.5">
            <span className="text-slate-500">Résultat d&apos;exploitation / EBITDA</span>
            <span className="font-mono tabular-nums text-slate-900">
              {profitability.operatingProfit || '—'} / {profitability.ebitda || '—'}
            </span>
          </div>
          <div className="flex justify-between py-0.5">
            <span className="text-slate-500">Dette financière / Trésorerie</span>
            <span className="font-mono tabular-nums text-slate-900">
              {debtStability.totalFinancialDebt || '—'} / {debtStability.cashAndEquivalents || '—'}
            </span>
          </div>
          <div className="flex justify-between py-0.5">
            <span className="text-slate-500">Cash Flow Op. / CapEx</span>
            <span className="font-mono tabular-nums text-slate-900">
              {cashFlow.operatingCashFlow || '—'} / {cashFlow.capex || '—'}
            </span>
          </div>
        </div>

        {/* Valorisation & Screening Shariah */}
        <div className="flex flex-col gap-2">
          <h3 className="font-semibold text-slate-800 text-[13px] pb-1 border-b border-slate-100">
            Hypothèses & Shariah
          </h3>
          <div className="flex justify-between py-0.5">
            <span className="text-slate-500">Horizon d&apos;investissement</span>
            <span className="font-mono tabular-nums text-slate-900">
              {valuation.investmentHorizonYears || '4'} ans
            </span>
          </div>
          <div className="flex justify-between py-0.5">
            <span className="text-slate-500">Croissance BPA attendue</span>
            <span className="font-mono tabular-nums text-slate-900">
              {valuation.expectedEarningsGrowth ? `${valuation.expectedEarningsGrowth} %` : '—'}
            </span>
          </div>
          <div className="flex justify-between py-0.5">
            <span className="text-slate-500">PER de sortie visé</span>
            <span className="font-mono tabular-nums text-slate-900">
              {valuation.futurePeRatio ? `${valuation.futurePeRatio}x` : '—'}
            </span>
          </div>
          <div className="flex justify-between py-0.5">
            <span className="text-slate-500">Marge de sécurité exigée</span>
            <span className="font-mono tabular-nums text-slate-900">
              {valuation.desiredMarginOfSafety || '20'} %
            </span>
          </div>
          <div className="flex justify-between py-0.5">
            <span className="text-slate-500">Fair Value saisie (externe)</span>
            <span className="font-mono tabular-nums text-slate-900">
              {valuation.manualFairValue ? `${valuation.manualFairValue} MAD` : 'Non renseignée'}
            </span>
          </div>
          <div className="flex justify-between py-0.5">
            <span className="text-slate-500">Traitement dividendes</span>
            <span className="font-medium text-slate-900">
              {valuation.dividendMode === 'include' ? 'Inclus (actualisés)' : 'Exclus (prudent)'}
            </span>
          </div>
          <div className="flex justify-between py-0.5">
            <span className="text-slate-500">Activité Shariah</span>
            <span className="text-slate-900 truncate max-w-[140px]" title={shariah.businessActivity}>
              {shariah.businessActivity || 'Non renseignée'}
            </span>
          </div>
          <div className="flex justify-between py-0.5">
            <span className="text-slate-500">Norme Shariah</span>
            <span className="font-medium text-slate-900">{shariahConfig.shortName}</span>
          </div>
          <div className="flex justify-between py-0.5">
            <span className="text-slate-500">Statut Shariah</span>
            <span
              className={`font-semibold ${
                shariahReport.verdict === 'PASSED'
                  ? 'text-emerald-700'
                  : shariahReport.verdict === 'FAILED'
                  ? 'text-rose-700'
                  : 'text-amber-700'
              }`}
            >
              {shariahReport.verdict === 'PASSED'
                ? 'Conforme'
                : shariahReport.verdict === 'FAILED'
                ? 'Non conforme'
                : 'Vérification requise'}
            </span>
          </div>
        </div>
      </div>

      {confidenceReport && (
        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/70 p-3 rounded-lg text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-800">Décision Finale :</span>
            <span
              className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                confidenceReport.decision.type === 'BUY_CANDIDATE'
                  ? 'bg-emerald-100 text-emerald-800'
                  : confidenceReport.decision.type === 'WAIT'
                  ? 'bg-amber-100 text-amber-800'
                  : confidenceReport.decision.type === 'AVOID'
                  ? 'bg-rose-100 text-rose-800'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              {confidenceReport.decision.shortLabel}
            </span>
          </div>

          <div className="flex items-center gap-4 text-slate-600">
            <div>
              <span>Qualité : </span>
              <strong className="font-mono text-slate-900">{confidenceReport.qualityScore.totalScore}/100</strong>
            </div>
            <div className="w-px h-3.5 bg-slate-300" />
            <div>
              <span>Score Achat Mois : </span>
              <strong className="font-mono text-slate-900">{confidenceReport.buyMonthScore.totalScore}/100</strong>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
