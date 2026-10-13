'use client';

import React, { useState, useEffect } from 'react';
import {
  Wallet,
  TrendingUp,
  PlusCircle,
  MinusCircle,
  DollarSign,
  PieChart,
  History,
  ArrowUpRight,
  ArrowDownRight,
  Building2,
} from 'lucide-react';

interface PortfolioSummary {
  stockMarketValue: number;
  availableCash: number;
  totalPortfolioValue: number;
  investedCapital: number;
  unrealizedGainMAD: number;
  unrealizedGainPercent: number;
  realizedGainMAD: number;
  netDividendsReceived: number;
  monthlyContributionTarget: number;
}

interface HoldingItem {
  ticker: string;
  companyName: string;
  sector: string;
  sharesOwned: number;
  totalInvested: number;
  averageCostPrice: number;
  currentStockPrice: number;
  priceObservationDate: string;
  currentMarketValue: number;
  unrealizedGainMAD: number;
  unrealizedGainPercent: number;
}

interface SectorAllocation {
  sector: string;
  targetPercent: number;
  currentMarketValue: number;
  currentPercent: number;
  differencePercent: number;
}

interface TransactionItem {
  id: string;
  ticker: string;
  type: 'BUY' | 'SELL';
  transactionDate: string;
  quantity: number;
  pricePerShare: number;
  fees: number;
  totalAmount: number;
  notes?: string;
}

interface CashMovementItem {
  id: string;
  type: 'DEPOSIT' | 'WITHDRAWAL' | 'DIVIDEND' | 'OPENING_BALANCE';
  amount: number;
  transactionDate: string;
  notes?: string;
}

interface DividendItem {
  id: string;
  ticker: string;
  paymentDate: string;
  grossAmount: number;
  withholdingTax: number;
  netAmount: number;
  notes?: string;
}

interface PortfolioData {
  summary: PortfolioSummary;
  holdings: HoldingItem[];
  sectorAllocations: SectorAllocation[];
  transactions: TransactionItem[];
  cashMovements: CashMovementItem[];
  dividends: DividendItem[];
}

interface PortfolioManagementSectionProps {
  companiesList: { ticker: string; name: string }[];
  showToast: (text: string, type: 'success' | 'error' | 'info') => void;
}

