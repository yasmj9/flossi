import { JevValuationResult, ValuationStatus } from "@/lib/jev-client";

export interface ValuationMetrics {
  currentPer: number | null;
  fiveYearAveragePer: number | null;
  currentEps: number | null;
  roe: number | null;
  dividendYield: number | null;
  currency?: string;
}

interface ValuationAnalysisSectionProps {
  valuation?: JevValuationResult | null;
  metrics?: ValuationMetrics | null;
  currency?: string;
}

export function ValuationAnalysisSection({
  valuation,
  metrics,
  currency = "MAD",
}: ValuationAnalysisSectionProps) {
  if (!valuation && !metrics) return null;

  const status: ValuationStatus = valuation?.valuation || "FAIRLY_VALUED";
  const isUndervalued = status === "UNDERVALUED";
  const isOvervalued = status === "OVERVALUED";

  // Label text matching user specification
  const statusLabel = isUndervalued
    ? "UNDERVALUED"
    : isOvervalued
    ? "OVERVALUED"
    : "FAIRLY VALUED";

  // Color tokens strictly based on user rules:
  // green for undervalued, amber for fairly valued, red for overvalued
  const badgeStyle = isUndervalued
    ? "bg-emerald-50 text-emerald-800 border-emerald-300"
    : isOvervalued
    ? "bg-rose-50 text-rose-800 border-rose-300"
    : "bg-amber-50 text-amber-800 border-amber-300";

  const listBorder = isUndervalued
    ? "border-emerald-500/40"
    : isOvervalued
    ? "border-rose-500/40"
    : "border-amber-500/40";

  const dotColor = isUndervalued
    ? "bg-emerald-500"
    : isOvervalued
    ? "bg-rose-500"
    : "bg-amber-500";

  const formatMultiple = (val: number | null | undefined) => {
    if (val === null || val === undefined) return "Unavailable";
    return `${val.toFixed(2)}x`;
  };

  const formatCurrency = (val: number | null | undefined) => {
    if (val === null || val === undefined) return "Unavailable";
    return `${val.toFixed(2)} ${currency}`;
  };

  const formatPercent = (val: number | null | undefined) => {
    if (val === null || val === undefined) return "Unavailable";
    return `${val.toFixed(2)}%`;
  };

  const keyReasons: string[] = valuation?.keyReasons || [];

  return (
    <div className="pt-6 border-t border-zinc-100">
      {/* Section Header */}
      <div className="mb-4">
        <h2 className="text-sm font-bold text-zinc-900 tracking-tight">
          Valuation Analysis
        </h2>
        <p className="text-xs text-zinc-500 mt-0.5">
          Factual multiple evaluation and attractiveness judgment by JEV AI
        </p>
      </div>

      <div className="border border-zinc-200 rounded-xl p-5 sm:p-6 bg-white space-y-6">
        {/* Valuation & Confidence Top Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-6 border-b border-zinc-100">
          {/* Valuation Judgment */}
          <div>
            <span className="text-xs font-medium text-zinc-500 block">Valuation</span>
            <div className="mt-2">
              <span
                className={`inline-block text-xl sm:text-2xl font-bold font-mono tracking-tight px-3 py-1 rounded-md border ${badgeStyle}`}
              >
                {statusLabel}
              </span>
            </div>
            <span className="text-[11px] text-zinc-500 mt-2 block">
              Judgment by JEV AI
            </span>
          </div>

          {/* JEV Confidence */}
          <div>
            <span className="text-xs font-medium text-zinc-500 block">Confidence</span>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="font-mono text-2xl sm:text-3xl font-bold text-zinc-900 tabular-nums">
                {valuation?.confidence !== null && valuation?.confidence !== undefined
                  ? `${valuation.confidence}%`
                  : "—"}
              </span>
            </div>
            <span className="text-[11px] text-zinc-500 mt-1 block">
              Valuation confidence score
            </span>
          </div>
        </div>

        {/* Important Valuation Metrics Grid */}
        <div>
          <span className="text-xs font-semibold text-zinc-700 block mb-3">
            Valuation Metrics
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {/* Current PER */}
            <div className="p-3 border border-zinc-200 rounded-lg bg-zinc-50/50">
              <span className="text-[11px] font-medium text-zinc-500 block truncate">
                Current PER
              </span>
              <span className="mt-1 font-mono text-sm font-bold text-zinc-900 block tabular-nums">
                {formatMultiple(metrics?.currentPer)}
              </span>
            </div>

            {/* 5-Year Average PER */}
            <div className="p-3 border border-zinc-200 rounded-lg bg-zinc-50/50">
              <span className="text-[11px] font-medium text-zinc-500 block truncate">
                5-Year Avg PER
              </span>
              <span className="mt-1 font-mono text-sm font-bold text-zinc-900 block tabular-nums">
                {formatMultiple(metrics?.fiveYearAveragePer)}
              </span>
            </div>

            {/* Current EPS */}
            <div className="p-3 border border-zinc-200 rounded-lg bg-zinc-50/50">
              <span className="text-[11px] font-medium text-zinc-500 block truncate">
                Current EPS
              </span>
              <span className="mt-1 font-mono text-sm font-bold text-zinc-900 block tabular-nums">
                {formatCurrency(metrics?.currentEps)}
              </span>
            </div>

            {/* ROE */}
            <div className="p-3 border border-zinc-200 rounded-lg bg-zinc-50/50">
              <span className="text-[11px] font-medium text-zinc-500 block truncate">
                ROE
              </span>
              <span className="mt-1 font-mono text-sm font-bold text-zinc-900 block tabular-nums">
                {formatPercent(metrics?.roe)}
              </span>
            </div>

            {/* Dividend Yield */}
            <div className="p-3 border border-zinc-200 rounded-lg bg-zinc-50/50 col-span-2 sm:col-span-1">
              <span className="text-[11px] font-medium text-zinc-500 block truncate">
                Dividend Yield
              </span>
              <span className="mt-1 font-mono text-sm font-bold text-zinc-900 block tabular-nums">
                {formatPercent(metrics?.dividendYield)}
              </span>
            </div>
          </div>
        </div>

        {/* "Why?" Section with short key reasons */}
        {keyReasons.length > 0 && (
          <div className="pt-4 border-t border-zinc-100">
            <div className="flex items-center gap-2 mb-2.5">
              <span className={`w-1.5 h-1.5 rounded-full ${dotColor} shrink-0`} aria-hidden="true" />
              <h3 className="text-xs font-bold text-zinc-900 tracking-tight">
                Why?
              </h3>
            </div>
            <ul className={`space-y-1.5 pl-3.5 border-l-2 ${listBorder}`}>
              {keyReasons.map((reason, idx) => (
                <li key={idx} className="text-xs text-zinc-700 leading-relaxed">
                  {reason}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
