"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  RefreshCw,
  AlertCircle,
  KeyRound,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  Building2,
  FileUp,
  FileText,
  Sparkles,
} from "lucide-react";
import { CseCompany } from "@/lib/cse-companies";
import { NormalizedJevInput, CompanyNewsItem } from "@/lib/parsebot-client";
import { FiveYearIndicators } from "@/lib/indicators";
import { FiveYearIndicatorsTable } from "./FiveYearIndicatorsTable";
import { FinancialStatementsData } from "@/lib/financial-statements";
import { FinancialStatementsSummary } from "./FinancialStatementsSummary";
import {
  JevValuationResult,
  JevTechnicalResult,
  JevNewsImpactResult,
  JevEntryOpportunity,
} from "@/lib/jev-client";
import {
  ValuationAnalysisSection,
  ValuationMetrics,
} from "./ValuationAnalysisSection";
import { TechnicalStructureSection } from "./TechnicalStructureSection";
import { TechnicalStructureData } from "@/lib/technical-structure";
import { NewsImpactSection } from "./NewsImpactSection";
import { EntryPointsSection } from "./EntryPointsSection";
import { FicheEmetteurSection } from "./FicheEmetteurSection";
import { FicheEmetteurData } from "@/lib/fiche-emetteur";
import { ImportPdfModal } from "./ImportPdfModal";

interface CompanyOverviewProps {
  ticker: string;
}

interface AnalysisResponse {
  success: boolean;
  status:
    | "success"
    | "fiche_required"
    | "parsebot_not_configured"
    | "jev_not_configured"
    | "api_error"
    | "company_data_unavailable"
    | "jev_error"
    | "unsupported_company";
  company: CseCompany | null;
  currentPrice?: number | null;
  currency?: string;
  jevDecision?: string | null;
  jevConfidence?: number | null;
  probabilities?: {
    BUY?: number;
    HOLD?: number;
    SELL?: number;
    [key: string]: number | undefined;
  } | null;
  positiveFactors?: string[];
  negativeFactors?: string[];
  risks?: string[];
  investmentContext?: string | null;
  valuation?: JevValuationResult | null;
  valuationMetrics?: ValuationMetrics | null;
  technical?: JevTechnicalResult | null;
  technicalStructure?: TechnicalStructureData | null;
  newsImpact?: JevNewsImpactResult | null;
  news?: CompanyNewsItem[] | null;
  entries?: JevEntryOpportunity[];
  fiveYearIndicators?: FiveYearIndicators | null;
  financialStatementsSummary?: FinancialStatementsData | null;
  ficheEmetteur?: FicheEmetteurData | null;
  dataUsedForAnalysis?: NormalizedJevInput | null;
  error?: string | null;
}

