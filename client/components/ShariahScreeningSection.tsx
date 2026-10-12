'use client';

import React from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  HelpCircle,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  Scale,
  FileQuestion,
  FileEdit,
} from 'lucide-react';
import {
  FinancialChecklistData,
  ShariahMethodology,
  TriStateAnswer,
} from '@/lib/types';
import {
  performShariahScreening,
  ScreeningCriterionStatus,
  OverallScreeningVerdict,
} from '@/lib/shariahScreening';
import { FormField } from './FormField';
import { TOOLTIPS } from '@/lib/tooltips';

interface ShariahScreeningSectionProps {
  data: FinancialChecklistData;
  unitSuffix: string;
  onChangeField: (field: string, val: unknown) => void;
  onChangeActivityQuestion: (key: string, val: TriStateAnswer) => void;
}

const METHODOLOGY_OPTIONS: { id: ShariahMethodology; label: string; badge: string }[] = [
  { id: 'STRICT_NO_RIBA', label: 'Strict No-Riba (Tolérance zéro intérêt)', badge: 'Puriste' },
  { id: 'AAOIFI', label: 'AAOIFI — Shariah Standard No. 21 (Seuil 30 % actif)', badge: 'Standardisé' },
  { id: 'MSCI_ISLAMIC', label: 'MSCI Islamic Index (Seuil 33,33 % actif)', badge: 'Index mondial' },
  { id: 'FTSE_YASAAR', label: 'FTSE Yasaar Shariah (Seuil 33,33 % actif)', badge: 'Certifié Yasaar' },
];

const ACTIVITY_QUESTIONS = [
  {
    key: 'isPrimaryActivityPermissible',
    label: "L'activité principale de l'entreprise est-elle licite (Halal) ?",
    description: "Le cœur de métier doit être éthique et conforme à la Shariah (commerce licite, santé, industrie, technologies, etc.).",
    example: "Une entreprise hospitalière comme Akdital soigne des patients : activité principale licite.",
    expectedForCompliance: 'yes',
  },
  {
    key: 'operatesConventionalBanking',
    label: 'Opère-t-elle dans la banque ou la finance conventionnelle (avec Riba) ?',
    description: 'Les banques commerciales conventionnelles génèrent leur profit sur des prêts à intérêts.',
    example: "Une banque conventionnelle prêtant à intérêt ne peut pas être conforme.",
    expectedForCompliance: 'no',
  },
  {
    key: 'operatesConventionalInsurance',
    label: 'Opère-t-elle dans l&apos;assurance commerciale conventionnelle ?',
    description: "L'assurance conventionnelle comporte du Gharar (aléa excessif) et du Riba (placements obligataires). Seules les compagnies Takaful coopératives sont autorisées.",
    example: "Une compagnie d'assurance commerciale classique est exclue.",
    expectedForCompliance: 'no',
  },
  {
    key: 'generatesGamblingRevenue',
    label: 'Génère-t-elle des revenus de jeux de hasard / paris / casinos (Maysir) ?',
    description: "Les loteries, casinos et jeux d'argent sont formellement prohibés.",
    example: "Une chaîne d'hôtels exploitant des casinos engrange des revenus illicites.",
    expectedForCompliance: 'no',
  },
  {
    key: 'generatesAlcoholRevenue',
    label: 'Génère-t-elle des revenus liés à la production ou vente d&apos;alcool ?',
    description: "La fabrication, distribution ou service de boissons alcoolisées est prohibée.",
    example: "Un brasseur ou un distributeur de spiritueux est exclu.",
    expectedForCompliance: 'no',
  },
  {
    key: 'operatesOtherProhibited',
    label: 'Opère-t-elle dans d&apos;autres activités prohibées (porc, tabac, armement illicite) ?',
    description: "Comprend la filière porcine, le tabac, l'armement non défensif et le divertissement pour adultes.",
    example: "Une entreprise agroalimentaire spécialisée dans la charcuterie porcine est exclue.",
    expectedForCompliance: 'no',
  },
  {
    key: 'hasMixedActivitiesRequiringAnalysis',
    label: 'L&apos;entreprise comporte-t-elle des activités accessoires mixtes ?',
    description: "Si une entreprise licite génère de faibles revenus accessoires (ex : intérêts de trésorerie), une purification des dividendes sera requise.",
    example: "Des intérêts perçus sur des excédents de trésorerie nécessitent un filtrage financier.",
    expectedForCompliance: 'neutral',
  },
];

