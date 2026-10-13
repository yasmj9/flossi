'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Compass,
  TrendingUp,
  AlertTriangle,
  Save,
  Clock,
  Shield,
  Filter,
  DollarSign,
  Calendar,
  X,
} from 'lucide-react';
import { loadSavedCompanies } from '@/lib/savedCompaniesStorage';

interface CompanyDecisionResult {
  ticker: string;
  companyName: string;
  sector: string;
  currentPrice: number;
  priceObservationDate: string;
  isPriceStale: boolean;
  fairValue: number;
  targetBuyPrice: number;
  discountToFairValuePercent: number;
  qualityScore: number;
  buyMonthScore: number;
  dataReliabilityScore: number;
  shariahStatus: string;
  shariahVerdict: string;
  isOwned: boolean;
  sharesOwned: number;
  holdingWeightPercent: number;
  averageCostPrice: number;
  unrealizedGainMAD: number;
  unrealizedGainPercent: number;
  decision: string;
  decisionLabel: string;
  decisionBadgeColor: string;
  headline: string;
  reasons: string[];
  positivePoints: string[];
  riskWarnings: string[];
  actionGuidance: string;
  rank?: number;
}

interface MonthlyPurchaseSuggestion {
  ticker: string;
  companyName: string;
  sector: string;
  recommendedShares: number;
  pricePerShare: number;
  totalCost: number;
  estimatedFees: number;
  totalOutflow: number;
  whySelected: string;
  diversificationBenefit: string;
  remainingRisks: string;
}

interface MonthlyDecisionReport {
  evaluationDate: string;
  timeHorizon: {
    totalYears: number;
    startDate: string;
    targetEndDate: string;
    monthsRemaining: number;
    mandatoryWithdrawal: boolean;
    isApproachingWithdrawalWarning: boolean;
    horizonNote: string;
  };
  portfolioSummary: {
    totalPortfolioValue: number;
    availableCash: number;
    stockMarketValue: number;
    investedCapital: number;
    unrealizedGainMAD: number;
    unrealizedGainPercent: number;
  };
  buyCandidates: CompanyDecisionResult[];
  buyMoreCandidates: CompanyDecisionResult[];
  holdingsReview: CompanyDecisionResult[];
  waitList: CompanyDecisionResult[];
  blockedOrIneligible: CompanyDecisionResult[];
  suggestedPurchases: MonthlyPurchaseSuggestion[];
  suggestedAllocationSummary: {
    totalAllocatedCost: number;
    remainingCash: number;
    allocatedCount: number;
  };
}

interface MonthlyDecisionsSectionProps {
  showToast: (text: string, type: 'success' | 'error' | 'info') => void;
}