export function PortfolioManagementSection({ companiesList, showToast }: PortfolioManagementSectionProps) {
  const [portfolio, setPortfolio] = useState<PortfolioData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Form states
  const [activeModal, setActiveModal] = useState<'buy' | 'sell' | 'cash' | 'dividend' | null>(null);

  // Buy form
  const [buyTicker, setBuyTicker] = useState(companiesList[0]?.ticker || '');
  const [buyQuantity, setBuyQuantity] = useState<string>('2');
  const [buyPrice, setBuyPrice] = useState<string>('1000');
  const [buyFees, setBuyFees] = useState<string>('10');
  const [buyDate, setBuyDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [buyNotes, setBuyNotes] = useState<string>('');

  // Sell form
  const [sellTicker, setSellTicker] = useState('');
  const [sellQuantity, setSellQuantity] = useState<string>('1');
  const [sellPrice, setSellPrice] = useState<string>('1100');
  const [sellFees, setSellFees] = useState<string>('10');
  const [sellDate, setSellDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Cash form
  const [cashType, setCashType] = useState<'DEPOSIT' | 'WITHDRAWAL'>('DEPOSIT');
  const [cashAmount, setCashAmount] = useState<string>('4000');
  const [cashDate, setCashDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [cashNotes, setCashNotes] = useState<string>('Versement mensuel régulier');

  // Dividend form
  const [divTicker, setDivTicker] = useState('');
  const [divGross, setDivGross] = useState<string>('150');
  const [divTax, setDivTax] = useState<string>('22.5');
  const [divDate, setDivDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const fetchPortfolio = React.useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/portfolio/summary');
      if (res.ok) {
        const data = await res.json();
        setPortfolio(data);
      } else {
        showToast('Erreur lors du chargement du portefeuille.', 'error');
      }
    } catch {
      showToast('Impossible de contacter le serveur backend NestJS.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    const t = setTimeout(() => {
      fetchPortfolio();
    }, 0);
    return () => clearTimeout(t);
  }, [fetchPortfolio]);

  const handleExecuteBuy = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/portfolio/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticker: buyTicker,
          quantity: parseInt(buyQuantity) || 0,
          pricePerShare: parseFloat(buyPrice) || 0,
          fees: parseFloat(buyFees) || 0,
          transactionDate: buyDate,
          notes: buyNotes,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Achat de ${buyQuantity} action(s) ${buyTicker} enregistré avec succès !`, 'success');
        setActiveModal(null);
        fetchPortfolio();
      } else {
        showToast(`Erreur d'achat : ${data.message || 'Échec'}`, 'error');
      }
    } catch {
      showToast('Erreur réseau lors de l’enregistrement de l’achat.', 'error');
    }
  };

  const handleExecuteSell = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/portfolio/sell', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticker: sellTicker,
          quantity: parseInt(sellQuantity) || 0,
          pricePerShare: parseFloat(sellPrice) || 0,
          fees: parseFloat(sellFees) || 0,
          transactionDate: sellDate,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Vente de ${sellQuantity} action(s) ${sellTicker} enregistrée !`, 'success');
        setActiveModal(null);
        fetchPortfolio();
      } else {
        showToast(`Erreur de vente : ${data.message || 'Échec'}`, 'error');
      }
    } catch {
      showToast('Erreur réseau lors de la vente.', 'error');
    }
  };

  const handleExecuteCash = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/portfolio/cash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: cashType,
          amount: parseFloat(cashAmount) || 0,
          transactionDate: cashDate,
          notes: cashNotes,
        }),
      });
      if (res.ok) {
        showToast(`Mouvement de liquidités de ${cashAmount} MAD enregistré !`, 'success');
        setActiveModal(null);
        fetchPortfolio();
      } else {
        showToast('Erreur lors de l’enregistrement des liquidités.', 'error');
      }
    } catch {
      showToast('Erreur réseau.', 'error');
    }
  };

  const handleExecuteDividend = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/portfolio/dividend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticker: divTicker,
          grossAmount: parseFloat(divGross) || 0,
          withholdingTax: parseFloat(divTax) || 0,
          paymentDate: divDate,
        }),
      });
      if (res.ok) {
        showToast(`Dividende de ${divTicker} enregistré avec succès !`, 'success');
        setActiveModal(null);
        fetchPortfolio();
      } else {
        showToast('Erreur lors de l’enregistrement du dividende.', 'error');
      }
    } catch {
      showToast('Erreur réseau.', 'error');
    }
  };

  if (loading && !portfolio) {
    return (
      <div className="bg-white rounded-2xl p-12 text-center text-slate-500 shadow-sm border border-slate-200">
        Chargement de votre portefeuille et de vos transactions depuis PostgreSQL...
      </div>
    );
  }

  const sum = portfolio?.summary;

  return (
    <div className="space-y-8">
      {/* 1. SECTION TITRE & BOUTONS D'ACTION */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Wallet className="w-6 h-6 text-emerald-600" />
              Mon Portefeuille Bourse (Casablanca)
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Suivi de vos investissements mensuels (Objectif : 4 000 MAD/mois), des actions détenues et des liquidités.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setActiveModal('cash')}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-sm font-semibold flex items-center gap-2 transition-colors"
            >
              <PlusCircle className="w-4 h-4 text-emerald-600" /> Ajouter des liquidités (4k MAD)
            </button>
            <button
              type="button"
              onClick={() => setActiveModal('buy')}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold flex items-center gap-2 transition-colors shadow-sm"
            >
              <PlusCircle className="w-4 h-4" /> Acheter une action
            </button>
            <button
              type="button"
              onClick={() => setActiveModal('sell')}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-sm font-semibold flex items-center gap-2 transition-colors"
            >
              <MinusCircle className="w-4 h-4" /> Vendre
            </button>
            <button
              type="button"
              onClick={() => setActiveModal('dividend')}
              className="px-4 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-xl text-sm font-semibold flex items-center gap-2 transition-colors border border-amber-200"
            >
              <DollarSign className="w-4 h-4 text-amber-600" /> Dividende
            </button>
          </div>
        </div>

        {/* 2. INDICATEURS CLÉS (CARDS) */}
        {sum && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-1">
              <span className="text-xs font-medium text-slate-500">Valeur Totale Portefeuille</span>
              <div className="text-xl font-bold text-slate-900 tabular-nums">
                {sum.totalPortfolioValue.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MAD
              </div>
              <span className="text-[11px] text-slate-500">Actions + Liquidités disponibles</span>
            </div>

            <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-200/80 space-y-1">
              <span className="text-xs font-medium text-emerald-800">Valeur des Actions</span>
              <div className="text-xl font-bold text-emerald-950 tabular-nums">
                {sum.stockMarketValue.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MAD
              </div>
              <span className="text-[11px] text-emerald-700">Capital investi : {sum.investedCapital.toLocaleString('fr-FR')} MAD</span>
            </div>

            <div className="bg-blue-50/60 p-4 rounded-xl border border-blue-200/80 space-y-1">
              <span className="text-xs font-medium text-blue-800">Liquidités Disponibles</span>
              <div className="text-xl font-bold text-blue-950 tabular-nums">
                {sum.availableCash.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MAD
              </div>
              <span className="text-[11px] text-blue-700">Prêt pour investissement mensuel</span>
            </div>

            <div className={`p-4 rounded-xl border space-y-1 ${sum.unrealizedGainMAD >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
              <span className={`text-xs font-medium ${sum.unrealizedGainMAD >= 0 ? 'text-emerald-800' : 'text-rose-800'}`}>Plus-Value / Moins-Value Latente</span>
              <div className={`text-xl font-bold tabular-nums flex items-center gap-1 ${sum.unrealizedGainMAD >= 0 ? 'text-emerald-950' : 'text-rose-950'}`}>
                {sum.unrealizedGainMAD >= 0 ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                {sum.unrealizedGainMAD.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MAD
              </div>
              <span className={`text-[11px] ${sum.unrealizedGainMAD >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                ({sum.unrealizedGainPercent >= 0 ? '+' : ''}{sum.unrealizedGainPercent.toFixed(2)}%)
              </span>
            </div>
          </div>
        )}

        {/* SECONDE LIGNE DE STATISTIQUES */}
        {sum && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/60 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500 font-medium">Plus-Value Réalisée</span>
                <div className="text-lg font-bold text-slate-800 tabular-nums">
                  {sum.realizedGainMAD.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MAD
                </div>
              </div>
              <TrendingUp className="w-6 h-6 text-slate-400" />
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/60 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500 font-medium">Dividendes Nets Reçus</span>
                <div className="text-lg font-bold text-slate-800 tabular-nums">
                  {sum.netDividendsReceived.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MAD
                </div>
              </div>
              <DollarSign className="w-6 h-6 text-amber-500" />
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/60 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500 font-medium">Objectif d'Investissement Mensuel</span>
                <div className="text-lg font-bold text-slate-800 tabular-nums">
                  {sum.monthlyContributionTarget.toLocaleString('fr-FR')} MAD / mois
                </div>
              </div>
              <Wallet className="w-6 h-6 text-emerald-500" />
            </div>
          </div>
        )}
      </div>

      {/* 3. TABLEAU DES POSITIONS (HOLDINGS) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Building2 className="w-5 h-5 text-emerald-600" />
          Actions Détenues (Portefeuille Actuel)
        </h3>

        {portfolio?.holdings && portfolio.holdings.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 text-xs font-semibold uppercase tracking-wider bg-slate-50">
                  <th className="py-3 px-4">Entreprise</th>
                  <th className="py-3 px-4">Secteur</th>
                  <th className="py-3 px-4 text-right">Quantité</th>
                  <th className="py-3 px-4 text-right">Prix Moyen d'Achat</th>
                  <th className="py-3 px-4 text-right">Cours Actuel</th>
                  <th className="py-3 px-4 text-right">Valeur de Marché</th>
                  <th className="py-3 px-4 text-right">Plus-Value / Moins-Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {portfolio.holdings.map((h) => {
                  const isPositive = h.unrealizedGainMAD >= 0;
                  return (
                    <tr key={h.ticker} className="hover:bg-slate-50/80">
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        {h.companyName} <span className="text-xs text-slate-500 font-normal">({h.ticker})</span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 text-xs">{h.sector}</td>
                      <td className="py-3.5 px-4 text-right font-bold text-slate-900 tabular-nums">{h.sharesOwned}</td>
                      <td className="py-3.5 px-4 text-right text-slate-700 tabular-nums">{h.averageCostPrice.toFixed(2)} MAD</td>
                      <td className="py-3.5 px-4 text-right font-semibold text-slate-900 tabular-nums">
                        {h.currentStockPrice.toFixed(2)} MAD
                        <span className="block text-[10px] text-slate-400 font-normal">Obs. : {h.priceObservationDate}</span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-slate-900 tabular-nums">
                        {h.currentMarketValue.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MAD
                      </td>
                      <td className={`py-3.5 px-4 text-right font-semibold tabular-nums ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {isPositive ? '+' : ''}{h.unrealizedGainMAD.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MAD
                        <span className="block text-xs font-normal">({isPositive ? '+' : ''}{h.unrealizedGainPercent.toFixed(2)}%)</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300 text-slate-500">
            Aucune action détenue pour le moment. Utilisez le bouton <span className="font-semibold text-slate-800">"Acheter une action"</span> pour démarrer votre portefeuille.
          </div>
        )}
      </div>

      {/* 4. DIVERSIFICATION SECTORIELLE */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <PieChart className="w-5 h-5 text-emerald-600" />
          Diversification Sectorielle vs Objectifs
        </h3>

        {portfolio?.sectorAllocations && portfolio.sectorAllocations.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 text-xs font-semibold uppercase tracking-wider bg-slate-50">
                  <th className="py-3 px-4">Secteur d'Activité</th>
                  <th className="py-3 px-4 text-right">Valeur Actuelle</th>
                  <th className="py-3 px-4 text-right">Poids Actuel (%)</th>
                  <th className="py-3 px-4 text-right">Poids Cible (%)</th>
                  <th className="py-3 px-4">Écart / Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {portfolio.sectorAllocations.map((sa) => {
                  const isOver = sa.differencePercent > 3;
                  const isUnder = sa.differencePercent < -3;
                  return (
                    <tr key={sa.sector} className="hover:bg-slate-50/80">
                      <td className="py-3.5 px-4 font-semibold text-slate-900">{sa.sector}</td>
                      <td className="py-3.5 px-4 text-right font-medium text-slate-800 tabular-nums">
                        {sa.currentMarketValue.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MAD
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-slate-900 tabular-nums">{sa.currentPercent.toFixed(1)}%</td>
                      <td className="py-3.5 px-4 text-right text-slate-600 tabular-nums">{sa.targetPercent}%</td>
                      <td className="py-3.5 px-4">
                        {isOver ? (
                          <span className="px-2 py-1 bg-amber-100 text-amber-800 rounded-lg text-xs font-semibold">
                            Surpondéré (+{sa.differencePercent.toFixed(1)} pts)
                          </span>
                        ) : isUnder ? (
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-lg text-xs font-semibold">
                            Sous-pondéré ({sa.differencePercent.toFixed(1)} pts)
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-emerald-100 text-emerald-800 rounded-lg text-xs font-semibold">
                            Équilibré
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-slate-500 text-sm">Aucune allocation sectorielle disponible.</p>
        )}
      </div>

      {/* 5. HISTORIQUE DES TRANSACTIONS */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <History className="w-5 h-5 text-emerald-600" />
          Historique des Opérations & Mouvements
        </h3>

        {portfolio?.transactions && portfolio.transactions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 text-xs font-semibold uppercase tracking-wider bg-slate-50">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Entreprise (Ticker)</th>
                  <th className="py-3 px-4 text-right">Quantité</th>
                  <th className="py-3 px-4 text-right">Prix Unitaire</th>
                  <th className="py-3 px-4 text-right">Frais</th>
                  <th className="py-3 px-4 text-right">Montant Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {portfolio.transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/80">
                    <td className="py-3.5 px-4 text-slate-600 text-xs">{tx.transactionDate}</td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        tx.type === 'BUY' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {tx.type === 'BUY' ? 'ACHAT' : 'VENTE'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-900">{tx.ticker}</td>
                    <td className="py-3.5 px-4 text-right font-medium text-slate-800 tabular-nums">{tx.quantity}</td>
                    <td className="py-3.5 px-4 text-right text-slate-700 tabular-nums">{tx.pricePerShare.toFixed(2)} MAD</td>
                    <td className="py-3.5 px-4 text-right text-slate-500 text-xs tabular-nums">{tx.fees.toFixed(2)} MAD</td>
                    <td className="py-3.5 px-4 text-right font-bold text-slate-900 tabular-nums">
                      {tx.totalAmount.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} MAD
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-slate-500 text-sm">Aucune transaction enregistrée.</p>
        )}
      </div>

      {/* MODAL ACHAT */}
      {activeModal === 'buy' && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-5 shadow-xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900">Acheter une action (Bourse de Casablanca)</h3>
            <form onSubmit={handleExecuteBuy} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Entreprise / Ticker</label>
                <select
                  value={buyTicker}
                  onChange={(e) => setBuyTicker(e.target.value)}
                  className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 text-sm font-semibold text-slate-900"
                >
                  {companiesList.map((c) => (
                    <option key={c.ticker} value={c.ticker}>
                      {c.name} ({c.ticker})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Nombre d'actions</label>
                  <input
                    type="number"
                    min="1"
                    value={buyQuantity}
                    onChange={(e) => setBuyQuantity(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-900"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Prix d'achat unitaire (MAD)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={buyPrice}
                    onChange={(e) => setBuyPrice(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-900"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Frais de courtage (MAD)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={buyFees}
                    onChange={(e) => setBuyFees(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Date d'opération</label>
                  <input
                    type="date"
                    value={buyDate}
                    onChange={(e) => setBuyDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-900"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Note (Optionnel)</label>
                <input
                  type="text"
                  value={buyNotes}
                  onChange={(e) => setBuyNotes(e.target.value)}
                  placeholder="Ex: Achat mensuel d'actions"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-900"
                />
              </div>

              <div className="bg-emerald-50 p-3 rounded-xl text-xs text-emerald-900 font-medium">
                Montant total estimé (Qté × Prix + Frais) :{' '}
                <span className="font-bold">
                  {((parseInt(buyQuantity) || 0) * (parseFloat(buyPrice) || 0) + (parseFloat(buyFees) || 0)).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} MAD
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold shadow-sm"
                >
                  Confirmer l'achat
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL VENTE */}
      {activeModal === 'sell' && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-5 shadow-xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900">Vendre une action (Bourse de Casablanca)</h3>
            <form onSubmit={handleExecuteSell} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Action à vendre</label>
                <select
                  value={sellTicker}
                  onChange={(e) => setSellTicker(e.target.value)}
                  className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 text-sm font-semibold text-slate-900"
                >
                  {portfolio?.holdings.map((h) => (
                    <option key={h.ticker} value={h.ticker}>
                      {h.companyName} ({h.ticker}) — Possédées : {h.sharesOwned}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Nombre d'actions</label>
                  <input
                    type="number"
                    min="1"
                    value={sellQuantity}
                    onChange={(e) => setSellQuantity(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-900"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Prix de vente unitaire (MAD)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={sellPrice}
                    onChange={(e) => setSellPrice(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-900"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Frais (MAD)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={sellFees}
                    onChange={(e) => setSellFees(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={sellDate}
                    onChange={(e) => setSellDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-900"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-semibold shadow-sm"
                >
                  Confirmer la vente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL LIQUIDITÉS */}
      {activeModal === 'cash' && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-5 shadow-xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900">Ajouter / Retirer des liquidités (Budget 4k MAD)</h3>
            <form onSubmit={handleExecuteCash} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Type de mouvement</label>
                <select
                  value={cashType}
                  onChange={(e) => setCashType(e.target.value as 'DEPOSIT' | 'WITHDRAWAL')}
                  className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 text-sm font-semibold text-slate-900"
                >
                  <option value="DEPOSIT">Dépôt (Versement mensuel)</option>
                  <option value="WITHDRAWAL">Retrait</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Montant (MAD)</label>
                <input
                  type="number"
                  step="0.01"
                  value={cashAmount}
                  onChange={(e) => setCashAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Date</label>
                <input
                  type="date"
                  value={cashDate}
                  onChange={(e) => setCashDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-900"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Note (Optionnel)</label>
                <input
                  type="text"
                  value={cashNotes}
                  onChange={(e) => setCashNotes(e.target.value)}
                  placeholder="Ex: Épargne mensuelle octobre"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold shadow-sm"
                >
                  Valider
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DIVIDENDE */}
      {activeModal === 'dividend' && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-5 shadow-xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900">Enregistrer un dividende reçu</h3>
            <form onSubmit={handleExecuteDividend} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Entreprise versante</label>
                <select
                  value={divTicker}
                  onChange={(e) => setDivTicker(e.target.value)}
                  className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 text-sm font-semibold text-slate-900"
                >
                  {companiesList.map((c) => (
                    <option key={c.ticker} value={c.ticker}>
                      {c.name} ({c.ticker})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Montant brut (MAD)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={divGross}
                    onChange={(e) => setDivGross(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-900"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Retenue à la source / Impôt</label>
                  <input
                    type="number"
                    step="0.01"
                    value={divTax}
                    onChange={(e) => setDivTax(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Date de versement</label>
                <input
                  type="date"
                  value={divDate}
                  onChange={(e) => setDivDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-900"
                  required
                />
              </div>

              <div className="bg-amber-50 p-3 rounded-xl text-xs text-amber-900 font-medium">
                Montant net perçu (ajouté aux liquidités) :{' '}
                <span className="font-bold">
                  {((parseFloat(divGross) || 0) - (parseFloat(divTax) || 0)).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} MAD
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-semibold shadow-sm"
                >
                  Enregistrer le dividende
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
