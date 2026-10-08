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
  FileUp,
  FileText,
  Sparkles,
} from "lucide-react";
import { CseCompany } from "@/lib/cse-companies";
import { JevScoreResult } from "@/lib/jev-client";
import { JevQuickstartPayload } from "@/lib/jev-payload";
import { FicheEmetteurData } from "@/lib/fiche-emetteur";
import { ImportPdfModal } from "./ImportPdfModal";

interface CompanyOverviewProps {
  ticker: string;
}

export interface FiveKeyMetrics {
  currentPer: number | null;
  fiveYearAveragePer: number | null;
  currentEps: number | null;
  roe: number | null;
  dividendYield: number | null;
  currency?: string;
}

interface AnalysisResponse {
  success: boolean;
  status:
    | "success"
    | "fiche_required"
    | "jev_not_configured"
    | "api_error"
    | "company_data_unavailable"
    | "jev_error"
    | "unsupported_company";
  company: CseCompany | null;
  currentPrice?: number | null;
  currency?: string;
  fiveKeyMetrics?: FiveKeyMetrics | null;
  jevDecision?: string | null;
  jevConfidence?: number | null;
  probabilities?: {
    BUY?: number;
    HOLD?: number;
    SELL?: number;
    [key: string]: number | undefined;
  } | null;
  scores?: {
    fundamentalQuality?: JevScoreResult | null;
    valuationAttractiveness?: JevScoreResult | null;
    technicalAttractiveness?: JevScoreResult | null;
    entryAttractiveness?: JevScoreResult | null;
  } | null;
  ficheEmetteur?: FicheEmetteurData | null;
  dataUsedForAnalysis?: JevQuickstartPayload | Record<string, unknown> | null;
  error?: string | null;
}

