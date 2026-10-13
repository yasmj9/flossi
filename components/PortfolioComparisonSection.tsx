import React, { useState } from 'react';
import {
  BookmarkPlus,
  RefreshCw,
  Trash2,
  FolderOpen,
  Download,
  Upload,
  PieChart,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Layers,
  SlidersHorizontal,
} from 'lucide-react';
import {
  SavedCompanyRecord,
  loadSavedCompanies,
  saveCompanyToStorage,
  deleteCompanyFromStorage,
  exportSavedCompaniesJsonString,
  importSavedCompaniesJsonString,
} from '@/lib/savedCompaniesStorage';
import {
  PortfolioSimulatorConfig,
  AllocationStrategy,
  runPortfolioSimulation,
} from '@/lib/portfolioSimulator';
import { FinancialChecklistData } from '@/lib/types';
import { FullFundamentalAnalysis } from '@/lib/financialMath';
import { FairValueCalculationResult } from '@/lib/fairValueCalculator';
import { ShariahScreeningReport } from '@/lib/shariahScreening';
import { CompanyQualityScoreResult, BuyThisMonthScoreResult, FullInvestmentConfidenceReport } from '@/lib/confidenceScoringEngine';

interface PortfolioComparisonSectionProps {
  currentData: FinancialChecklistData;
  currentAnalysis: FullFundamentalAnalysis;
  currentFairValue: FairValueCalculationResult;
  currentShariah: ShariahScreeningReport;
  currentQuality: CompanyQualityScoreResult;
  currentBuyMonth: BuyThisMonthScoreResult;
  currentDecision: FullInvestmentConfidenceReport;
  onLoadCompany: (data: FinancialChecklistData) => void;
  showToast: (text: string, type: 'success' | 'error' | 'info') => void;
}

