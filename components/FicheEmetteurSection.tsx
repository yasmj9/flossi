"use client";

import { useState } from "react";
import {
  FileText,
  ExternalLink,
  Users,
  Building,
  Coins,
  ChevronDown,
  ChevronUp,
  Upload,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  Phone,
  Mail,
} from "lucide-react";
import { FicheEmetteurData } from "@/lib/fiche-emetteur";

interface FicheEmetteurSectionProps {
  ticker: string;
  fiche?: FicheEmetteurData | null;
  onFicheImported?: () => void;
}

export function FicheEmetteurSection({
  ticker,
  fiche,
  onFicheImported,
}: FicheEmetteurSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadMessage(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`/api/companies/${encodeURIComponent(ticker)}/import-fiche`, {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setUploadMessage({
          type: "success",
          text: json.message || "Fiche Émetteur PDF imported successfully.",
        });
        if (onFicheImported) {
          onFicheImported();
        }
      } else {
        setUploadMessage({
          type: "error",
          text: json.error || "Failed to parse Fiche Émetteur PDF.",
        });
      }
    } catch (err: unknown) {
      setUploadMessage({
        type: "error",
        text: (err as Error).message || "Upload network failure.",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const officialUrl = fiche?.sourceUrl || `https://www.casablanca-bourse.com/live-market/actions/fiche/${ticker.toUpperCase()}`;

  return (
    <section className="bg-white border border-zinc-200 rounded-xl p-6 sm:p-7 shadow-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-zinc-100">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-zinc-100 text-zinc-900 shrink-0 mt-0.5">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-zinc-900 tracking-tight">
                Fiche Émetteur — Bourse de Casablanca
              </h2>
              {fiche?.dateDonnees && (
                <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-zinc-100 text-zinc-700 border border-zinc-200">
                  Données au {fiche.dateDonnees}
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">
              Official issuer factsheet, governance, instrument profile, and shareholders registry.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <a
            href={officialUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-700 bg-white border border-zinc-300 hover:bg-zinc-50 rounded-lg transition-colors cursor-pointer"
          >
            <span>Fiche Officielle CSE</span>
            <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
          </a>

          <button
            type="button"
            onClick={() => setIsUploadOpen(!isUploadOpen)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-700 bg-white border border-zinc-300 hover:bg-zinc-50 rounded-lg transition-colors cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 text-zinc-400" />
            <span>Importer PDF</span>
          </button>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 text-zinc-400 hover:text-zinc-700 rounded-md transition-colors cursor-pointer"
            aria-label={isExpanded ? "Collapse section" : "Expand section"}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* PDF Upload Drawer */}
      {isUploadOpen && (
        <div className="mt-4 p-4 rounded-xl border border-zinc-200 bg-zinc-50/70 text-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-zinc-900">
              Importer une Fiche Émetteur (PDF de la Bourse de Casablanca)
            </span>
            <span className="text-zinc-500 text-[11px]">Format PDF officiel</span>
          </div>
          <p className="text-zinc-600 mb-3 leading-relaxed">
            Téléchargez le document officiel &quot;Fiche Émetteur&quot; généré depuis le site de la Bourse de Casablanca pour extraire instantanément le cours, les ratios financiers, les dirigeants et l&apos;actionnariat.
          </p>

          <div className="flex items-center gap-3">
            <label className="inline-flex items-center gap-2 px-3.5 py-2 bg-zinc-900 text-white rounded-lg font-medium text-xs hover:bg-zinc-800 transition-colors cursor-pointer shadow-xs">
              <Upload className="w-3.5 h-3.5" />
              <span>{isUploading ? "Analyse du PDF..." : "Sélectionner le fichier PDF"}</span>
              <input
                type="file"
                accept=".pdf"
                className="hidden"
                disabled={isUploading}
                onChange={handleFileUpload}
              />
            </label>
            <span className="text-[11px] text-zinc-500">
              Extraction 100% locale et sécurisée
            </span>
          </div>

          {uploadMessage && (
            <div
              className={`mt-3 p-3 rounded-lg border text-xs flex items-center gap-2 ${
                uploadMessage.type === "success"
                  ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                  : "bg-red-50 border-red-200 text-red-900"
              }`}
            >
              {uploadMessage.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              )}
              <span>{uploadMessage.text}</span>
            </div>
          )}
        </div>
      )}

      {/* Main Content */}
      {isExpanded && (
        <div className="mt-6 space-y-7">
          {/* 1. Instrument & Company Profile */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Instrument Info */}
            <div className="border border-zinc-200 rounded-lg p-4 bg-white">
              <div className="flex items-center gap-2 text-xs font-semibold text-zinc-900 mb-3">
                <Coins className="w-4 h-4 text-zinc-600" />
                <span>INFORMATIONS DE L&apos;INSTRUMENT</span>
              </div>
              <div className="grid grid-cols-2 gap-y-2.5 gap-x-4 text-xs">
                <div>
                  <span className="text-zinc-500 block text-[11px]">ISIN</span>
                  <span className="font-mono font-medium text-zinc-900">
                    {fiche?.instrument.isin || "—"}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[11px]">Ticker</span>
                  <span className="font-mono font-bold text-zinc-900">
                    {fiche?.instrument.ticker || ticker.toUpperCase()}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[11px]">Marché</span>
                  <span className="font-medium text-zinc-900">
                    {fiche?.instrument.marche || "Principal A"}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[11px]">Secteur</span>
                  <span className="font-medium text-zinc-900">
                    {fiche?.instrument.secteur || "Banques"}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[11px]">Nombre de titres</span>
                  <span className="font-mono font-medium text-zinc-900">
                    {fiche?.instrument.nombreTitres?.toLocaleString("fr-FR") || "—"}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[11px]">Valeur nominale</span>
                  <span className="font-mono font-medium text-zinc-900">
                    {fiche?.instrument.valeurNominale !== null && fiche?.instrument.valeurNominale !== undefined
                      ? `${fiche.instrument.valeurNominale.toFixed(2)} MAD`
                      : "—"}
                  </span>
                </div>
                {fiche?.instrument.capitalisationMAD && (
                  <div className="col-span-2 pt-1 border-t border-zinc-100">
                    <span className="text-zinc-500 block text-[11px]">Capitalisation boursière</span>
                    <span className="font-mono font-bold text-zinc-900">
                      {(fiche.instrument.capitalisationMAD / 1_000_000_000).toFixed(2)} Mrd MAD
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Company Info */}
            <div className="border border-zinc-200 rounded-lg p-4 bg-white">
              <div className="flex items-center gap-2 text-xs font-semibold text-zinc-900 mb-3">
                <Building className="w-4 h-4 text-zinc-600" />
                <span>INFORMATIONS SUR LA SOCIÉTÉ</span>
              </div>
              <div className="space-y-2.5 text-xs">
                {fiche?.societe.siege && (
                  <div>
                    <span className="text-zinc-500 block text-[11px]">Siège</span>
                    <span className="text-zinc-800 leading-snug">{fiche.societe.siege}</span>
                  </div>
                )}
                {fiche?.societe.auditeur && (
                  <div>
                    <span className="text-zinc-500 block text-[11px]">Auditeur</span>
                    <span className="text-zinc-800">{fiche.societe.auditeur}</span>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  {fiche?.societe.constitution && (
                    <div>
                      <span className="text-zinc-500 block text-[11px]">Constitution</span>
                      <span className="font-mono text-zinc-800">{fiche.societe.constitution}</span>
                    </div>
                  )}
                  {fiche?.societe.introduction && (
                    <div>
                      <span className="text-zinc-500 block text-[11px]">Introduction en Bourse</span>
                      <span className="font-mono text-zinc-800">{fiche.societe.introduction}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 2. Dirigeants de l'Entreprise */}
          {fiche?.dirigeants && fiche.dirigeants.length > 0 && (
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-zinc-900 mb-3">
                <Briefcase className="w-4 h-4 text-zinc-600" />
                <span>DIRIGEANTS DE L&apos;ENTREPRISE</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {fiche.dirigeants.map((dir, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-lg border border-zinc-200 bg-zinc-50/50 flex flex-col justify-between"
                  >
                    <span className="text-[11px] text-zinc-500 font-medium leading-tight mb-1.5">
                      {dir.poste}
                    </span>
                    <span className="text-xs font-bold text-zinc-900">
                      {dir.nom}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. Principaux Actionnaires */}
          {fiche?.actionnaires && fiche.actionnaires.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-zinc-900">
                  <Users className="w-4 h-4 text-zinc-600" />
                  <span>
                    PRINCIPAUX ACTIONNAIRES
                    {fiche.dateActionnariat ? ` (${fiche.dateActionnariat})` : ""}
                  </span>
                </div>
                <span className="text-[11px] text-zinc-400 font-mono">
                  {fiche.actionnaires.length} Déclarants
                </span>
              </div>

              <div className="border border-zinc-200 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-zinc-50/70 border-b border-zinc-200 text-zinc-600 font-medium text-[11px]">
                        <th className="py-2.5 px-4">Déclarant</th>
                        <th className="py-2.5 px-4 text-right">Part en %</th>
                        <th className="py-2.5 px-4 w-40">Répartition</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {fiche.actionnaires.map((act, idx) => (
                        <tr key={idx} className="hover:bg-zinc-50/40 transition-colors">
                          <td className="py-2 px-4 font-medium text-zinc-900">
                            {act.declarant}
                          </td>
                          <td className="py-2 px-4 text-right font-mono font-semibold text-zinc-900">
                            {act.partPct.toFixed(2)}%
                          </td>
                          <td className="py-2 px-4">
                            <div className="w-full bg-zinc-100 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="bg-zinc-800 h-1.5 rounded-full"
                                style={{ width: `${Math.min(act.partPct, 100)}%` }}
                              />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 4. Historique des Dividendes */}
          {fiche?.dividendes && fiche.dividendes.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-zinc-900">
                  <Coins className="w-4 h-4 text-zinc-600" />
                  <span>HISTORIQUE DES DIVIDENDES DÉTACHÉS</span>
                </div>
                <span className="text-[11px] text-zinc-400 font-mono">
                  {fiche.dividendes.length} Exercices
                </span>
              </div>

              <div className="border border-zinc-200 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-zinc-50/70 border-b border-zinc-200 text-zinc-600 font-medium text-[11px]">
                        <th className="py-2 px-4">Année</th>
                        <th className="py-2 px-4 text-right">Montant (MAD)</th>
                        <th className="py-2 px-4">Type</th>
                        <th className="py-2 px-4 text-right">Date de détachement</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 font-mono">
                      {fiche.dividendes.map((div, idx) => (
                        <tr key={idx} className="hover:bg-zinc-50/40 transition-colors">
                          <td className="py-2 px-4 font-bold text-zinc-900">
                            {div.annee}
                          </td>
                          <td className="py-2 px-4 text-right font-bold text-emerald-800">
                            {div.montantMAD.toFixed(2)} MAD
                          </td>
                          <td className="py-2 px-4 font-sans text-zinc-600">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-medium border ${
                                div.type === "Exceptionnel"
                                  ? "bg-amber-50 text-amber-800 border-amber-200"
                                  : "bg-zinc-100 text-zinc-700 border-zinc-200"
                              }`}
                            >
                              {div.type}
                            </span>
                          </td>
                          <td className="py-2 px-4 text-right text-zinc-500 text-[11px]">
                            {div.dateDetachement || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 5. Contact Relations Investisseurs */}
          {fiche?.relationsInvestisseurs && (
            <div className="p-4 rounded-lg border border-zinc-200 bg-zinc-50/40 text-xs">
              <span className="font-semibold text-zinc-900 block mb-2">
                CONTACT RELATIONS INVESTISSEURS
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-zinc-600">
                {fiche.relationsInvestisseurs.responsable && (
                  <div>
                    <span className="text-[11px] text-zinc-400 block">Responsable</span>
                    <span className="font-medium text-zinc-900">
                      {fiche.relationsInvestisseurs.responsable}
                    </span>
                  </div>
                )}
                {fiche.relationsInvestisseurs.courriel && (
                  <div className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                    <a
                      href={`mailto:${fiche.relationsInvestisseurs.courriel}`}
                      className="text-zinc-900 hover:underline truncate"
                    >
                      {fiche.relationsInvestisseurs.courriel}
                    </a>
                  </div>
                )}
                {fiche.relationsInvestisseurs.telephone && (
                  <div className="flex items-center gap-1.5 font-mono">
                    <Phone className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                    <span>{fiche.relationsInvestisseurs.telephone}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