export function CompanyOverview({ ticker }: CompanyOverviewProps) {
  const [data, setData] = useState<AnalysisResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzingAgain, setIsAnalyzingAgain] = useState(false);
  const [isDataOpen, setIsDataOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const runAnalysis = useCallback(
    async (isRetry = false) => {
      if (isRetry) {
        setIsAnalyzingAgain(true);
      } else {
        setIsLoading(true);
      }

      try {
        const res = await fetch(
          `/api/companies/${encodeURIComponent(ticker)}/analyze`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
          }
        );
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
    },
    [ticker]
  );

  useEffect(() => {
    let ignore = false;
    async function initialLoad() {
      setIsLoading(true);
      try {
        const res = await fetch(
          `/api/companies/${encodeURIComponent(ticker)}/analyze`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
          }
        );
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
    const jsonStr = JSON.stringify(data.dataUsedForAnalysis, null, 2);
    void navigator.clipboard.writeText(jsonStr);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="w-full max-w-4xl mx-auto py-16 px-4 flex flex-col items-center justify-center min-h-[400px]">
        <RefreshCw className="w-6 h-6 text-zinc-400 animate-spin mb-3" />
        <p className="text-xs text-zinc-500 font-medium">
          Loading Casablanca Stock Exchange company data...
        </p>
      </div>
    );
  }

  // Fiche required state (No PDF uploaded yet)
  if (data?.status === "fiche_required") {
    const company = data.company || {
      name: ticker.toUpperCase(),
      ticker: ticker.toUpperCase(),
      exchange: "Casablanca Stock Exchange",
      sector: "Actions",
      currency: "MAD",
    };

    return (
      <div className="w-full max-w-3xl mx-auto py-12 px-4 sm:px-6">
        <div className="mb-6">
          <Link
            href="/companies"
            className="text-xs text-zinc-500 hover:text-zinc-900 inline-flex items-center gap-1.5 font-medium transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Companies
          </Link>
        </div>

        <div className="border border-zinc-200 rounded-2xl p-8 bg-white text-center space-y-6 shadow-xs">
          <div className="w-12 h-12 rounded-xl bg-zinc-100 border border-zinc-200 text-zinc-800 flex items-center justify-center mx-auto">
            <FileText className="w-6 h-6" />
          </div>

          <div className="max-w-md mx-auto">
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-zinc-100 text-zinc-800 border border-zinc-200">
                {company.ticker}
              </span>
              <span className="text-xs text-zinc-500">{company.sector}</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
              {company.name}
            </h1>
            <p className="text-xs text-zinc-600 mt-2 leading-relaxed">
              Upload the Casablanca Stock Exchange Fiche PDF for this company to extract market price, PER, EPS, ROE, and dividend yield for JEV AI investment analysis.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsImportModalOpen(true)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-900 text-white text-xs font-semibold hover:bg-zinc-800 transition-colors shadow-xs cursor-pointer"
            >
              <FileUp className="w-4 h-4" />
              Import Casablanca Stock Exchange PDF
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
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-zinc-200 text-zinc-700 text-xs font-medium hover:bg-zinc-50 transition-colors cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-zinc-400" />
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

  // The 5 Key Valuation / Financial Metrics
  const metrics: FiveKeyMetrics = data?.fiveKeyMetrics || {
    currentPer: null,
    fiveYearAveragePer: null,
    currentEps: null,
    roe: null,
    dividendYield: null,
  };

  // Decision styling
  const decision = data?.jevDecision?.toUpperCase() || null;
  const isBuy = decision === "BUY";
  const isSell = decision === "SELL";

  return (
    <div className="w-full max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8 bg-white min-h-screen">
      {/* Top action bar */}
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/companies"
          className="text-xs text-zinc-600 hover:text-zinc-900 inline-flex items-center gap-1.5 font-medium transition-colors"
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
            <RefreshCw
              className={`w-3.5 h-3.5 ${isAnalyzingAgain ? "animate-spin" : ""}`}
            />
            {isAnalyzingAgain ? "Analyzing..." : "Analyze"}
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="border border-zinc-200 rounded-xl p-6 sm:p-8 bg-white shadow-xs space-y-8">
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

        {/* JEV Not Configured Alert Banner */}
        {isJevNotConfigured && (
          <div className="p-4 rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-800 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-zinc-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold block text-zinc-900">
                  JEV AI API key is not configured
                </strong>
                <span>
                  Factual stock price and the 5 key financial ratios are extracted. Configure your JEV API key in Settings to run the BUY / HOLD / SELL investment decision model.
                </span>
              </div>
            </div>
            <Link
              href="/settings"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 text-white rounded-lg font-medium text-xs hover:bg-zinc-800 transition-colors shrink-0"
            >
              <KeyRound className="w-3.5 h-3.5" />
              Configure in Settings
            </Link>
          </div>
        )}

        {/* API Error Banner */}
        {(isApiError || isJevError) && (
          <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/50 text-rose-900 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold block">
                  {isJevError ? "JEV AI Notice" : "Notice"}
                </strong>
                <span>{data?.error || "An error occurred during analysis."}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => runAnalysis(true)}
              disabled={isAnalyzingAgain}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-900 text-white rounded-lg font-medium text-xs hover:bg-rose-800 transition-colors shrink-0 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isAnalyzingAgain ? "animate-spin" : ""}`}
              />
              Try Again
            </button>
          </div>
        )}

        {/* Minimalist Metrics Section: Current Price + The 5 Key Metrics */}
        {isSuccess && (
          <div className="space-y-8">
            <div>
              <div className="mb-3">
                <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                  Market & Key Ratios
                </h2>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {/* 1. Current Price */}
                <div className="p-4 rounded-xl border border-zinc-200 bg-white">
                  <span className="text-[11px] font-medium text-zinc-500 block truncate">
                    Current Price
                  </span>
                  <div className="mt-1.5">
                    {data.currentPrice !== null && data.currentPrice !== undefined ? (
                      <div className="flex items-baseline gap-1">
                        <span className="font-mono text-xl font-bold text-zinc-900 tabular-nums">
                          {data.currentPrice.toFixed(2)}
                        </span>
                        <span className="text-[10px] font-semibold text-zinc-500">
                          {data.currency || company.currency}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-zinc-400 italic">Unavailable</span>
                    )}
                  </div>
                </div>

                {/* 2. Current PER */}
                <div className="p-4 rounded-xl border border-zinc-200 bg-white">
                  <span className="text-[11px] font-medium text-zinc-500 block truncate">
                    Current PER
                  </span>
                  <div className="mt-1.5">
                    {metrics.currentPer !== null && metrics.currentPer !== undefined ? (
                      <span className="font-mono text-xl font-bold text-zinc-900 tabular-nums">
                        {metrics.currentPer.toFixed(2)}x
                      </span>
                    ) : (
                      <span className="text-xs text-zinc-400 italic">Unavailable</span>
                    )}
                  </div>
                </div>

                {/* 3. 5-Year Avg PER */}
                <div className="p-4 rounded-xl border border-zinc-200 bg-white">
                  <span className="text-[11px] font-medium text-zinc-500 block truncate">
                    5-Year Avg PER
                  </span>
                  <div className="mt-1.5">
                    {metrics.fiveYearAveragePer !== null &&
                    metrics.fiveYearAveragePer !== undefined ? (
                      <span className="font-mono text-xl font-bold text-zinc-900 tabular-nums">
                        {metrics.fiveYearAveragePer.toFixed(2)}x
                      </span>
                    ) : (
                      <span className="text-xs text-zinc-400 italic">Unavailable</span>
                    )}
                  </div>
                </div>

                {/* 4. Current EPS */}
                <div className="p-4 rounded-xl border border-zinc-200 bg-white">
                  <span className="text-[11px] font-medium text-zinc-500 block truncate">
                    Current EPS
                  </span>
                  <div className="mt-1.5">
                    {metrics.currentEps !== null && metrics.currentEps !== undefined ? (
                      <div className="flex items-baseline gap-1">
                        <span className="font-mono text-xl font-bold text-zinc-900 tabular-nums">
                          {metrics.currentEps.toFixed(2)}
                        </span>
                        <span className="text-[10px] font-semibold text-zinc-500">
                          {data.currency || company.currency}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-zinc-400 italic">Unavailable</span>
                    )}
                  </div>
                </div>

                {/* 5. ROE */}
                <div className="p-4 rounded-xl border border-zinc-200 bg-white">
                  <span className="text-[11px] font-medium text-zinc-500 block truncate">
                    ROE
                  </span>
                  <div className="mt-1.5">
                    {metrics.roe !== null && metrics.roe !== undefined ? (
                      <span className="font-mono text-xl font-bold text-zinc-900 tabular-nums">
                        {metrics.roe.toFixed(2)}%
                      </span>
                    ) : (
                      <span className="text-xs text-zinc-400 italic">Unavailable</span>
                    )}
                  </div>
                </div>

                {/* 6. Dividend Yield */}
                <div className="p-4 rounded-xl border border-zinc-200 bg-white">
                  <span className="text-[11px] font-medium text-zinc-500 block truncate">
                    Dividend Yield
                  </span>
                  <div className="mt-1.5">
                    {metrics.dividendYield !== null &&
                    metrics.dividendYield !== undefined ? (
                      <span className="font-mono text-xl font-bold text-zinc-900 tabular-nums">
                        {metrics.dividendYield.toFixed(2)}%
                      </span>
                    ) : (
                      <span className="text-xs text-zinc-400 italic">Unavailable</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* JEV AI Investment Judgment Section */}
            <div className="pt-6 border-t border-zinc-100">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                    JEV AI Investment Judgment
                  </h2>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Evaluation based on company fundamentals, valuation, technicals, and five-year ratios.
                  </p>
                </div>
              </div>

              {/* Decision & Confidence Strip */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Decision */}
                <div className="p-5 border border-zinc-200 rounded-xl bg-white flex flex-col justify-between">
                  <span className="text-xs font-medium text-zinc-500 block">
                    Investment Decision
                  </span>
                  <div className="mt-2">
                    <span
                      className={`inline-block text-2xl font-mono font-bold px-3.5 py-1 rounded-md border ${
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
                  <span className="text-[11px] text-zinc-500 mt-2 block">
                    Model: jev-latest
                  </span>
                </div>

                {/* Confidence */}
                <div className="p-5 border border-zinc-200 rounded-xl bg-white flex flex-col justify-between">
                  <span className="text-xs font-medium text-zinc-500 block">
                    Confidence
                  </span>
                  <div className="mt-2">
                    <span className="font-mono text-3xl font-bold text-zinc-900 tabular-nums">
                      {data.jevConfidence !== null && data.jevConfidence !== undefined
                        ? `${data.jevConfidence}%`
                        : "—"}
                    </span>
                  </div>
                  <span className="text-[11px] text-zinc-500 mt-2 block">
                    Judgment confidence level
                  </span>
                </div>

                {/* Probabilities */}
                <div className="p-5 border border-zinc-200 rounded-xl bg-white flex flex-col justify-between">
                  <span className="text-xs font-medium text-zinc-500 block">
                    Decision Probabilities
                  </span>
                  <div className="mt-2 flex items-center justify-between text-xs font-mono">
                    <div>
                      <span className="text-zinc-500 block text-[10px]">BUY</span>
                      <span className="font-bold text-zinc-900 text-base tabular-nums">
                        {data.probabilities?.BUY ?? 0}%
                      </span>
                    </div>
                    <span className="text-zinc-300" aria-hidden="true">
                      |
                    </span>
                    <div>
                      <span className="text-zinc-500 block text-[10px]">HOLD</span>
                      <span className="font-bold text-zinc-900 text-base tabular-nums">
                        {data.probabilities?.HOLD ?? 0}%
                      </span>
                    </div>
                    <span className="text-zinc-300" aria-hidden="true">
                      |
                    </span>
                    <div>
                      <span className="text-zinc-500 block text-[10px]">SELL</span>
                      <span className="font-bold text-zinc-900 text-base tabular-nums">
                        {data.probabilities?.SELL ?? 0}%
                      </span>
                    </div>
                  </div>
                  <span className="text-[11px] text-zinc-500 mt-2 block">
                    Probability distribution
                  </span>
                </div>
              </div>

              {/* JEV Analysis Scores (from JEV quickstart score questions) */}
              {data.scores && (
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* Fundamental Quality */}
                  <div className="p-4 border border-zinc-200 rounded-xl bg-white space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-medium text-zinc-500">
                        Fundamental Quality
                      </span>
                      {data.scores.fundamentalQuality?.score !== null &&
                        data.scores.fundamentalQuality?.score !== undefined && (
                          <span className="font-mono text-xs font-bold text-zinc-900 px-1.5 py-0.5 rounded bg-zinc-100 border border-zinc-200">
                            {data.scores.fundamentalQuality.score}/5
                          </span>
                        )}
                    </div>
                    <p className="text-xs text-zinc-700 leading-snug">
                      {data.scores.fundamentalQuality?.label ||
                        "Assessment based on balance sheet, income, and cash flow."}
                    </p>
                  </div>

                  {/* Valuation Attractiveness */}
                  <div className="p-4 border border-zinc-200 rounded-xl bg-white space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-medium text-zinc-500">
                        Valuation Attractiveness
                      </span>
                      {data.scores.valuationAttractiveness?.score !== null &&
                        data.scores.valuationAttractiveness?.score !== undefined && (
                          <span className="font-mono text-xs font-bold text-zinc-900 px-1.5 py-0.5 rounded bg-zinc-100 border border-zinc-200">
                            {data.scores.valuationAttractiveness.score}/5
                          </span>
                        )}
                    </div>
                    <p className="text-xs text-zinc-700 leading-snug">
                      {data.scores.valuationAttractiveness?.label ||
                        "Assessment based on current and 5-year PER, EPS, and yield."}
                    </p>
                  </div>

                  {/* Technical Attractiveness */}
                  <div className="p-4 border border-zinc-200 rounded-xl bg-white space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-medium text-zinc-500">
                        Technical Structure
                      </span>
                      {data.scores.technicalAttractiveness?.score !== null &&
                        data.scores.technicalAttractiveness?.score !== undefined && (
                          <span className="font-mono text-xs font-bold text-zinc-900 px-1.5 py-0.5 rounded bg-zinc-100 border border-zinc-200">
                            {data.scores.technicalAttractiveness.score}/5
                          </span>
                        )}
                    </div>
                    <p className="text-xs text-zinc-700 leading-snug">
                      {data.scores.technicalAttractiveness?.label ||
                        "Assessment based on trend, support, resistance, and momentum."}
                    </p>
                  </div>

                  {/* Entry Attractiveness */}
                  <div className="p-4 border border-zinc-200 rounded-xl bg-white space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-medium text-zinc-500">
                        Entry Attractiveness
                      </span>
                      {data.scores.entryAttractiveness?.score !== null &&
                        data.scores.entryAttractiveness?.score !== undefined && (
                          <span className="font-mono text-xs font-bold text-zinc-900 px-1.5 py-0.5 rounded bg-zinc-100 border border-zinc-200">
                            {data.scores.entryAttractiveness.score}/5
                          </span>
                        )}
                    </div>
                    <p className="text-xs text-zinc-700 leading-snug">
                      {data.scores.entryAttractiveness?.label ||
                        "Assessment of position opening risk-reward at current levels."}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Collapsible Section: Data used for analysis (JEV AI Quickstart JSON Input) */}
        {data?.dataUsedForAnalysis && (
          <div className="pt-6 border-t border-zinc-200">
            <button
              type="button"
              onClick={() => setIsDataOpen(!isDataOpen)}
              className="w-full flex items-center justify-between text-left p-3 rounded-xl hover:bg-zinc-50 transition-colors cursor-pointer group"
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
                <span className="text-[11px] text-zinc-500 font-mono">
                  (JEV AI Quickstart JSON Input)
                </span>
              </div>
              <span className="text-[11px] text-zinc-500 group-hover:text-zinc-700 font-medium">
                {isDataOpen ? "Hide" : "Inspect JSON"}
              </span>
            </button>

            {isDataOpen && (
              <div className="mt-3 p-4 bg-zinc-50 border border-zinc-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-zinc-500 font-mono">
                    Format: Typesafe AI SystemOne Quickstart specification (model, state, questions)
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
                <pre className="text-xs font-mono text-zinc-800 overflow-x-auto max-h-96 p-3 leading-relaxed bg-white rounded-lg border border-zinc-200">
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