// Helper tooltip for Shariah concepts
function ShariahTooltip({ title, description, example }: { title: string; description: string; example: string }) {
  return (
    <div className="group relative inline-flex items-center ml-1">
      <button
        type="button"
        className="text-slate-400 hover:text-slate-700 transition-colors focus:outline-none p-0.5"
        aria-label={`En savoir plus sur ${title}`}
      >
        <HelpCircle className="w-3.5 h-3.5" />
      </button>
      <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 p-3 bg-slate-900 text-white text-xs rounded-lg shadow-xl opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity z-50">
        <p className="font-semibold text-slate-100 mb-1">{title}</p>
        <p className="text-slate-300 leading-relaxed mb-2">{description}</p>
        <div className="bg-slate-800 p-2 rounded text-[11px] text-slate-200 border border-slate-700">
          <span className="font-semibold text-emerald-400 block mb-0.5">Exemple en MAD :</span>
          {example}
        </div>
        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-900" />
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: ScreeningCriterionStatus }) {
  if (status === 'PASS') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
        CONFORME
      </span>
    );
  }
  if (status === 'FAIL') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
        <XCircle className="w-3.5 h-3.5 shrink-0" />
        NON CONFORME
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
      VÉRIFICATION REQUISE
    </span>
  );
}

function OverallVerdictBanner({ verdict, label, explanation }: { verdict: OverallScreeningVerdict; label: string; explanation: string }) {
  if (verdict === 'PASSED') {
    return (
      <div className="p-4 rounded-xl bg-emerald-50/90 border border-emerald-300 text-emerald-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold tracking-tight text-emerald-900 uppercase">
                {label}
              </span>
            </div>
            <p className="text-xs text-emerald-800 mt-0.5 leading-relaxed">
              {explanation}
            </p>
          </div>
        </div>
        <span className="px-3 py-1 bg-emerald-600 text-white text-xs font-bold rounded-lg shrink-0 self-start sm:self-auto">
          STATUT : VALIDÉ
        </span>
      </div>
    );
  }

  if (verdict === 'FAILED') {
    return (
      <div className="p-4 rounded-xl bg-rose-50/90 border border-rose-300 text-rose-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-rose-600 text-white flex items-center justify-center shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold tracking-tight text-rose-900 uppercase">
                {label}
              </span>
            </div>
            <p className="text-xs text-rose-800 mt-0.5 leading-relaxed">
              {explanation}
            </p>
          </div>
        </div>
        <span className="px-3 py-1 bg-rose-600 text-white text-xs font-bold rounded-lg shrink-0 self-start sm:self-auto">
          STATUT : EXCLU
        </span>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-xl bg-amber-50/90 border border-amber-300 text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-amber-600 text-white flex items-center justify-center shrink-0">
          <FileQuestion className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold tracking-tight text-amber-950 uppercase">
              {label}
            </span>
          </div>
          <p className="text-xs text-amber-900 mt-0.5 leading-relaxed">
            {explanation}
          </p>
        </div>
      </div>
      <span className="px-3 py-1 bg-amber-600 text-white text-xs font-bold rounded-lg shrink-0 self-start sm:self-auto">
        STATUT : EN ATTENTE
      </span>
    </div>
  );
}

export function ShariahScreeningSection({
  data,
  unitSuffix,
  onChangeField,
  onChangeActivityQuestion,
}: ShariahScreeningSectionProps) {
  const selectedMethod = data.shariah.methodology || 'AAOIFI';
  const report = performShariahScreening(data, selectedMethod);
  const config = report.methodology;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Scale className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-bold tracking-tight text-slate-900">
              Conformité Shariah & Éthique Islamique
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Filtrage déclaratif des activités prohibées et vérification des seuils financiers de Riba
          </p>
        </div>

        {/* Disclaimer button */}
        <div className="text-[11px] text-slate-500 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg max-w-md">
          {report.disclaimer}
        </div>
      </div>

      {/* OVERALL VERDICT BANNER */}
      <OverallVerdictBanner
        verdict={report.verdict}
        label={report.verdictLabel}
        explanation={report.summaryExplanation}
      />

      {/* METHODOLOGY SELECTOR */}
      <div className="flex flex-col gap-3 p-4 bg-slate-50/80 rounded-xl border border-slate-200/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <label htmlFor="method-selector" className="text-xs font-bold text-slate-800">
              Méthodologie de screening Shariah sélectionnée :
            </label>
            <ShariahTooltip
              title="Normes de screening Shariah"
              description="Les juristes islamiques (Faqihs) et institutions de normalisation (AAOIFI, MSCI, FTSE) définissent des règles précises pour tolérer ou exclure les actions cotées."
              example="AAOIFI fixe la dette portant intérêt à < 30 % de l'actif total, tandis que la politique stricte n'admet aucune dette à intérêt."
            />
          </div>
          <span className="text-[11px] text-slate-500 font-mono">
            Source : {config.source}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {METHODOLOGY_OPTIONS.map((m) => {
            const isSelected = selectedMethod === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => onChangeField('methodology', m.id)}
                className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-white border-slate-900 shadow-xs ring-1 ring-slate-900'
                    : 'bg-white/60 border-slate-200 hover:bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className={`text-xs font-bold ${isSelected ? 'text-slate-900' : 'text-slate-700'}`}>
                    {m.label.split('(')[0]}
                  </span>
                  <span className="text-[10px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                    {m.badge}
                  </span>
                </div>
                <span className="text-[11px] text-slate-600 block leading-tight">
                  {m.label.includes('(') ? `(${m.label.split('(')[1]}` : ''}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-1 p-2.5 bg-white rounded-lg border border-slate-200 text-xs text-slate-600">
          <strong className="text-slate-800 font-semibold">{config.name} :</strong>{' '}
          {config.description}
        </div>
      </div>

      {/* 1. BUSINESS ACTIVITY CHECKLIST */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900">
              1. Filtrage qualitatif de l&apos;activité (Business Activity Screen)
            </h3>
            <ShariahTooltip
              title="Critère d'activité licite"
              description="Une entreprise opérant dans un secteur licite (ex : santé, télécoms) ne peut pas générer de revenus significatifs d'activités interdites."
              example="Une clinique hospitalière facture des soins médicaux : activité licite. Si elle ouvrait une agence de paris ou servait de l'alcool, ces activités seraient prohibées."
            />
          </div>
          <StatusBadge status={report.businessActivityStatus} />
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-left text-xs divide-y divide-slate-200">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="py-2.5 px-3 font-semibold">Question de conformité éthique</th>
                <th className="py-2.5 px-3 font-semibold w-72 text-center">Réponse déclarée</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {ACTIVITY_QUESTIONS.map((q) => {
                const currentAnswer = (data.shariah.activityChecklist as unknown as Record<string, TriStateAnswer>)[q.key] || 'unknown';

                return (
                  <tr key={q.key} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-3">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium text-slate-900 flex items-center gap-1">
                          {q.label}
                          <ShariahTooltip
                            title={q.label}
                            description={q.description}
                            example={q.example}
                          />
                        </span>
                        <span className="text-[11px] text-slate-500">{q.description}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 text-xs w-full justify-center">
                        <button
                          type="button"
                          onClick={() => onChangeActivityQuestion(q.key, 'yes')}
                          className={`px-3 py-1 rounded font-medium transition-colors cursor-pointer ${
                            currentAnswer === 'yes'
                              ? q.expectedForCompliance === 'no'
                                ? 'bg-rose-600 text-white shadow-2xs'
                                : 'bg-emerald-600 text-white shadow-2xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Oui
                        </button>
                        <button
                          type="button"
                          onClick={() => onChangeActivityQuestion(q.key, 'no')}
                          className={`px-3 py-1 rounded font-medium transition-colors cursor-pointer ${
                            currentAnswer === 'no'
                              ? q.expectedForCompliance === 'yes'
                                ? 'bg-rose-600 text-white shadow-2xs'
                                : 'bg-emerald-600 text-white shadow-2xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Non
                        </button>
                        <button
                          type="button"
                          onClick={() => onChangeActivityQuestion(q.key, 'unknown')}
                          className={`px-3 py-1 rounded font-medium transition-colors cursor-pointer ${
                            currentAnswer === 'unknown'
                              ? 'bg-amber-500 text-white shadow-2xs'
                              : 'text-slate-500 hover:text-slate-900'
                          }`}
                        >
                          Inconnu
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. DONNÉES FINANCIÈRES DÉCLARÉES */}
      <div className="flex flex-col gap-3 p-4 bg-slate-50/70 rounded-xl border border-slate-200">
        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-slate-200 text-slate-700 flex items-center justify-center">
              <FileEdit className="w-3.5 h-3.5" />
            </div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              2. Données financières déclarées pour le filtrage Shariah
            </h3>
            <ShariahTooltip
              title="Données financières nécessaires au screening"
              description="Ces valeurs sont automatiquement synchronisées avec la checklist financière de l'entreprise. Vous pouvez également les ajuster directement ici."
              example="Les dettes portant intérêt correspondent aux emprunts bancaires ou obligations conventionnelles sur lesquels des intérêts sont dus."
            />
          </div>
          <span className="text-[11px] text-slate-500 font-mono">
            Unité active : {unitSuffix}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <FormField
              id="shariah-business-desc"
              label="Activité principale de l'entreprise"
              value={data.shariah.businessActivity}
              onChange={(v) => onChangeField('businessActivity', v)}
              placeholder="ex : Prestations de santé et soins hospitaliers privés"
              type="text"
              tooltip={TOOLTIPS.businessActivity}
            />
          </div>

          <FormField
            id="shariah-debt-input"
            label="Dettes portant intérêt"
            value={data.shariah.interestBearingDebt}
            onChange={(v) => onChangeField('interestBearingDebt', v)}
            placeholder="0.00"
            suffix={unitSuffix}
            type="number"
            tooltip={TOOLTIPS.shariahInterestBearingDebt}
          />

          <FormField
            id="shariah-interest-income-input"
            label="Revenus d'intérêts perçus"
            value={data.shariah.interestIncome}
            onChange={(v) => onChangeField('interestIncome', v)}
            placeholder="0.00"
            suffix={unitSuffix}
            type="number"
            tooltip={TOOLTIPS.interestIncome}
          />

          <FormField
            id="shariah-impure-income-input"
            label="Autres revenus non conformes"
            value={data.shariah.nonPermissibleIncome}
            onChange={(v) => onChangeField('nonPermissibleIncome', v)}
            placeholder="0.00"
            suffix={unitSuffix}
            type="number"
            tooltip={TOOLTIPS.nonPermissibleIncome}
          />

          <FormField
            id="shariah-revenue-input"
            label="Total des revenus (Chiffre d'affaires)"
            value={data.shariah.totalRevenue}
            onChange={(v) => onChangeField('totalRevenue', v)}
            placeholder="0.00"
            suffix={unitSuffix}
            type="number"
            tooltip={TOOLTIPS.totalRevenue}
          />

          <FormField
            id="shariah-cash-input"
            label="Trésorerie & placements rémunérés"
            value={data.shariah.cashAndInterestSecurities}
            onChange={(v) => onChangeField('cashAndInterestSecurities', v)}
            placeholder="0.00"
            suffix={unitSuffix}
            type="number"
            tooltip={TOOLTIPS.cashAndInterestSecurities}
          />

          <FormField
            id="shariah-receivables-input"
            label="Créances clients"
            value={data.shariah.receivables}
            onChange={(v) => onChangeField('receivables', v)}
            placeholder="0.00"
            suffix={unitSuffix}
            type="number"
            tooltip={TOOLTIPS.receivables}
          />

          <FormField
            id="shariah-assets-input"
            label="Total de l'actif (bilan)"
            value={data.shariah.totalAssets}
            onChange={(v) => onChangeField('totalAssets', v)}
            placeholder="0.00"
            suffix={unitSuffix}
            type="number"
            tooltip={TOOLTIPS.shariahTotalAssets}
          />

          <FormField
            id="shariah-marketcap-input"
            label="Capitalisation boursière"
            value={data.shariah.marketCap}
            onChange={(v) => onChangeField('marketCap', v)}
            placeholder="0.00"
            suffix={unitSuffix}
            type="number"
            tooltip={TOOLTIPS.marketCap}
          />
        </div>
      </div>

      {/* BUNDLED INTEREST OPTION */}
      <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <input
            id="interest-unbundled-toggle"
            type="checkbox"
            checked={!data.shariah.isInterestIncomeUnbundled}
            onChange={(e) => onChangeField('isInterestIncomeUnbundled', !e.target.checked)}
            className="rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer"
          />
          <label htmlFor="interest-unbundled-toggle" className="text-slate-700 cursor-pointer">
            Le rapport financier regroupe les &quot;Intérêts et autres produits financiers&quot; dans un poste unique sans ventilation
          </label>
          <ShariahTooltip
            title="Ventilation des produits financiers"
            description="Si le rapport ne sépare pas les intérêts des autres gains de change ou dividendes de filiales, la règle conservatrice Shariah impose de suspendre la validation plutôt que de supposer arbitrairement."
            example="Un poste 'Produits financiers : 10 M MAD' sans note explicative doit être vérifié."
          />
        </div>
        {!data.shariah.isInterestIncomeUnbundled && (
          <span className="text-[11px] text-amber-700 font-medium">
            Signalé comme non résolu
          </span>
        )}
      </div>

      {/* 2. FINANCIAL RATIOS SCREENING RESULTS TABLE */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900">
              2. Filtrage quantitatif des ratios financiers ({config.shortName})
            </h3>
            <ShariahTooltip
              title="Seuils de tolérance financière"
              description="Les juristes ont établi des seuils maximaux (généralement < 30 % ou 33,33 %) pour les dettes portant intérêt et la trésorerie rémunérée afin de tolérer l'investissement dans des entreprises mixtes cotées."
              example="Pour 4 620 M MAD d'actif total, la dette portant intérêt maximale autorisée à 30 % est de 1 386 M MAD."
            />
          </div>
          <span className="text-xs text-slate-500 font-mono">
            Dénominateur : {config.denominatorType === 'NONE' ? 'Valeur absolue' : "Total de l'actif"}
          </span>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-left text-xs divide-y divide-slate-200">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="py-2.5 px-3 font-semibold">Critère financier</th>
                <th className="py-2.5 px-3 font-semibold text-center w-28">Seuil exigé</th>
                <th className="py-2.5 px-3 font-semibold text-center w-28">Valeur / Ratio</th>
                <th className="py-2.5 px-3 font-semibold text-center w-36">Résultat</th>
                <th className="py-2.5 px-3 font-semibold">Explication & Dénominateur</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {report.financialCriteria.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/50">
                  <td className="py-2.5 px-3 font-semibold text-slate-900">
                    {c.name}
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono tabular-nums text-slate-600">
                    {c.thresholdDisplay}
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono tabular-nums font-bold text-slate-900">
                    {c.valueDisplay}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="py-2.5 px-3 text-slate-600 leading-relaxed">
                    {c.explanation}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MISSING INFORMATION WARNING DRAWER */}
      {report.missingInformation.length > 0 && (
        <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div className="flex flex-col gap-1">
            <span className="font-semibold text-amber-950">
              Informations requises pour lever le statut &quot;Vérification requise&quot; :
            </span>
            <ul className="list-disc list-inside space-y-0.5 text-amber-800">
              {report.missingInformation.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
