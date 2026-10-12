'use client';

import React from 'react';
import {
  TrendingUp,
  Percent,
  Coins,
  ShieldAlert,
  ArrowUpDown,
  AlertTriangle,
  HelpCircle,
  Info,
} from 'lucide-react';
import { FullFundamentalAnalysis } from '@/lib/financialMath';
import { CurrencyUnit, ReportType } from '@/lib/types';

interface FundamentalAnalysisDashboardProps {
  analysis: FullFundamentalAnalysis;
  unit: CurrencyUnit;
  reportType: ReportType;
  companyName?: string;
  ticker?: string;
}

// Top-level tooltip component for metric formulas
function MetricTooltip({ formula, example }: { formula: string; example: string }) {
  return (
    <div className="group relative inline-flex items-center ml-1">
      <button
        type="button"
        className="text-slate-400 hover:text-slate-700 transition-colors focus:outline-none"
        aria-label="Formule et exemple"
      >
        <HelpCircle className="w-3.5 h-3.5" />
      </button>
      <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-2.5 bg-slate-900 text-white text-[11px] rounded-lg shadow-xl opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity z-50">
        <p className="font-semibold text-slate-100 mb-1">Formule :</p>
        <p className="text-slate-300 font-mono text-[10px] bg-slate-800 p-1 rounded mb-1.5">
          {formula}
        </p>
        <p className="font-semibold text-slate-100 mb-0.5">Exemple :</p>
        <p className="text-slate-300 leading-tight">{example}</p>
        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-900" />
      </div>
    </div>
  );
}

