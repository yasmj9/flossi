"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Upload,
  FileText,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Building2,
  Sparkles,
} from "lucide-react";

interface ImportPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTicker?: string;
  onSuccess?: (ticker: string) => void;
}

export function ImportPdfModal({
  isOpen,
  onClose,
  defaultTicker,
  onSuccess,
}: ImportPdfModalProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importedInfo, setImportedInfo] = useState<{
    ticker: string;
    companyName: string;
    coursMAD: number | null;
    variationPct: number | null;
    dateDonnees: string;
  } | null>(null);

  if (!isOpen) return null;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      await uploadFile(files[0]);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await uploadFile(files[0]);
    }
  };

  const uploadFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setError("Please select a PDF file (e.g. Fiche instrument _ Bourse de Casablanca.pdf).");
      return;
    }

    setIsLoading(true);
    setError(null);
    setImportedInfo(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/pdf/import", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to process the uploaded PDF.");
      }

      setImportedInfo({
        ticker: json.ticker,
        companyName: json.companyName,
        coursMAD: json.coursMAD,
        variationPct: json.variationPct,
        dateDonnees: json.dateDonnees,
      });

      if (onSuccess) {
        onSuccess(json.ticker);
      }
    } catch (err: unknown) {
      setError((err as Error).message || "An unexpected error occurred while parsing the PDF.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadSample = async () => {
    setIsLoading(true);
    setError(null);
    setImportedInfo(null);

    try {
      const res = await fetch("/api/pdf/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sample: defaultTicker || "ATW" }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to load sample Fiche.");
      }

      setImportedInfo({
        ticker: json.ticker,
        companyName: json.companyName,
        coursMAD: json.coursMAD,
        variationPct: json.variationPct ?? -0.45,
        dateDonnees: json.data?.dateDonnees || "08/10/2026",
      });

      if (onSuccess) {
        onSuccess(json.ticker);
      }
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to load sample Fiche.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoToAnalysis = () => {
    if (importedInfo) {
      onClose();
      router.push(`/companies/${encodeURIComponent(importedInfo.ticker)}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl border border-zinc-200 overflow-hidden z-10 flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 bg-zinc-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-zinc-900 text-white">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-900">
                Import Fiche Instrument (PDF)
              </h3>
              <p className="text-xs text-zinc-500">
                Bourse de Casablanca Official Format
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {importedInfo ? (
            /* Success Card */
            <div className="p-5 rounded-xl border border-emerald-200 bg-emerald-50/50 space-y-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                      PDF Imported & Extracted
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded border border-emerald-200">
                      {importedInfo.dateDonnees}
                    </span>
                  </div>
                  <h4 className="text-base font-bold text-zinc-900 mt-1">
                    {importedInfo.companyName} ({importedInfo.ticker})
                  </h4>
                  {importedInfo.coursMAD !== null && (
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-lg font-mono font-bold text-zinc-900">
                        {importedInfo.coursMAD.toFixed(2)} MAD
                      </span>
                      {importedInfo.variationPct !== null && (
                        <span
                          className={`text-xs font-mono font-semibold ${
                            importedInfo.variationPct >= 0
                              ? "text-emerald-600"
                              : "text-rose-600"
                          }`}
                        >
                          {importedInfo.variationPct >= 0 ? "+" : ""}
                          {importedInfo.variationPct.toFixed(2)}%
                        </span>
                      )}
                    </div>
                  )}
                  <p className="text-xs text-zinc-600 mt-2">
                    Extracted share capital, balance sheet, CPC, dividend records, shareholders, and executives.
                  </p>
                </div>
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleGoToAnalysis}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-zinc-900 text-white text-xs font-semibold hover:bg-zinc-800 transition-colors shadow-xs"
                >
                  <Building2 className="w-4 h-4" />
                  Open Stock Overview & Analysis
                </button>
              </div>
            </div>
          ) : (
            /* Upload Zone */
            <>
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                  isDragging
                    ? "border-zinc-900 bg-zinc-50"
                    : "border-zinc-200 hover:border-zinc-300 bg-white"
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".pdf"
                  className="hidden"
                />

                {isLoading ? (
                  <div className="py-4 flex flex-col items-center justify-center space-y-2">
                    <Loader2 className="w-8 h-8 text-zinc-900 animate-spin" />
                    <p className="text-xs font-medium text-zinc-900">
                      Reading & parsing Casablanca Stock Exchange PDF...
                    </p>
                    <p className="text-[11px] text-zinc-500">
                      Extracting stock price, financials, ratios, and leadership registry
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center space-y-3">
                    <div className="p-3 rounded-full bg-zinc-100 text-zinc-700">
                      <Upload className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-zinc-900">
                        Click to select or drag & drop PDF
                      </p>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        Fiche instrument _ Bourse de Casablanca (.pdf)
                      </p>
                    </div>
                    <span className="inline-block px-2.5 py-1 text-[11px] font-medium text-zinc-600 bg-zinc-100 rounded-md">
                      Auto-detects company, ticker, financials, & dividends
                    </span>
                  </div>
                )}
              </div>

              {error && (
                <div className="p-3 rounded-lg border border-rose-200 bg-rose-50/70 text-rose-800 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <p>{error}</p>
                </div>
              )}

              {/* Quick sample option */}
              <div className="pt-2 border-t border-zinc-100 flex items-center justify-between">
                <span className="text-xs text-zinc-500">
                  Want to test the format immediately?
                </span>
                <button
                  type="button"
                  onClick={handleLoadSample}
                  disabled={isLoading}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 text-xs font-medium text-zinc-700 hover:bg-zinc-50 transition-colors disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5 text-zinc-500" />
                  Load Sample Fiche (ATW)
                </button>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-zinc-100 bg-zinc-50/50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-zinc-200 text-xs font-medium text-zinc-700 hover:bg-zinc-100 transition-colors"
          >
            {importedInfo ? "Done" : "Cancel"}
          </button>
        </div>
      </div>
    </div>
  );
}
