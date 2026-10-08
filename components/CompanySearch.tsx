"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  FileUp,
  FileText,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  UploadCloud,
} from "lucide-react";

export function CompanySearch() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{
    ticker: string;
    companyName: string;
    coursMAD: number | null;
    variationPct: number | null;
    dateDonnees: string;
  } | null>(null);

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
      setError("Please upload a PDF file (e.g. Fiche instrument _ Bourse de Casablanca.pdf).");
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccessInfo(null);

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

      setSuccessInfo({
        ticker: json.ticker,
        companyName: json.companyName,
        coursMAD: json.coursMAD,
        variationPct: json.variationPct,
        dateDonnees: json.dateDonnees,
      });

      // Navigate to the company overview page after short feedback
      setTimeout(() => {
        router.push(`/companies/${encodeURIComponent(json.ticker)}`);
      }, 700);
    } catch (err: unknown) {
      setError((err as Error).message || "An error occurred while uploading the file.");
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleQuickLoadSample = async () => {
    setIsLoading(true);
    setError(null);
    setSuccessInfo(null);

    try {
      const res = await fetch("/api/pdf/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sample: "ATW" }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to load sample Fiche.");
      }

      setSuccessInfo({
        ticker: json.ticker,
        companyName: json.companyName,
        coursMAD: json.coursMAD,
        variationPct: json.variationPct,
        dateDonnees: json.dateDonnees,
      });

      setTimeout(() => {
        router.push(`/companies/${encodeURIComponent(json.ticker)}`);
      }, 700);
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to load sample.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto py-12 px-4 sm:px-6">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-100 text-zinc-700 text-xs font-medium mb-3">
          <FileText className="w-3.5 h-3.5" />
          <span>Casablanca Stock Exchange</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900">
          Import Casablanca Stock Exchange PDF
        </h1>
        <p className="text-sm text-zinc-600 mt-2 max-w-xl mx-auto leading-relaxed">
          Upload your official &ldquo;Fiche instrument&rdquo; or &ldquo;Fiche Émetteur&rdquo; (.pdf) to extract stock data, financial reports, indicators, and generate JEV AI investment judgments.
        </p>
      </div>

      {/* Upload Dropzone Container */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-6 sm:p-10 shadow-xs">
        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,.pdf"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Drag and Drop Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !isLoading && fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 sm:p-12 text-center transition-all cursor-pointer ${
            isDragging
              ? "border-zinc-900 bg-zinc-50"
              : "border-zinc-300 hover:border-zinc-400 hover:bg-zinc-50/50 bg-white"
          } ${isLoading ? "pointer-events-none opacity-60" : ""}`}
        >
          <div className="w-14 h-14 rounded-2xl bg-zinc-100 text-zinc-800 mx-auto flex items-center justify-center mb-4 transition-transform group-hover:scale-105">
            {isLoading ? (
              <Loader2 className="w-7 h-7 animate-spin text-zinc-900" />
            ) : (
              <UploadCloud className="w-7 h-7 text-zinc-800" />
            )}
          </div>

          <h2 className="text-base font-semibold text-zinc-900">
            {isLoading ? "Analyzing PDF..." : "Drop your PDF file here, or click to browse"}
          </h2>
          <p className="text-xs text-zinc-500 mt-1 max-w-md mx-auto">
            Supports official Bourse de Casablanca Fiche Instrument (.pdf) documents
          </p>

          <div className="mt-6 flex items-center justify-center">
            <button
              type="button"
              disabled={isLoading}
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-zinc-900 text-white rounded-xl text-xs font-semibold hover:bg-zinc-800 transition-colors shadow-xs cursor-pointer disabled:cursor-not-allowed"
            >
              <FileUp className="w-4 h-4" />
              <span>Select PDF File</span>
            </button>
          </div>
        </div>

        {/* Quick Sample Button */}
        <div className="mt-6 pt-6 border-t border-zinc-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-600">
          <span className="text-zinc-500">
            Or test with preloaded Casablanca Stock Exchange data:
          </span>
          <button
            type="button"
            onClick={handleQuickLoadSample}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 font-medium transition-colors cursor-pointer disabled:opacity-50"
            title="Load Attijariwafa Bank official Fiche sample"
          >
            <Sparkles className="w-3.5 h-3.5 text-zinc-500" />
            <span>Load Sample (Attijariwafa Bank - ATW)</span>
          </button>
        </div>

        {/* Error Feedback */}
        {error && (
          <div className="mt-6 p-4 rounded-xl border border-red-200 bg-red-50 text-red-900 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium leading-relaxed">{error}</div>
          </div>
        )}

        {/* Success Feedback */}
        {successInfo && (
          <div className="mt-6 p-4 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-950 text-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <strong className="font-semibold block text-emerald-900">
                  {successInfo.companyName} ({successInfo.ticker}) parsed successfully
                </strong>
                <span className="text-emerald-700 text-[11px]">
                  Price: {successInfo.coursMAD?.toFixed(2)} MAD · Redirecting to analysis...
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => router.push(`/companies/${encodeURIComponent(successInfo.ticker)}`)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-900 text-white font-medium hover:bg-emerald-800 transition-colors shrink-0"
            >
              <span>View</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