export function PortfolioComparisonSection({
  currentData,
  currentAnalysis,
  currentFairValue,
  currentShariah,
  currentQuality,
  currentBuyMonth,
  currentDecision,
  onLoadCompany,
  showToast,
}: PortfolioComparisonSectionProps) {
  const [savedList, setSavedList] = useState<SavedCompanyRecord[]>(() => loadSavedCompanies());
  const [searchTerm, setSearchTerm] = useState('');
  const [sectorFilter, setSectorFilter] = useState('ALL');
  const [shariahFilter, setShariahFilter] = useState<'ALL' | 'PASSED' | 'FAILED'>('ALL');

  // État du simulateur d'investissement mensuel
  const [monthlyBudget, setMonthlyBudget] = useState<number>(4000);
  const [horizonMonths, setHorizonMonths] = useState<number>(48);
  const [strategy, setStrategy] = useState<AllocationStrategy>('top_pick');
  const [requireShariah, setRequireShariah] = useState<boolean>(true);

  const handleSaveCurrentCompany = () => {
    const ticker = currentData.stockInfo.ticker.trim();
    const companyName = currentData.stockInfo.companyName.trim();

    if (!ticker) {
      showToast('Veuillez renseigner un symbole boursier (Ticker) avant de sauvegarder.', 'error');
      return;
    }

    const currentPrice = parseFloat(currentData.stockInfo.currentPrice) || 0;
    const baseScenario = currentFairValue.baseScenario;
    const fairValue = baseScenario ? baseScenario.fairValueMAD : currentPrice;
    const targetBuy = baseScenario ? baseScenario.targetBuyPriceMAD : currentPrice;

    const record: SavedCompanyRecord = {
      id: ticker.toUpperCase(),
      savedAt: new Date().toISOString(),
      companyName: companyName || ticker.toUpperCase(),
      ticker: ticker.toUpperCase(),
      sector: currentData.stockInfo.sector,
      currentPrice,
      priceObservationDate: currentData.stockInfo.priceObservationDate || new Date().toISOString().split('T')[0],
      estimatedFairValue: fairValue,
      targetBuyPrice: targetBuy,
      qualityScore: currentQuality.totalScore,
      buyMonthScore: currentBuyMonth.totalScore,
      qualityLevel: currentQuality.level,
      decisionType: currentDecision.decision.type,
      decisionLabel: currentDecision.decision.shortLabel,
      shariahStatus: currentDecision.decision.shariahStatusSummary,
      shariahVerdict: currentShariah.verdict,
      netDebtToEbitda: currentAnalysis.debt.netDebtToEbitda.value,
      roe: currentAnalysis.profitability.roe.value,
      dividendYield: currentAnalysis.valuation.dividendYield,
      data: JSON.parse(JSON.stringify(currentData)),
    };

    const updated = saveCompanyToStorage(record);
    setSavedList(updated);
    showToast(`Analyse de ${ticker.toUpperCase()} sauvegardée avec succès !`, 'success');
  };

  const handleDelete = (ticker: string) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer l'analyse de ${ticker} de votre watchlist ?`)) {
      const updated = deleteCompanyFromStorage(ticker);
      setSavedList(updated);
      showToast(`Entreprise ${ticker} supprimée de la watchlist.`, 'info');
    }
  };

  const handleExportJson = () => {
    const jsonStr = exportSavedCompaniesJsonString();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `watchlist_bourse_casablanca_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('Watchlist exportée au format JSON.', 'success');
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (!content) return;
      const res = importSavedCompaniesJsonString(content);
      if (res.success) {
        setSavedList(loadSavedCompanies());
        showToast(`Import réussi : ${res.count} entreprise(s) chargée(s).`, 'success');
      } else {
        showToast(`Erreur d'import : ${res.error}`, 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Filtrage de la liste
  const filteredList = savedList.filter((item) => {
    const matchesSearch =
      item.ticker.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sector.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesSector = sectorFilter === 'ALL' || item.sector === sectorFilter;
    const matchesShariah =
      shariahFilter === 'ALL' ||
      (shariahFilter === 'PASSED' && item.shariahVerdict === 'PASSED') ||
      (shariahFilter === 'FAILED' && item.shariahVerdict !== 'PASSED');

    return matchesSearch && matchesSector && matchesShariah;
  });

  // Simulation de portefeuille
  const simConfig: PortfolioSimulatorConfig = {
    monthlyContribution: monthlyBudget,
    horizonMonths,
    strategy,
    requireShariahCompliance: requireShariah,
  };

  const simulationResult = runPortfolioSimulation(savedList, simConfig);

  return (
    <div className="space-y-8">
      {/* 1. SECTION SAUVEGARDE & COMPARATIF DE WATCHLIST */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-6 h-6 text-emerald-600" />
              Comparateur de Watchlist & Sauvegarde (Bourse de Casablanca)
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Sauvegardez vos analyses fondamentales pour comparer les entreprises et planifier vos investissements mensuels de 4 000 MAD.
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={handleSaveCurrentCompany}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl text-sm shadow-sm transition flex items-center gap-2"
            >
              <BookmarkPlus className="w-4 h-4" />
              Sauvegarder l'analyse active ({currentData.stockInfo.ticker || 'N/A'})
            </button>
            <button
              onClick={handleExportJson}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl text-sm transition flex items-center gap-1.5"
              title="Exporter toutes les analyses en JSON"
            >
              <Download className="w-4 h-4" />
              Exporter
            </button>
            <label className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl text-sm transition flex items-center gap-1.5 cursor-pointer">
              <Upload className="w-4 h-4" />
              Importer
              <input type="file" accept=".json" onChange={handleImportJson} className="hidden" />
            </label>
          </div>
        </div>

        {/* Filtres de recherche */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
              Rechercher (Nom, Ticker, Secteur)
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Ex: ATW, Itissalat..."
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
              Filtrer par Secteur
            </label>
            <select
              value={sectorFilter}
              onChange={(e) => setSectorFilter(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="ALL">Tous les secteurs ({savedList.length})</option>
              {Array.from(new Set(savedList.map((s) => s.sector))).map((sec) => (
                <option key={sec} value={sec}>
                  {sec}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
              Filtre Conformité Shariah
            </label>
            <select
              value={shariahFilter}
              onChange={(e) => setShariahFilter(e.target.value as 'ALL' | 'PASSED' | 'FAILED')}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="ALL">Tous les statuts</option>
              <option value="PASSED">Conforme Shariah uniquement</option>
              <option value="FAILED">Non conforme / À vérifier</option>
            </select>
          </div>
        </div>

        {/* Tableau comparatif */}
        {filteredList.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-300">
            <FolderOpen className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-700">Aucune entreprise sauvegardée</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto mt-1">
              Remplissez les informations d'une entreprise dans le formulaire, puis cliquez sur "Sauvegarder l'analyse active" pour l'ajouter à votre comparateur.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-semibold text-xs uppercase tracking-wider">
                  <th className="p-3">Ticker / Entreprise</th>
                  <th className="p-3">Secteur</th>
                  <th className="p-3 text-right">Cours (MAD)</th>
                  <th className="p-3 text-right">Juste Valeur</th>
                  <th className="p-3 text-center">Qualité /100</th>
                  <th className="p-3 text-center">Score Achat /100</th>
                  <th className="p-3 text-center">Shariah</th>
                  <th className="p-3 text-center">Décision</th>
                  <th className="p-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm bg-white">
                {filteredList.map((item) => {
                  const isCompliant = item.shariahVerdict === 'PASSED';
                  return (
                    <tr key={item.ticker} className="hover:bg-slate-50 transition">
                      <td className="p-3 font-semibold text-slate-900">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-slate-100 rounded text-xs font-mono font-bold text-slate-800">
                            {item.ticker}
                          </span>
                          <span className="truncate max-w-[140px]" title={item.companyName}>
                            {item.companyName}
                          </span>
                        </div>
                      </td>
                      <td className="p-3 text-slate-600 text-xs">{item.sector}</td>
                      <td className="p-3 text-right font-mono font-medium text-slate-900">
                        {item.currentPrice.toFixed(2)} MAD
                      </td>
                      <td className="p-3 text-right font-mono text-slate-700">
                        {item.estimatedFairValue.toFixed(2)} MAD
                      </td>
                      <td className="p-3 text-center font-bold">
                        <span className={`px-2 py-1 rounded-lg text-xs ${
                          item.qualityScore >= 70
                            ? 'bg-emerald-100 text-emerald-800'
                            : item.qualityScore >= 50
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {item.qualityScore}/100
                        </span>
                      </td>
                      <td className="p-3 text-center font-bold">
                        <span className={`px-2 py-1 rounded-lg text-xs ${
                          item.buyMonthScore >= 75
                            ? 'bg-emerald-100 text-emerald-800'
                            : item.buyMonthScore >= 50
                            ? 'bg-slate-100 text-slate-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {item.buyMonthScore}/100
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        {isCompliant ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-xs font-medium" title="Conforme Shariah">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Conforme
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-red-700 bg-red-50 px-2 py-0.5 rounded text-xs font-medium" title="Non conforme ou non vérifié">
                            <AlertTriangle className="w-3.5 h-3.5" /> Non conforme
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <span className="text-xs font-medium px-2 py-1 bg-slate-100 rounded-md text-slate-800">
                          {item.decisionLabel}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => {
                              onLoadCompany(item.data);
                              showToast(`Analyse de ${item.ticker} chargée dans le formulaire.`, 'success');
                            }}
                            className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg transition"
                            title="Charger cette analyse"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(item.ticker)}
                            className="p-1.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg transition"
                            title="Supprimer de la watchlist"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 2. SECTION SIMULATEUR D'INVESTISSEMENT MENSUEL (4 000 MAD / MOIS) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
        <div className="border-b border-slate-100 pb-4">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-emerald-600" />
            Simulateur d'Investissement Mensuel (Stratégie 4 000 MAD / mois)
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            Simulez l'allocation mensuelle de vos apports sur 4 ans (48 mois) parmi vos entreprises de la watchlist conformes Shariah, avec achat d'actions entières et report du cash non investi.
          </p>
        </div>

        {/* Contrôles du simulateur */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
              Apport Mensuel (MAD)
            </label>
            <input
              type="number"
              value={monthlyBudget}
              onChange={(e) => setMonthlyBudget(Math.max(500, parseFloat(e.target.value) || 0))}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
              Horizon (Mois)
            </label>
            <select
              value={horizonMonths}
              onChange={(e) => setHorizonMonths(parseInt(e.target.value, 10) || 48)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="12">12 mois (1 an)</option>
              <option value="24">24 mois (2 ans)</option>
              <option value="36">36 mois (3 ans)</option>
              <option value="48">48 mois (4 ans - Cible V1)</option>
              <option value="60">60 mois (5 ans)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
              Stratégie d'Allocation
            </label>
            <select
              value={strategy}
              onChange={(e) => setStrategy(e.target.value as AllocationStrategy)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="top_pick">Top Pick (Meilleur Score du Mois)</option>
              <option value="diversified_top3">Rotation Top 3 Shariah</option>
              <option value="equal_weight">Rotation Égale sur Watchlist</option>
            </select>
          </div>
          <div className="flex items-center pt-5">
            <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={requireShariah}
                onChange={(e) => setRequireShariah(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
              />
              Exclure valeurs non-Shariah
            </label>
          </div>
        </div>

        {/* Résultats de simulation */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="text-xs font-semibold text-slate-500 uppercase">Capital Total Versé</div>
            <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
              {simulationResult.totalContributedCapital.toLocaleString()} MAD
            </div>
            <div className="text-xs text-slate-600 mt-1">{horizonMonths} mois × {monthlyBudget} MAD</div>
          </div>
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="text-xs font-semibold text-slate-500 uppercase">Investi en Actions</div>
            <div className="text-2xl font-bold font-mono text-emerald-700 mt-1">
              {simulationResult.totalSpentOnStocks.toLocaleString()} MAD
            </div>
            <div className="text-xs text-slate-600 mt-1">
              ({((simulationResult.totalSpentOnStocks / (simulationResult.totalContributedCapital || 1)) * 100).toFixed(1)}% du capital)
            </div>
          </div>
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="text-xs font-semibold text-slate-500 uppercase">Liquidités en Réserve</div>
            <div className="text-2xl font-bold font-mono text-blue-700 mt-1">
              {simulationResult.remainingCash.toLocaleString()} MAD
            </div>
            <div className="text-xs text-slate-600 mt-1">Cash non investi reporté</div>
          </div>
          <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200">
            <div className="text-xs font-semibold text-emerald-800 uppercase">Valeur Portefeuille Estimée</div>
            <div className="text-2xl font-bold font-mono text-emerald-900 mt-1">
              {simulationResult.finalPortfolioMarketValue.toLocaleString()} MAD
            </div>
            <div className={`text-xs font-medium mt-1 ${simulationResult.totalUnrealizedGainMAD >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
              Plus-value : {simulationResult.totalUnrealizedGainMAD.toLocaleString()} MAD ({simulationResult.totalUnrealizedGainPercent.toFixed(1)}%)
            </div>
          </div>
        </div>

        {/* Avertissements de simulation */}
        {simulationResult.warnings.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-amber-800 text-sm space-y-1">
            <div className="font-semibold flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              Remarques de la simulation :
            </div>
            <ul className="list-disc list-inside space-y-0.5 text-xs">
              {simulationResult.warnings.map((w, idx) => (
                <li key={idx}>{w}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Tableau des avoirs simulés (Holdings) */}
        {simulationResult.holdings.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <PieChart className="w-5 h-5 text-emerald-600" />
              Répartition des Actions Détenues en Fin de Période
            </h3>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-semibold text-xs uppercase tracking-wider">
                    <th className="p-3">Ticker</th>
                    <th className="p-3">Entreprise</th>
                    <th className="p-3 text-center">Actions détenues</th>
                    <th className="p-3 text-right">Prix de revient moy.</th>
                    <th className="p-3 text-right">Cours actuel</th>
                    <th className="p-3 text-right">Valeur de marché</th>
                    <th className="p-3 text-right">Plus-value latente</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-sm bg-white">
                  {simulationResult.holdings.map((h) => (
                    <tr key={h.ticker} className="hover:bg-slate-50 transition">
                      <td className="p-3 font-mono font-bold text-slate-900">{h.ticker}</td>
                      <td className="p-3 text-slate-800">{h.companyName}</td>
                      <td className="p-3 text-center font-bold text-emerald-700">{h.sharesOwned}</td>
                      <td className="p-3 text-right font-mono text-slate-600">{h.averageCostPrice.toFixed(2)} MAD</td>
                      <td className="p-3 text-right font-mono text-slate-900 font-medium">{h.currentStockPrice.toFixed(2)} MAD</td>
                      <td className="p-3 text-right font-mono font-bold text-slate-900">{h.currentMarketValue.toLocaleString()} MAD</td>
                      <td className={`p-3 text-right font-mono font-semibold ${h.unrealizedGainMAD >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {h.unrealizedGainMAD >= 0 ? '+' : ''}{h.unrealizedGainMAD.toLocaleString()} MAD ({h.unrealizedGainPercent.toFixed(1)}%)
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Répartition sectorielle */}
        {simulationResult.sectorAllocations.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <SlidersHorizontal className="w-5 h-5 text-emerald-600" />
              Diversification Sectorielle du Portefeuille Simulée
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {simulationResult.sectorAllocations.map((sa) => (
                <div key={sa.sector} className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div className="text-xs font-medium text-slate-600 truncate" title={sa.sector}>
                    {sa.sector}
                  </div>
                  <div className="text-lg font-bold font-mono text-slate-900 mt-1">
                    {sa.percentage.toFixed(1)}%
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {sa.totalValue.toLocaleString()} MAD
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