export function MonthlyDecisionsSection({ showToast }: MonthlyDecisionsSectionProps) {
  const [report, setReport] = useState<MonthlyDecisionReport | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedCompanyDetail, setSelectedCompanyDetail] = useState<CompanyDecisionResult | null>(null);
  const [savedSnapshots, setSavedSnapshots] = useState<any[]>([]);
  const [showConfigModal, setShowConfigModal] = useState<boolean>(false);

  // Critères configurables
  const [minQualityScore, setMinQualityScore] = useState<number>(60);
  const [minBuyMonthScore, setMinBuyMonthScore] = useState<number>(65);
  const [requiredMarginOfSafety, setRequiredMarginOfSafety] = useState<number>(15);
  const [maxCompanyAllocation, setMaxCompanyAllocation] = useState<number>(25);

  const fetchDecisions = useCallback(async () => {
    try {
      setLoading(true);
      // Récupérer les analyses enregistrées localement
      const clientSaved = loadSavedCompanies();

      const res = await fetch('/api/decisions/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          criteria: {
            minQualityScore,
            minBuyMonthScore,
            requiredMarginOfSafetyPercent: requiredMarginOfSafety,
            maxCompanyAllocationPercent: maxCompanyAllocation,
          },
          clientSavedCompanies: clientSaved,
        }),
      });

      if (res.ok) {
        const data: MonthlyDecisionReport = await res.json();
        setReport(data);
      } else {
        showToast('Impossible de calculer les décisions d’investissement.', 'error');
      }
    } catch {
      showToast('Erreur de communication avec le moteur de décision NestJS.', 'error');
    } finally {
      setLoading(false);
    }
  }, [minQualityScore, minBuyMonthScore, requiredMarginOfSafety, maxCompanyAllocation, showToast]);

  const fetchSnapshots = useCallback(async () => {
    try {
      const res = await fetch('/api/decisions/snapshots');
      if (res.ok) {
        const data = await res.json();
        setSavedSnapshots(data);
      }
    } catch {
      // Ignorer
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      fetchDecisions();
      fetchSnapshots();
    }, 0);
    return () => clearTimeout(t);
  }, [fetchDecisions, fetchSnapshots]);

  const handleSaveSnapshot = async () => {
    if (!report) return;
    try {
      const res = await fetch('/api/decisions/snapshots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(report),
      });
      if (res.ok) {
        showToast('Revue mensuelle sauvegardée avec succès dans l’historique PostgreSQL !', 'success');
        fetchSnapshots();
      } else {
        showToast('Erreur lors de la sauvegarde de la revue mensuelle.', 'error');
      }
    } catch {
      showToast('Erreur réseau lors de la sauvegarde.', 'error');
    }
  };

  if (loading && !report) {
    return (
      <div className="bg-white rounded-2xl p-12 text-center text-slate-500 shadow-sm border border-slate-200">
        Calcul du plan mensuel et évaluation intelligente de vos opportunités d'investissement...
      </div>
    );
  }

  const pSum = report?.portfolioSummary;
  const timeH = report?.timeHorizon;

  return (
    <div className="space-y-8">
      {/* 1. EN-TÊTE PRINCIPAL & CONTEXTE HORIZON */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <Compass className="w-6 h-6 text-emerald-600" />
              <h2 className="text-xl font-bold text-slate-900">
                Décisions d'Investissement Mensuelles (Bourse de Casablanca)
              </h2>
            </div>
            <p className="text-sm text-slate-600 mt-1">
              Moteur déterministe d'aide à la décision pour votre épargne de 4 000 MAD/mois sur un horizon de 4 ans.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setShowConfigModal(true)}
              className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center gap-1.5"
            >
              <Filter className="w-3.5 h-3.5" /> Seuils & Paramètres
            </button>
            <button
              type="button"
              onClick={fetchDecisions}
              className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              Réévaluer
            </button>
            <button
              type="button"
              onClick={handleSaveSnapshot}
              className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Save className="w-3.5 h-3.5" /> Sauvegarder la revue
            </button>
          </div>
        </div>

        {/* ALERTE HORIZON TEMPOREL */}
        {timeH && (
          <div
            className={`p-4 rounded-xl border text-xs flex items-start gap-3 ${
              timeH.isApproachingWithdrawalWarning
                ? 'bg-amber-50 border-amber-200 text-amber-900'
                : 'bg-emerald-50 border-emerald-200 text-emerald-900'
            }`}
          >
            <Clock
              className={`w-4 h-4 shrink-0 mt-0.5 ${
                timeH.isApproachingWithdrawalWarning ? 'text-amber-600' : 'text-emerald-600'
              }`}
            />
            <div>
              <span className="font-bold">Horizon d'investissement (4 ans) : </span>
              <span>{timeH.horizonNote}</span>
            </div>
          </div>
        )}

        {/* RUBAN RÉSUMÉ DU PORTEFEUILLE RÉEL */}
        {pSum && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80">
              <div className="text-xs text-slate-500 font-medium">Valeur Totale Portefeuille</div>
              <div className="text-lg font-bold text-slate-900 tabular-nums">
                {pSum.totalPortfolioValue.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MAD
              </div>
            </div>

            <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-200/80">
              <div className="text-xs text-emerald-800 font-medium">Liquidités Réelles Disponibles</div>
              <div className="text-lg font-bold text-emerald-950 tabular-nums">
                {pSum.availableCash.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MAD
              </div>
              <div className="text-[11px] text-emerald-700">Seul capital déployable pour ce mois</div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80">
              <div className="text-xs text-slate-500 font-medium">Valeur des Actions Détenues</div>
              <div className="text-lg font-bold text-slate-900 tabular-nums">
                {pSum.stockMarketValue.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MAD
              </div>
            </div>

            <div
              className={`p-4 rounded-xl border ${
                pSum.unrealizedGainMAD >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'
              }`}
            >
              <div
                className={`text-xs font-medium ${
                  pSum.unrealizedGainMAD >= 0 ? 'text-emerald-800' : 'text-rose-800'
                }`}
              >
                Plus-Value Latente
              </div>
              <div
                className={`text-lg font-bold tabular-nums ${
                  pSum.unrealizedGainMAD >= 0 ? 'text-emerald-950' : 'text-rose-950'
                }`}
              >
                {pSum.unrealizedGainMAD >= 0 ? '+' : ''}
                {pSum.unrealizedGainMAD.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MAD
              </div>
              <div
                className={`text-[11px] ${
                  pSum.unrealizedGainMAD >= 0 ? 'text-emerald-700' : 'text-rose-700'
                }`}
              >
                ({pSum.unrealizedGainPercent >= 0 ? '+' : ''}
                {pSum.unrealizedGainPercent.toFixed(2)}%)
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 2. SUGGESTIONS D'ACHAT CONCRÈTES DU MOIS (SUR LIQUIDITÉS RÉELLES) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-600" />
              Plan d'Allocation Budgétaire Suggéré ce Mois-ci
            </h3>
            <p className="text-xs text-slate-600 mt-0.5">
              Affectation optimisée en actions entières basée sur vos {pSum?.availableCash.toLocaleString('fr-FR')} MAD de liquidités confirmées.
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs font-semibold text-slate-500">Montant alloué : </span>
            <span className="text-sm font-bold text-emerald-700 tabular-nums">
              {report?.suggestedAllocationSummary.totalAllocatedCost.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} MAD
            </span>
          </div>
        </div>

        {report?.suggestedPurchases && report.suggestedPurchases.length > 0 ? (
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 text-xs font-semibold uppercase bg-slate-50">
                    <th className="py-3 px-4">Action Sélectionnée</th>
                    <th className="py-3 px-4">Secteur</th>
                    <th className="py-3 px-4 text-right">Actions suggérées</th>
                    <th className="py-3 px-4 text-right">Cours</th>
                    <th className="py-3 px-4 text-right">Frais estimés</th>
                    <th className="py-3 px-4 text-right">Montant Total</th>
                    <th className="py-3 px-4">Pourquoi cette sélection ?</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {report.suggestedPurchases.map((sug) => (
                    <tr key={sug.ticker} className="hover:bg-slate-50/80">
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {sug.companyName} <span className="text-xs text-slate-500 font-normal">({sug.ticker})</span>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-600">{sug.sector}</td>
                      <td className="py-3.5 px-4 text-right font-bold text-emerald-700 tabular-nums">
                        {sug.recommendedShares} actions
                      </td>
                      <td className="py-3.5 px-4 text-right text-slate-700 tabular-nums">
                        {sug.pricePerShare.toFixed(2)} MAD
                      </td>
                      <td className="py-3.5 px-4 text-right text-slate-500 text-xs tabular-nums">
                        {sug.estimatedFees.toFixed(2)} MAD
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-slate-900 tabular-nums">
                        {sug.totalOutflow.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} MAD
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-700 max-w-xs">{sug.whySelected}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs flex items-center justify-between">
              <span className="text-slate-600">
                Liquidités restantes non allouées (reportées sur les mois suivants) :
              </span>
              <span className="font-bold text-slate-900 tabular-nums">
                {report.suggestedAllocationSummary.remainingCash.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} MAD
              </span>
            </div>
          </div>
        ) : (
          <div className="p-6 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-slate-600 text-xs text-center space-y-1">
            <p className="font-semibold text-slate-800">
              Aucun achat recommandé avec une marge de sécurité suffisante ce mois-ci.
            </p>
            <p>
              Recommandation : Conserver vos liquidités disponibles ({pSum?.availableCash.toLocaleString('fr-FR')} MAD) en attente d’opportunités plus attractives.
            </p>
          </div>
        )}
      </div>

      {/* 3. OPPORTUNITÉS D'ACHAT & RENFORCEMENT CLASSÉES (CANDIDATS ÉLIGIBLES) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
        <div className="border-b border-slate-100 pb-4">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
            Classement des Opportunités d'Achat Éligibles
          </h3>
          <p className="text-xs text-slate-600 mt-0.5">
            Actions respectant la conformité Shariah, la solidité financière minimale et une marge de sécurité protectrice.
          </p>
        </div>

        {report && (report.buyCandidates.length > 0 || report.buyMoreCandidates.length > 0) ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 text-xs font-semibold uppercase bg-slate-50">
                  <th className="py-3 px-4">Rang</th>
                  <th className="py-3 px-4">Entreprise</th>
                  <th className="py-3 px-4">Secteur</th>
                  <th className="py-3 px-4 text-right">Cours Actuel</th>
                  <th className="py-3 px-4 text-right">Juste Valeur</th>
                  <th className="py-3 px-4 text-right">Marge / Décote</th>
                  <th className="py-3 px-4 text-center">Score Qualité</th>
                  <th className="py-3 px-4 text-center">Score Achat</th>
                  <th className="py-3 px-4">Décision</th>
                  <th className="py-3 px-4 text-center">Détails</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[...report.buyCandidates, ...report.buyMoreCandidates]
                  .sort((a, b) => (a.rank || 99) - (b.rank || 99))
                  .map((cand) => (
                    <tr key={cand.ticker} className="hover:bg-slate-50/80">
                      <td className="py-3.5 px-4 font-bold text-slate-900 text-xs">
                        {cand.rank ? `#${cand.rank}` : '-'}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {cand.companyName} <span className="text-xs text-slate-500 font-normal">({cand.ticker})</span>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-600">{cand.sector}</td>
                      <td className="py-3.5 px-4 text-right font-semibold text-slate-900 tabular-nums">
                        {cand.currentPrice.toFixed(2)} MAD
                      </td>
                      <td className="py-3.5 px-4 text-right text-slate-700 tabular-nums">
                        {cand.fairValue.toFixed(2)} MAD
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-emerald-600 tabular-nums">
                        +{cand.discountToFairValuePercent.toFixed(1)}%
                      </td>
                      <td className="py-3.5 px-4 text-center font-semibold text-slate-900 tabular-nums">
                        {cand.qualityScore}/100
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-emerald-700 tabular-nums">
                        {cand.buyMonthScore}/100
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-xs font-semibold text-emerald-800">
                          {cand.decisionLabel}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => setSelectedCompanyDetail(cand)}
                          className="text-xs font-semibold text-emerald-600 hover:text-emerald-800 underline cursor-pointer"
                        >
                          Pourquoi ?
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6 bg-slate-50 rounded-xl text-xs text-slate-600 text-center">
            Aucun candidat à l'achat immédiat ne remplit tous les critères ce mois-ci. Consultez la liste d'attente ci-dessous.
          </div>
        )}
      </div>

      {/* 4. ANALYSE ET REVUE DE MES POSITIONS DÉTENUES (HOLD / REVIEW REDUCE / REVIEW SELL) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
        <div className="border-b border-slate-100 pb-4">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-600" />
            Analyse de Mes Positions Actuelles (Conserver / Alléger / Vendre)
          </h3>
          <p className="text-xs text-slate-600 mt-0.5">
            Évaluation distincte de l'achat : une action trop chère pour être achetée n'est pas nécessairement à vendre.
          </p>
        </div>

        {report?.holdingsReview && report.holdingsReview.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 text-xs font-semibold uppercase bg-slate-50">
                  <th className="py-3 px-4">Position</th>
                  <th className="py-3 px-4 text-right">Actions détenues</th>
                  <th className="py-3 px-4 text-right">Prix Moyen</th>
                  <th className="py-3 px-4 text-right">Cours</th>
                  <th className="py-3 px-4 text-right">Poids portefeuille</th>
                  <th className="py-3 px-4 text-right">Plus-value latente</th>
                  <th className="py-3 px-4">Décision de position</th>
                  <th className="py-3 px-4">Justification</th>
                  <th className="py-3 px-4 text-center">Détails</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {report.holdingsReview.map((pos) => {
                  const isPositive = pos.unrealizedGainMAD >= 0;
                  return (
                    <tr key={pos.ticker} className="hover:bg-slate-50/80">
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {pos.companyName} <span className="text-xs text-slate-500 font-normal">({pos.ticker})</span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-slate-900 tabular-nums">
                        {pos.sharesOwned}
                      </td>
                      <td className="py-3.5 px-4 text-right text-slate-700 tabular-nums">
                        {pos.averageCostPrice.toFixed(2)} MAD
                      </td>
                      <td className="py-3.5 px-4 text-right font-semibold text-slate-900 tabular-nums">
                        {pos.currentPrice.toFixed(2)} MAD
                      </td>
                      <td className="py-3.5 px-4 text-right text-slate-800 tabular-nums">
                        {pos.holdingWeightPercent.toFixed(1)}%
                      </td>
                      <td
                        className={`py-3.5 px-4 text-right font-semibold tabular-nums ${
                          isPositive ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {isPositive ? '+' : ''}
                        {pos.unrealizedGainPercent.toFixed(1)}%
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`text-xs font-bold ${
                            pos.decision === 'HOLD'
                              ? 'text-blue-800'
                              : pos.decision === 'BUY_MORE_CANDIDATE'
                              ? 'text-emerald-800'
                              : 'text-amber-800'
                          }`}
                        >
                          {pos.decisionLabel}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-600 max-w-xs">{pos.headline}</td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => setSelectedCompanyDetail(pos)}
                          className="text-xs font-semibold text-emerald-600 hover:text-emerald-800 underline cursor-pointer"
                        >
                          Analyse
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-slate-500">Aucune position détenue enregistrée dans votre portefeuille.</p>
        )}
      </div>

      {/* 5. ENTREPRISES EN ATTENTE DE REPLI (WAIT) & BLOQUÉES */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* LISTE D'ATTENTE (WAIT) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-600" />
            Entreprises en Attente de Repli (Wait — Trop chères ce mois-ci)
          </h4>
          {report?.waitList && report.waitList.length > 0 ? (
            <div className="divide-y divide-slate-100 text-xs">
              {report.waitList.map((item) => (
                <div key={item.ticker} className="py-3 flex items-center justify-between gap-3">
                  <div>
                    <span className="font-bold text-slate-900">{item.companyName} ({item.ticker})</span>
                    <span className="text-slate-500 ml-2">Cours : {item.currentPrice} MAD</span>
                    <p className="text-slate-600 mt-0.5">{item.headline}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedCompanyDetail(item)}
                    className="text-emerald-600 font-semibold hover:underline shrink-0"
                  >
                    Détail
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500">Aucune entreprise dans la liste d'attente.</p>
          )}
        </div>

        {/* BLOQUÉES OU DONNÉES INSUFFISANTES */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            Non Éligibles ou Revue Requise (Shariah / Données)
          </h4>
          {report?.blockedOrIneligible && report.blockedOrIneligible.length > 0 ? (
            <div className="divide-y divide-slate-100 text-xs">
              {report.blockedOrIneligible.map((item) => (
                <div key={item.ticker} className="py-3 flex items-center justify-between gap-3">
                  <div>
                    <span className="font-bold text-slate-900">{item.companyName} ({item.ticker})</span>
                    <span className="text-rose-700 font-semibold ml-2">{item.decisionLabel}</span>
                    <p className="text-slate-600 mt-0.5">{item.headline}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedCompanyDetail(item)}
                    className="text-emerald-600 font-semibold hover:underline shrink-0"
                  >
                    Détail
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500">Aucune entreprise bloquée ou exclue.</p>
          )}
        </div>
      </div>

      {/* 6. HISTORIQUE DES INSTANTANÉS MENSUELS (POSTGRESQL) */}
      {savedSnapshots.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-600" />
            Historique des Revues Mensuelles Enregistrées (PostgreSQL)
          </h4>
          <div className="divide-y divide-slate-100 text-xs">
            {savedSnapshots.map((snap) => (
              <div key={snap.id} className="py-3 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-900">
                    Revue du {snap.evaluationDate}
                  </span>
                  <span className="text-slate-500 ml-2">ID : {snap.id}</span>
                </div>
                <span className="text-slate-500">{new Date(snap.createdAt).toLocaleDateString('fr-FR')}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL : POURQUOI CETTE DÉCISION ? */}
      {selectedCompanyDetail && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {selectedCompanyDetail.companyName} ({selectedCompanyDetail.ticker})
                </h3>
                <span className="text-xs font-semibold text-emerald-800">
                  {selectedCompanyDetail.decisionLabel}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCompanyDetail(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                <p className="font-semibold text-slate-900">{selectedCompanyDetail.headline}</p>
                <p className="text-slate-600 mt-1">{selectedCompanyDetail.actionGuidance}</p>
              </div>

              {/* Métriques clés */}
              <div className="grid grid-cols-2 gap-3 text-slate-700">
                <div className="p-2.5 bg-slate-50 rounded-lg">
                  <span className="text-slate-500 block">Score Qualité Fondamentale</span>
                  <span className="font-bold text-slate-900 text-sm">
                    {selectedCompanyDetail.qualityScore}/100
                  </span>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-lg">
                  <span className="text-slate-500 block">Score Achat ce Mois-ci</span>
                  <span className="font-bold text-slate-900 text-sm">
                    {selectedCompanyDetail.buyMonthScore}/100
                  </span>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-lg">
                  <span className="text-slate-500 block">Cours Actuel</span>
                  <span className="font-bold text-slate-900 text-sm">
                    {selectedCompanyDetail.currentPrice} MAD
                  </span>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-lg">
                  <span className="text-slate-500 block">Juste Valeur Estimée</span>
                  <span className="font-bold text-slate-900 text-sm">
                    {selectedCompanyDetail.fairValue.toFixed(2)} MAD
                  </span>
                </div>
              </div>

              {/* Justifications détaillées */}
              <div className="space-y-2">
                <span className="font-bold text-slate-900 block">Justifications de la décision :</span>
                <ul className="list-disc list-inside space-y-1 text-slate-700">
                  {selectedCompanyDetail.reasons.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>

              {/* Points forts */}
              {selectedCompanyDetail.positivePoints.length > 0 && (
                <div className="space-y-1 text-emerald-800">
                  <span className="font-bold block">Points forts :</span>
                  <ul className="list-disc list-inside space-y-0.5">
                    {selectedCompanyDetail.positivePoints.map((p, i) => (
                      <li key={i}>{p}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Facteurs de risque */}
              {selectedCompanyDetail.riskWarnings.length > 0 && (
                <div className="space-y-1 text-rose-800">
                  <span className="font-bold block">Points d'attention & risques :</span>
                  <ul className="list-disc list-inside space-y-0.5">
                    {selectedCompanyDetail.riskWarnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedCompanyDetail(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CONFIGURATION DES SEUILS */}
      {showConfigModal && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-5 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900">Seuils Décisionnels Configurables</h3>
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Score de Qualité Fondamentale Minimum (/100)
                </label>
                <input
                  type="number"
                  min="30"
                  max="90"
                  value={minQualityScore}
                  onChange={(e) => setMinQualityScore(Number(e.target.value) || 60)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 font-bold"
                />
                <span className="text-slate-500 text-[11px]">Défaut : 60/100</span>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Score d'Achat Mensuel Minimum (/100)
                </label>
                <input
                  type="number"
                  min="40"
                  max="95"
                  value={minBuyMonthScore}
                  onChange={(e) => setMinBuyMonthScore(Number(e.target.value) || 65)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 font-bold"
                />
                <span className="text-slate-500 text-[11px]">Défaut : 65/100</span>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Marge de Sécurité Requise (%)
                </label>
                <input
                  type="number"
                  min="5"
                  max="40"
                  value={requiredMarginOfSafety}
                  onChange={(e) => setRequiredMarginOfSafety(Number(e.target.value) || 15)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 font-bold"
                />
                <span className="text-slate-500 text-[11px]">Défaut : 15%</span>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Plafond d'Allocation par Entreprise (%)
                </label>
                <input
                  type="number"
                  min="10"
                  max="50"
                  value={maxCompanyAllocation}
                  onChange={(e) => setMaxCompanyAllocation(Number(e.target.value) || 25)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 font-bold"
                />
                <span className="text-slate-500 text-[11px]">Défaut : 25%</span>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowConfigModal(false);
                  fetchDecisions();
                  showToast('Seuils mis à jour. Évaluation recalculée.', 'success');
                }}
                className="px-5 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold hover:bg-emerald-700"
              >
                Appliquer les seuils
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