export function CompanyOverview({ ticker }: CompanyOverviewProps) {
  const [data, setData] = useState<AnalysisResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzingAgain, setIsAnalyzingAgain] = useState(false);
  const [isDataOpen, setIsDataOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const runAnalysis = useCallback(async (isRetry = false) => {
    if (isRetry) {
      setIsAnalyzingAgain(true);
    } else {
      setIsLoading(true);
    }

    try {
      const res = await fetch(`/api/companies/${encodeURIComponent(ticker)}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const json: AnalysisResponse = await res.json();
      setData(json);
    } catch (err: unknown) {
      setData({
        success: false,
        status: "api_error",
        company: null,
        error: (err as Error).message || "Network error running analysis.",
      });
    } finally {
      setIsLoading(false);
      setIsAnalyzingAgain(false);
    }
  }, [ticker]);

  useEffect(() => {
    let ignore = false;
    async function initialLoad() {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/companies/${encodeURIComponent(ticker)}/analyze`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        const json: AnalysisResponse = await res.json();
        if (ignore) return;
        setData(json);
      } catch (err: unknown) {
        if (!ignore) {
          setData({
            success: false,
            status: "api_error",
            company: null,
            error: (err as Error).message || "Network error running analysis.",
          });
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    void initialLoad();

    return () => {
      ignore = true;
    };
  }, [ticker]);

  const copyJsonToClipboard = () => {
    if (!data?.dataUsedForAnalysis) return;
    navigator.clipboard.writeText(JSON.stringify(data.dataUsedForAnalysis, null, 2));
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // 1. Loading State
  if (isLoading) {
    return (
      <div className="w-full max-w-4xl mx-auto py-12 px-4 sm:px-6">
        <div className="mb-6">
          <Link
            href="/companies"
            className="text-xs text-zinc-600 hover:text-zinc-900 inline-flex items-center gap-1 font-medium"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Companies
          </Link>
        </div>
        <div className="py-24 text-center text-zinc-600 text-sm flex flex-col items-center gap-3">
          <RefreshCw className="w-6 h-6 animate-spin text-zinc-900" />
          <div className="font-semibold text-zinc-900 text-base">
            Analyzing {ticker.toUpperCase()}...
          </div>
          <p className="text-xs text-zinc-500 max-w-sm">
            Processing Casablanca Stock Exchange PDF data and consulting JEV AI decision engine.
          </p>
        </div>
      </div>
    );
  }

  // 2. Unsupported Company State
  if (
    data?.status === "unsupported_company" ||
    (!data?.company &&
      data?.status !== "parsebot_not_configured" &&
      data?.status !== "jev_not_configured" &&
      data?.status !== "fiche_required")
  ) {
    return (
      <div className="w-full max-w-4xl mx-auto py-12 px-4 sm:px-6">
        <div className="mb-6">
          <Link
            href="/companies"
            className="text-xs text-zinc-600 hover:text-zinc-900 inline-flex items-center gap-1 font-medium"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Companies
          </Link>
        </div>
        <div className="border border-zinc-200 rounded-xl p-8 bg-white text-center">
          <Building2 className="w-8 h-8 text-zinc-400 mx-auto mb-3" />
          <h1 className="text-lg font-bold text-zinc-900">Unsupported Company</h1>
          <p className="text-sm text-zinc-600 mt-2 max-w-md mx-auto">
            {data?.error || `The ticker '${ticker.toUpperCase()}' is not listed on the Casablanca Stock Exchange.`}
          </p>
          <div className="mt-6">
            <Link
              href="/companies"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-zinc-900 text-white hover:bg-zinc-800 text-xs font-medium rounded-lg transition-colors"
            >
              Browse Listed Companies
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 3. Fiche Required State (PDF not uploaded yet)
  if (data?.status === "fiche_required" && data?.company) {
    const company = data.company;
    return (
      <div className="w-full max-w-4xl mx-auto py-10 px-4 sm:px-6">
        <div className="mb-6">
          <Link
            href="/companies"
            className="text-xs text-zinc-600 hover:text-zinc-900 inline-flex items-center gap-1 font-medium"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Companies
          </Link>
        </div>

        <div className="border border-zinc-200 rounded-2xl p-8 sm:p-12 bg-white shadow-xs text-center space-y-6">
          <div className="w-14 h-14 rounded-2xl bg-zinc-100 text-zinc-900 mx-auto flex items-center justify-center">
            <FileText className="w-7 h-7" />
          </div>

          <div className="max-w-lg mx-auto">
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-zinc-100 text-zinc-800 border border-zinc-200">
                {company.ticker}
              </span>
              <span className="text-xs text-zinc-500 font-medium">
                {company.sector}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900">
              {company.name}
            </h1>
            <p className="text-xs sm:text-sm text-zinc-600 mt-3 leading-relaxed">
              To analyze this company, upload its official Bourse de Casablanca Fiche Instrument PDF. All stock quotes, multi-year balance sheets, CPC, dividends, shareholders, and JEV AI analysis will be populated directly from the document.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsImportModalOpen(true)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-900 text-white text-xs font-semibold hover:bg-zinc-800 transition-colors shadow-xs"
            >
              <FileUp className="w-4 h-4" />
              Import Fiche Instrument (PDF)
            </button>

            {company.ticker === "ATW" && (
              <button
                type="button"
                onClick={async () => {
                  await fetch("/api/pdf/import", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ sample: "ATW" }),
                  });
                  runAnalysis(true);
                }}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-zinc-200 text-zinc-700 text-xs font-medium hover:bg-zinc-50 transition-colors"
              >
                <Sparkles className="w-4 h-4 text-zinc-500" />
                Quick Load Official ATW Sample
              </button>
            )}
          </div>
        </div>

        <ImportPdfModal
          isOpen={isImportModalOpen}
          defaultTicker={company.ticker}
          onClose={() => setIsImportModalOpen(false)}
          onSuccess={() => runAnalysis(true)}
        />
      </div>
    );
  }

  const company = data?.company || {
    ticker: ticker.toUpperCase(),
    name: ticker.toUpperCase(),
    exchange: "Casablanca Stock Exchange",
    currency: "MAD",
    sector: "Actions",
    isin: "",
  };
  const isJevNotConfigured = data?.status === "jev_not_configured";
  const isJevError = data?.status === "jev_error";
  const isApiError = data?.status === "api_error" || data?.status === "company_data_unavailable";
  const isSuccess = data?.status === "success" || isJevNotConfigured;

  // Decision styling
  const decision = data?.jevDecision?.toUpperCase() || null;
  const isBuy = decision === "BUY";
  const isSell = decision === "SELL";

  return (
    <div className="w-full max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Top action bar */}
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/companies"
          className="text-xs text-zinc-600 hover:text-zinc-900 inline-flex items-center gap-1 font-medium transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Companies
        </Link>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-700 bg-white border border-zinc-300 hover:bg-zinc-50 rounded-lg transition-colors cursor-pointer"
            title="Import or update Casablanca Stock Exchange PDF"
          >
            <FileUp className="w-3.5 h-3.5" />
            <span>Update PDF</span>
          </button>

          <button
            type="button"
            onClick={() => runAnalysis(true)}
            disabled={isAnalyzingAgain}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-800 bg-white border border-zinc-300 hover:bg-zinc-50 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzingAgain ? "animate-spin" : ""}`} />
            {isAnalyzingAgain ? "Analyzing..." : "Analyze"}
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="border border-zinc-200 rounded-xl p-6 sm:p-8 bg-white shadow-xs">
        {/* Company Header */}
        <div className="pb-6 border-b border-zinc-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-zinc-500 font-medium">
              <span>{company.exchange}</span>
              <span aria-hidden="true">·</span>
              <span>{company.sector}</span>
            </div>

            <div className="flex items-center gap-3 mt-1.5">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900">
                {company.name}
              </h1>
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-zinc-100 text-zinc-800 border border-zinc-200">
                {company.ticker}
              </span>
            </div>
          </div>

          {data?.ficheEmetteur?.dateDonnees && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-50 border border-zinc-200 text-xs text-zinc-600 font-mono">
              <FileText className="w-3.5 h-3.5 text-zinc-400" />
              <span>Fiche: {data.ficheEmetteur.dateDonnees}</span>
            </div>
          )}
        </div>

        {/* 3. JEV Not Configured Alert Banner */}
        {isJevNotConfigured && (
          <div className="my-6 p-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-900 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold block">JEV AI API key is not configured</strong>
                <span>
                  Factual stock data and financial ratios have been extracted from the Casablanca Stock Exchange PDF. Configure your JEV API key in Settings to obtain BUY / HOLD / SELL investment decisions and confidence scores.
                </span>
              </div>
            </div>
            <Link
              href="/settings"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-900 text-white rounded-md font-medium text-xs hover:bg-amber-800 transition-colors shrink-0"
            >
              <KeyRound className="w-3.5 h-3.5" />
              Configure in Settings
            </Link>
          </div>
        )}

        {/* 4. API Error or JEV Error */}
        {(isApiError || isJevError) && (
          <div className="my-6 p-4 rounded-xl border border-red-200 bg-red-50 text-red-900 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold block">
                  {isJevError ? "JEV AI Analysis Notice" : "Notice"}
                </strong>
                <span>{data?.error || "An error occurred during analysis."}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => runAnalysis(true)}
              disabled={isAnalyzingAgain}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-900 text-white rounded-md font-medium text-xs hover:bg-red-800 transition-colors shrink-0 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzingAgain ? "animate-spin" : ""}`} />
              Try Again
            </button>
          </div>
        )}

        {/* 5. Main Results Section */}
        {isSuccess && (
          <div className="mt-8 space-y-8">
            {/* Primary Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 py-2">
              {/* Current Stock Price */}
              <div className="p-5 border border-zinc-200 rounded-xl bg-white">
                <span className="text-xs font-medium text-zinc-500 block">Current Price</span>
                <div className="mt-2 flex items-baseline gap-1.5">
                  {data.currentPrice !== null && data.currentPrice !== undefined ? (
                    <>
                      <span className="font-mono text-2xl sm:text-3xl font-bold text-zinc-900 tabular-nums">
                        {data.currentPrice.toFixed(2)}
                      </span>
                      <span className="text-xs font-semibold text-zinc-500">
                        {data.currency || company.currency}
                      </span>
                    </>
                  ) : (
                    <span className="text-sm text-zinc-500 italic">Feed not available</span>
                  )}
                </div>
                <span className="text-[11px] text-zinc-600 mt-1 block">Casablanca Stock Exchange</span>
              </div>

              {/* JEV Decision */}
              <div className="p-5 border border-zinc-200 rounded-xl bg-white flex flex-col justify-between">
                <div>
                  <span className="text-xs font-medium text-zinc-500 block">Decision</span>
                  <div className="mt-2">
                    <span
                      className={`inline-block text-xl sm:text-2xl font-bold font-mono tracking-tight px-3 py-1 rounded-md border ${
                        isBuy
                          ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                          : isSell
                          ? "bg-rose-50 text-rose-800 border-rose-300"
                          : "bg-zinc-100 text-zinc-800 border-zinc-300"
                      }`}
                    >
                      {decision || "HOLD"}
                    </span>
                  </div>
                </div>
                <span className="text-[11px] text-zinc-600 mt-2 block">Source: JEV AI</span>
              </div>

              {/* JEV Confidence */}
              <div className="p-5 border border-zinc-200 rounded-xl bg-white">
                <span className="text-xs font-medium text-zinc-500 block">Confidence</span>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="font-mono text-2xl sm:text-3xl font-bold text-zinc-900 tabular-nums">
                    {data.jevConfidence !== null && data.jevConfidence !== undefined
                      ? `${data.jevConfidence}%`
                      : "—"}
                  </span>
                </div>
                <span className="text-[11px] text-zinc-600 mt-1 block">Model probability score</span>
              </div>
            </div>

            {/* Decision Probabilities (Secondary & Visually Simple) */}
            {data.probabilities && (
              <div className="p-4 border border-zinc-200 rounded-xl bg-zinc-50/50">
                <span className="text-xs font-semibold text-zinc-600 block mb-3">
                  Decision Probabilities
                </span>
                <div className="flex flex-wrap items-center gap-6 text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-zinc-700">BUY</span>
                    <span className="font-bold text-zinc-900 tabular-nums">
                      {data.probabilities.BUY ?? 0}%
                    </span>
                  </div>
                  <span className="text-zinc-300 hidden sm:inline" aria-hidden="true">
                    |
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-zinc-700">HOLD</span>
                    <span className="font-bold text-zinc-900 tabular-nums">
                      {data.probabilities.HOLD ?? 0}%
                    </span>
                  </div>
                  <span className="text-zinc-300 hidden sm:inline" aria-hidden="true">
                    |
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-zinc-700">SELL</span>
                    <span className="font-bold text-zinc-900 tabular-nums">
                      {data.probabilities.SELL ?? 0}%
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* "Why this decision?" Section */}
            {((data.positiveFactors && data.positiveFactors.length > 0) ||
              (data.negativeFactors && data.negativeFactors.length > 0) ||
              (data.risks && data.risks.length > 0)) && (
              <div className="pt-6 border-t border-zinc-100">
                <div className="mb-4">
                  <h2 className="text-sm font-bold text-zinc-900 tracking-tight">
                    Why this decision?
                  </h2>
                  {data.investmentContext && (
                    <p className="text-xs text-zinc-500 mt-1">
                      {data.investmentContext}
                    </p>
                  )}
                </div>

                <div className="space-y-4">
                  {/* Strengths (Green) */}
                  {data.positiveFactors && data.positiveFactors.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold text-emerald-800 flex items-center gap-2 mb-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" aria-hidden="true" />
                        Strengths
                      </div>
                      <ul className="space-y-1.5 pl-3.5 border-l-2 border-emerald-500/30">
                        {data.positiveFactors.map((factor, idx) => (
                          <li key={idx} className="text-xs text-zinc-700 leading-relaxed">
                            {factor}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Weaknesses (Red) */}
                  {data.negativeFactors && data.negativeFactors.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold text-rose-800 flex items-center gap-2 mb-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" aria-hidden="true" />
                        Weaknesses
                      </div>
                      <ul className="space-y-1.5 pl-3.5 border-l-2 border-rose-500/30">
                        {data.negativeFactors.map((factor, idx) => (
                          <li key={idx} className="text-xs text-zinc-700 leading-relaxed">
                            {factor}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Risks (Amber) */}
                  {data.risks && data.risks.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold text-amber-800 flex items-center gap-2 mb-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" aria-hidden="true" />
                        Risks
                      </div>
                      <ul className="space-y-1.5 pl-3.5 border-l-2 border-amber-500/30">
                        {data.risks.map((risk, idx) => (
                          <li key={idx} className="text-xs text-zinc-700 leading-relaxed">
                            {risk}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Valuation Analysis Section */}
            <ValuationAnalysisSection
              valuation={data.valuation}
              metrics={
                data.valuationMetrics || {
                  currentPer: data.fiveYearIndicators?.summaries.per.latestValue ?? null,
                  fiveYearAveragePer: data.fiveYearIndicators?.summaries.per.fiveYearAverage ?? null,
                  currentEps: data.fiveYearIndicators?.summaries.bpa.latestValue ?? null,
                  roe: data.fiveYearIndicators?.summaries.roe.latestValue ?? null,
                  dividendYield: data.fiveYearIndicators?.summaries.dividendYield.latestValue ?? null,
                  currency: data.currency || company.currency,
                }
              }
              currency={data.currency || company.currency}
            />

            {/* Technical Structure Analysis Section */}
            <TechnicalStructureSection
              technical={data.technical}
              structure={data.technicalStructure}
              currency={data.currency || company.currency}
            />

            {/* News Impact Analysis Section */}
            <NewsImpactSection
              newsImpact={data.newsImpact}
              news={data.news || data.dataUsedForAnalysis?.recent_news}
            />

            {/* Entry Points & Opportunities Section */}
            <EntryPointsSection
              entries={data.entries}
              currency={data.currency || company.currency}
            />

            {/* Official Casablanca Stock Exchange Fiche Émetteur (Instrument, Governance, Shareholders, Dividends) */}
            <FicheEmetteurSection
              ticker={company.ticker}
              fiche={data.ficheEmetteur}
              onFicheImported={() => runAnalysis(true)}
            />

            {/* Five-Year Key Indicators Section */}
            <FiveYearIndicatorsTable
              indicators={data.fiveYearIndicators}
              currency={data.currency || company.currency}
            />

            {/* Financial Statements Summary (Bilan, CPC, Trésorerie) */}
            <FinancialStatementsSummary
              statements={data.financialStatementsSummary}
              currency={data.currency || company.currency}
            />

            {/* Primary Call to Action: Analyze again button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => runAnalysis(true)}
                disabled={isAnalyzingAgain}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-zinc-900 text-white hover:bg-zinc-800 disabled:bg-zinc-400 text-xs font-medium rounded-lg shadow-xs transition-colors cursor-pointer disabled:cursor-not-allowed"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzingAgain ? "animate-spin" : ""}`} />
                {isAnalyzingAgain ? "Fetching latest data & re-analyzing..." : "Analyze again"}
              </button>
            </div>
          </div>
        )}

        {/* 6. Collapsible Section: "Data used for analysis" */}
        {data.dataUsedForAnalysis && (
          <div className="mt-8 pt-6 border-t border-zinc-200">
            <button
              type="button"
              onClick={() => setIsDataOpen(!isDataOpen)}
              className="w-full flex items-center justify-between text-left p-3 rounded-lg hover:bg-zinc-50 transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-2">
                {isDataOpen ? (
                  <ChevronDown className="w-4 h-4 text-zinc-500" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-zinc-500" />
                )}
                <span className="text-xs font-semibold text-zinc-800 group-hover:text-zinc-900">
                  Data used for analysis
                </span>
                <span className="text-[11px] text-zinc-600 font-mono">
                  (Normalized JEV JSON Input)
                </span>
              </div>
              <span className="text-[11px] text-zinc-600 group-hover:text-zinc-700">
                {isDataOpen ? "Hide" : "Inspect JSON"}
              </span>
            </button>

            {isDataOpen && (
              <div className="mt-3 p-4 bg-zinc-50 border border-zinc-200 rounded-xl">
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-zinc-200">
                  <span className="text-[11px] text-zinc-500 font-mono">
                    Provider: Bourse de Casablanca Fiche Émetteur (PDF) · Factual values only (missing fields are null)
                  </span>
                  <button
                    type="button"
                    onClick={copyJsonToClipboard}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs text-zinc-700 bg-white border border-zinc-200 hover:bg-zinc-100 rounded-md transition-colors cursor-pointer"
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700 font-medium">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy JSON</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="text-xs font-mono text-zinc-800 overflow-x-auto max-h-96 p-2 leading-relaxed bg-white rounded-lg border border-zinc-200">
                  {JSON.stringify(data.dataUsedForAnalysis, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Import / Update PDF Modal */}
      <ImportPdfModal
        isOpen={isImportModalOpen}
        defaultTicker={company.ticker}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={() => runAnalysis(true)}
      />
    </div>
  );
}