export function FundamentalAnalysisDashboard({
  analysis,
  unit,
  reportType,
  companyName,
  ticker,
}: FundamentalAnalysisDashboardProps) {
  const { growth, profitability, valuation, debt, cashFlow, completeness } = analysis;

  const unitSuffix =
    unit === 'billions'
      ? 'Mds MAD'
      : unit === 'millions'
      ? 'M MAD'
      : unit === 'thousands'
      ? 'k MAD'
      : 'MAD';

  const formatMAD = (val: number | null, unitNorm = true) => {
    if (val === null) return '—';
    if (unitNorm) {
      const displayVal = val / analysis.unitMultiplier;
      return `${displayVal.toLocaleString('fr-FR', {
        minimumFractionDigits: 1,
        maximumFractionDigits: 2,
      })} ${unitSuffix}`;
    }
    return `${val.toLocaleString('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} MAD`;
  };

  const formatPercent = (val: number | null, digits = 1) => {
    if (val === null) return '—';
    const sign = val > 0 ? '+' : '';
    return `${sign}${val.toFixed(digits)} %`;
  };

  const formatRatio = (val: number | null, suffix = 'x', digits = 1) => {
    if (val === null) return '—';
    return `${val.toFixed(digits)} ${suffix}`;
  };

  return (
    <section className="flex flex-col gap-6 pt-2">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Analyse fondamentale
            </h2>
            {ticker && (
              <span className="text-xs font-mono font-medium text-slate-500">
                · {companyName || ticker} ({ticker})
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Indicateurs financiers calculés automatiquement à partir des états financiers saisis
          </p>
        </div>

        {/* Completeness Badge */}
        <div className="flex items-center gap-2 self-start sm:self-auto bg-white px-3 py-1.5 rounded-lg border border-slate-200 text-xs">
          <span className="text-slate-500 font-medium">Complétude des données :</span>
          <span className="font-bold text-slate-900 font-mono tabular-nums">
            {completeness.calculableCount} / {completeness.totalCount} indicateurs
          </span>
        </div>
      </div>

      {/* Missing Inputs Drawer if some indicators cannot be calculated */}
      {completeness.missingFieldNames.length > 0 && (
        <div className="p-3 bg-amber-50/60 border border-amber-200/80 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div className="flex flex-col gap-1">
            <span className="font-semibold text-amber-950">
              Champs complémentaires requis pour débloquer l&apos;ensemble des ratios :
            </span>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-amber-800">
              {completeness.missingFieldNames.map((inputName, i) => (
                <span key={i} className="inline-flex items-center gap-1">
                  <span className="text-amber-500">·</span>
                  {inputName}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 5 Fundamental Analysis Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CARD 1 : CROISSANCE */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-md bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">1. Croissance de l&apos;activité</h3>
              </div>
              <span className="text-[11px] text-slate-500">
                {reportType === 'annual' ? 'Base annuelle' : 'Base semestrielle'}
              </span>
            </div>

            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              Mesure la dynamique commerciale et l&apos;évolution du résultat net au cours des derniers exercices.
            </p>

            {/* Visual 3-Year Comparison Grid */}
            <div className="mb-5 bg-slate-50/80 p-3.5 rounded-lg border border-slate-100">
              <span className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider block mb-2">
                Trajectoire Chiffre d&apos;affaires & Bénéfice net
              </span>
              <div className="grid grid-cols-3 gap-3 text-center">
                {growth.chartData.map((row, idx) => (
                  <div key={idx} className="flex flex-col gap-1 p-2 bg-white rounded border border-slate-200/80">
                    <span className="text-[11px] font-semibold text-slate-500">{row.year}</span>
                    <div className="text-xs font-mono font-bold text-slate-900 tabular-nums">
                      {formatMAD(row.revenue)}
                    </div>
                    <div className="text-[11px] font-mono text-emerald-700 tabular-nums">
                      Net : {formatMAD(row.netProfit)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* YoY Growth Rates */}
            <div className="flex flex-col gap-3 text-xs mb-4">
              <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                <span className="text-slate-600 flex items-center">
                  Croissance CA (YoY)
                  <MetricTooltip
                    formula="((CA N / CA N-1) - 1) × 100"
                    example="1 907 M vs 1 036 M = +84,1 %"
                  />
                </span>
                <div className="flex gap-3 font-mono tabular-nums font-semibold">
                  {growth.revenueYoY.length > 0 ? (
                    growth.revenueYoY.map((y, i) => (
                      <span key={i} className="text-slate-900">
                        {y.year} : {y.result.rate !== null ? formatPercent(y.result.rate) : y.result.note}
                      </span>
                    ))
                  ) : (
                    <span className="text-slate-400 font-normal">Données insuffisantes</span>
                  )}
                </div>
              </div>

              <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                <span className="text-slate-600 flex items-center">
                  Croissance Résultat Net (YoY)
                  <MetricTooltip
                    formula="((Résultat N / Résultat N-1) - 1) × 100"
                    example="198 M vs 121 M = +63,6 %"
                  />
                </span>
                <div className="flex gap-3 font-mono tabular-nums font-semibold">
                  {growth.profitYoY.length > 0 ? (
                    growth.profitYoY.map((y, i) => (
                      <span key={i} className="text-slate-900">
                        {y.year} : {y.result.rate !== null ? formatPercent(y.result.rate) : (y.result.note || 'Non significatif')}
                      </span>
                    ))
                  ) : (
                    <span className="text-slate-400 font-normal">Données insuffisantes</span>
                  )}
                </div>
              </div>

              {/* CAGRs */}
              <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                <span className="text-slate-600 flex items-center">
                  CAGR Chiffre d&apos;affaires ({growth.revenueCAGR.intervals || 2} ans)
                  <MetricTooltip
                    formula="((CA final / CA initial)^(1/n) - 1) × 100"
                    example="((1 907 / 774)^(1/2) - 1) × 100 = +57,0 % par an"
                  />
                </span>
                <span className="font-mono font-bold text-slate-900 tabular-nums">
                  {growth.revenueCAGR.rate !== null
                    ? formatPercent(growth.revenueCAGR.rate)
                    : (growth.revenueCAGR.note || 'Données insuffisantes')}
                </span>
              </div>

              <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                <span className="text-slate-600 flex items-center">
                  CAGR Résultat Net ({growth.profitCAGR.intervals || 2} ans)
                  <MetricTooltip
                    formula="((Bénéfice final / Bénéfice initial)^(1/n) - 1) × 100"
                    example="((198 / 98)^(1/2) - 1) × 100 = +42,1 % par an"
                  />
                </span>
                <span className="font-mono font-bold text-slate-900 tabular-nums">
                  {growth.profitCAGR.rate !== null
                    ? formatPercent(growth.profitCAGR.rate)
                    : (growth.profitCAGR.note || 'Non significatif')}
                </span>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded border border-slate-100">
            <strong>Règle d&apos;analyse :</strong> Le CAGR mesure le taux de croissance annuel moyen composé. Pour 3 années consécutives, l&apos;intervalle est de 2 ans.
          </div>
        </div>

        {/* CARD 2 : RENTABILITÉ */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-md bg-blue-50 text-blue-700 flex items-center justify-center">
                  <Percent className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">2. Rentabilité & Marges</h3>
              </div>
              <span className="text-[11px] text-slate-500">Performance économique</span>
            </div>

            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              Évalue la capacité de l&apos;entreprise à convertir ses ventes en bénéfice réel et à rémunérer les fonds propres investis.
            </p>

            <div className="flex flex-col gap-3 text-xs mb-4">
              {/* EPS */}
              <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                <span className="text-slate-600 flex items-center">
                  BPA (EPS) calculé
                  <MetricTooltip
                    formula="Résultat net part du groupe / Nombre d'actions"
                    example="198 M MAD / 4 331 000 actions = 45,72 MAD"
                  />
                </span>
                <div className="text-right">
                  <span className="font-mono font-bold text-slate-900 tabular-nums">
                    {profitability.calculatedEPS.value !== null
                      ? formatMAD(profitability.calculatedEPS.value, false)
                      : 'Données insuffisantes'}
                  </span>
                  {profitability.manualEPS !== null && (
                    <span className="block text-[10px] text-slate-500 font-mono">
                      (Saisi : {profitability.manualEPS.toFixed(2)} MAD)
                    </span>
                  )}
                </div>
              </div>

              {/* Warning if EPS discrepancy */}
              {profitability.epsComparison.hasDiscrepancy && (
                <div className="p-2 bg-amber-50 border border-amber-200 rounded text-[11px] text-amber-900 flex items-start gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                  <span>{profitability.epsComparison.message}</span>
                </div>
              )}

              {/* Marge opérationnelle */}
              <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                <span className="text-slate-600 flex items-center">
                  Marge opérationnelle (EBIT)
                  <MetricTooltip
                    formula="(Résultat d'exploitation / Chiffre d'affaires) × 100"
                    example="286 M MAD / 1 907 M MAD = 15,0 %"
                  />
                </span>
                <span className="font-mono font-bold text-slate-900 tabular-nums">
                  {profitability.operatingMargin !== null
                    ? `${profitability.operatingMargin.toFixed(1)} %`
                    : 'Données insuffisantes'}
                </span>
              </div>

              {/* Marge nette */}
              <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                <span className="text-slate-600 flex items-center">
                  Marge nette
                  <MetricTooltip
                    formula="(Résultat net / Chiffre d'affaires) × 100"
                    example="198 M MAD / 1 907 M MAD = 10,4 %"
                  />
                </span>
                <div className="text-right">
                  <span className="font-mono font-bold text-slate-900 tabular-nums">
                    {profitability.netMargin !== null
                      ? `${profitability.netMargin.toFixed(1)} %`
                      : 'Données insuffisantes'}
                  </span>
                  <span className="block text-[10px] text-slate-400">
                    {profitability.marginScopeNote}
                  </span>
                </div>
              </div>

              {/* ROE */}
              <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                <span className="text-slate-600 flex items-center">
                  ROE (Rentabilité des capitaux propres)
                  <MetricTooltip
                    formula="(Résultat net part du groupe / Capitaux propres) × 100"
                    example="198 M MAD / 1 150 M MAD = 17,2 %"
                  />
                </span>
                <div className="text-right">
                  <span className="font-mono font-bold text-slate-900 tabular-nums">
                    {profitability.roe.value !== null
                      ? `${profitability.roe.value.toFixed(1)} %`
                      : (profitability.roe.note || 'Données insuffisantes')}
                  </span>
                  <span className="block text-[10px] text-slate-400">
                    Capitaux propres de clôture
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded border border-slate-100">
            <strong>Exemple concret :</strong> Un ROE de 15 % signifie que l&apos;entreprise génère 15 MAD de profit net annuel pour chaque tranche de 100 MAD de fonds propres apportés.
          </div>
        </div>

        {/* CARD 3 : VALORISATION BOURSIÈRE */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-md bg-indigo-50 text-indigo-700 flex items-center justify-center">
                  <Coins className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">3. Valorisation boursière</h3>
              </div>
              <span className="text-[11px] text-slate-500">Multiples de marché</span>
            </div>

            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              Multiples de prix rapportés aux bénéfices et à l&apos;actif net. Un PER bas ne constitue pas à lui seul une preuve de sous-évaluation.
            </p>

            <div className="flex flex-col gap-3 text-xs mb-4">
              {/* PER */}
              <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                <span className="text-slate-600 flex items-center">
                  PER (Price Earnings Ratio)
                  <MetricTooltip
                    formula="Cours de l'action / BPA annuel"
                    example="715 MAD / 23,8 MAD = 30,0x"
                  />
                </span>
                <div className="text-right">
                  <span className="font-mono font-bold text-slate-900 tabular-nums">
                    {valuation.per.value !== null && valuation.per.isSignificant
                      ? formatRatio(valuation.per.value)
                      : (valuation.per.note || 'Données insuffisantes')}
                  </span>
                  {valuation.manualPER !== null && (
                    <span className="block text-[10px] text-slate-500 font-mono">
                      (Saisi : {valuation.manualPER}x)
                    </span>
                  )}
                </div>
              </div>

              {/* Warning if PER discrepancy */}
              {valuation.perComparison.hasDiscrepancy && (
                <div className="p-2 bg-amber-50 border border-amber-200 rounded text-[11px] text-amber-900 flex items-start gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                  <span>{valuation.perComparison.message}</span>
                </div>
              )}

              {/* PBR */}
              <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                <span className="text-slate-600 flex items-center">
                  PBR (Price to Book Ratio)
                  <MetricTooltip
                    formula="Cours / (Capitaux propres / Nombre d'actions)"
                    example="715 MAD / (1 150 M / 4,331 M) = 2,7x"
                  />
                </span>
                <div className="text-right">
                  <span className="font-mono font-bold text-slate-900 tabular-nums">
                    {valuation.pbr.value !== null && valuation.pbr.isSignificant
                      ? formatRatio(valuation.pbr.value)
                      : (valuation.pbr.note || 'Données insuffisantes')}
                  </span>
                  {valuation.pbr.bookValuePerShare !== null && (
                    <span className="block text-[10px] text-slate-400 font-mono">
                      VCP/action : {valuation.pbr.bookValuePerShare.toFixed(1)} MAD
                    </span>
                  )}
                </div>
              </div>

              {/* Rendement du dividende */}
              <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                <span className="text-slate-600 flex items-center">
                  Rendement du dividende (Dividend Yield)
                  <MetricTooltip
                    formula="(Dividende par action / Cours de l'action) × 100"
                    example="12 MAD / 715 MAD = 1,7 %"
                  />
                </span>
                <span className="font-mono font-bold text-slate-900 tabular-nums">
                  {valuation.dividendYield !== null
                    ? `${valuation.dividendYield.toFixed(2)} %`
                    : 'Non renseigné'}
                </span>
              </div>

              {/* Payout ratio */}
              <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                <span className="text-slate-600 flex items-center">
                  Taux de distribution (Payout Ratio)
                  <MetricTooltip
                    formula="(Dividende par action / BPA) × 100"
                    example="12 MAD / 23,8 MAD = 50,4 %"
                  />
                </span>
                <span className="font-mono font-bold text-slate-900 tabular-nums">
                  {valuation.payoutRatio.value !== null && valuation.payoutRatio.isApplicable
                    ? `${valuation.payoutRatio.value.toFixed(1)} %`
                    : (valuation.payoutRatio.note || 'Données insuffisantes')}
                </span>
              </div>

              {/* 52-Week Corridor */}
              <div className="flex flex-col gap-1.5 pt-1 border-t border-slate-100">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 flex items-center">
                    Position dans le couloir 52 semaines
                    <MetricTooltip
                      formula="((Cours actuel - Plus bas) / (Plus haut - Plus bas)) × 100"
                      example="(715 - 490) / (745 - 490) = 88,2 %"
                    />
                  </span>
                  <span className="font-mono font-bold text-slate-900 tabular-nums">
                    {valuation.pricePosition52w.value !== null
                      ? `${valuation.pricePosition52w.value.toFixed(1)} %`
                      : 'Données insuffisantes'}
                  </span>
                </div>
                {valuation.pricePosition52w.value !== null && (
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden mt-1">
                    <div
                      className="bg-indigo-600 h-2 rounded-full transition-all"
                      style={{ width: `${Math.min(100, Math.max(0, valuation.pricePosition52w.value))}%` }}
                    />
                  </div>
                )}
                <p className="text-[10px] text-slate-500 leading-tight mt-0.5">
                  {valuation.pricePosition52w.note}
                </p>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded border border-slate-100">
            <strong>Avertissement :</strong> Les cours 52 semaines sont des prix de marché passés, en aucun cas des estimations de juste valeur fondamentale.
          </div>
        </div>

        {/* CARD 4 : ENDETTEMENT & STABILITÉ */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-md bg-amber-50 text-amber-700 flex items-center justify-center">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">4. Endettement & Solvabilité</h3>
              </div>
              <span className="text-[11px] text-slate-500">Solidité du bilan</span>
            </div>

            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              Examine la capacité de l&apos;entreprise à rembourser ses engagements financiers et à honorer la charge d&apos;intérêts.
            </p>

            <div className="flex flex-col gap-3 text-xs mb-4">
              {/* Endettement net */}
              <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                <span className="text-slate-600 flex items-center">
                  Endettement net calculé
                  <MetricTooltip
                    formula={debt.netDebt.formulaDescription}
                    example="1 380 M (dettes) - 335 M (cash) = 1 045 M MAD"
                  />
                </span>
                <div className="text-right">
                  <span className="font-mono font-bold text-slate-900 tabular-nums">
                    {debt.netDebt.valueMAD !== null
                      ? formatMAD(debt.netDebt.valueMAD)
                      : 'Données insuffisantes'}
                  </span>
                  {debt.manualNetDebtMAD !== null && (
                    <span className="block text-[10px] text-slate-500 font-mono">
                      (Saisi : {formatMAD(debt.manualNetDebtMAD)})
                    </span>
                  )}
                </div>
              </div>

              {/* Warning if net debt discrepancy */}
              {debt.netDebtComparison.hasDiscrepancy && (
                <div className="p-2 bg-amber-50 border border-amber-200 rounded text-[11px] text-amber-900 flex items-start gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                  <span>{debt.netDebtComparison.message}</span>
                </div>
              )}

              {/* Net Debt / EBITDA */}
              <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                <span className="text-slate-600 flex items-center">
                  Dette Nette / EBITDA
                  <MetricTooltip
                    formula="Endettement net / EBITDA annuel"
                    example="1 045 M MAD / 511 M MAD = 2,05 ans d'EBITDA"
                  />
                </span>
                <div className="text-right">
                  <span className="font-mono font-bold text-slate-900 tabular-nums">
                    {debt.netDebtToEbitda.value !== null && debt.netDebtToEbitda.isApplicable
                      ? formatRatio(debt.netDebtToEbitda.value, 'ans')
                      : (debt.netDebtToEbitda.note || 'Données insuffisantes')}
                  </span>
                </div>
              </div>

              {/* Debt to Equity */}
              <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                <span className="text-slate-600 flex items-center">
                  Dette financière / Fonds propres (Gearing)
                  <MetricTooltip
                    formula="Dettes financières totales / Capitaux propres"
                    example="1 450 M MAD / 1 220 M MAD = 1,19x (ou 119 %)"
                  />
                </span>
                <span className="font-mono font-bold text-slate-900 tabular-nums">
                  {debt.debtToEquity !== null
                    ? `${(debt.debtToEquity * 100).toFixed(1)} % (${debt.debtToEquity.toFixed(2)}x)`
                    : 'Données insuffisantes'}
                </span>
              </div>

              {/* Interest coverage */}
              <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                <span className="text-slate-600 flex items-center">
                  Couverture des intérêts
                  <MetricTooltip
                    formula="Résultat d'exploitation / Charges d'intérêts"
                    example="286 M MAD / 72 M MAD = 4,0x"
                  />
                </span>
                <span className="font-mono font-bold text-slate-900 tabular-nums">
                  {debt.interestCoverage.value !== null && debt.interestCoverage.isApplicable
                    ? formatRatio(debt.interestCoverage.value)
                    : (debt.interestCoverage.note || 'Données insuffisantes')}
                </span>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded border border-slate-100">
            <strong>Interprétation :</strong> Un ratio Dette Nette / EBITDA inférieur à 3,0x est généralement considéré comme un niveau d&apos;endettement sain et soutenable par les flux d&apos;exploitation.
          </div>
        </div>

        {/* CARD 5 : FLUX DE TRÉSORERIE */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs flex flex-col justify-between lg:col-span-2">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-md bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <ArrowUpDown className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">5. Flux de trésorerie & Free Cash Flow</h3>
              </div>
              <span className="text-[11px] text-slate-500">Liquidités réelles générées</span>
            </div>

            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              Le profit comptable ne garantit pas la génération de liquidités. Le Free Cash Flow (FCF) mesure l&apos;argent disponible après paiement de l&apos;ensemble des investissements (CapEx).
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-slate-500 text-[11px] block mb-1">
                  Cash Flow Opérationnel
                </span>
                <span className="text-sm font-mono font-bold text-slate-900 tabular-nums">
                  {formatMAD(cashFlow.fcf.normalizedCapexMAD !== null ? (cashFlow.fcf.valueMAD! + cashFlow.fcf.normalizedCapexMAD!) : null)}
                </span>
                <span className="text-[10px] text-slate-500 block mt-1">
                  Cash généré par les opérations courantes
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-slate-500 text-[11px] block mb-1">
                  Investissements (CapEx normalisé)
                </span>
                <span className="text-sm font-mono font-bold text-slate-900 tabular-nums">
                  {formatMAD(cashFlow.fcf.normalizedCapexMAD)}
                </span>
                <span className="text-[10px] text-slate-500 block mt-1">
                  Dépenses d&apos;investissement matériel/immatériel
                </span>
              </div>

              <div className="p-3 bg-emerald-50/60 rounded-lg border border-emerald-200">
                <span className="text-emerald-800 text-[11px] font-medium block mb-1">
                  Free Cash Flow (FCF calculé)
                </span>
                <span className="text-base font-mono font-bold text-emerald-950 tabular-nums">
                  {formatMAD(cashFlow.fcf.valueMAD)}
                </span>
                <span className="text-[10px] text-emerald-800 block mt-1">
                  Flux disponible après CapEx
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-2 border-t border-slate-100 text-xs">
              <div className="flex items-center gap-1.5 text-slate-700">
                <span>Taux de conversion du résultat en cash :</span>
                <span className="font-mono font-bold text-slate-900 tabular-nums">
                  {cashFlow.cashConversion.value !== null && cashFlow.cashConversion.isApplicable
                    ? `${cashFlow.cashConversion.value.toFixed(1)} %`
                    : (cashFlow.cashConversion.note || 'Données insuffisantes')}
                </span>
                <MetricTooltip
                  formula="(Cash-flow opérationnel / Résultat net) × 100"
                  example="445 M MAD / 198 M MAD = 224,7 %"
                />
              </div>

              {cashFlow.manualFcfMAD !== null && (
                <div className="text-[11px] text-slate-500 font-mono">
                  FCF déclaré dans le rapport : {formatMAD(cashFlow.manualFcfMAD)}
                </div>
              )}
            </div>

            {cashFlow.fcfComparison.hasDiscrepancy && (
              <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-[11px] text-amber-900 flex items-start gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                <span>{cashFlow.fcfComparison.message}</span>
              </div>
            )}
          </div>

          <div className="mt-3 text-[11px] text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100 leading-relaxed">
            <strong>Explication pédagogique du FCF :</strong> {cashFlow.fcf.note}
          </div>
        </div>
      </div>
    </section>
  );
}
