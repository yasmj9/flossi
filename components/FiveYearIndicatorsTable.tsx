"use client";

import {
  TrendingUp,
  TrendingDown,
  Minus,
  HelpCircle,
} from "lucide-react";
import { FiveYearIndicators, IndicatorTrend } from "@/lib/indicators";

interface FiveYearIndicatorsTableProps {
  indicators?: FiveYearIndicators | null;
  currency?: string;
}

export function FiveYearIndicatorsTable({
  indicators,
  currency = "MAD",
}: FiveYearIndicatorsTableProps) {
  if (!indicators || indicators.years.length === 0) {
    return (
      <div className="pt-6 border-t border-zinc-100">
        <div className="mb-3">
          <h2 className="text-sm font-bold text-zinc-900 tracking-tight">
            Five-Year Key Indicators
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Key financial ratios used in fundamental analysis across available fiscal years.
          </p>
        </div>
        <div className="p-4 border border-zinc-200 rounded-xl bg-zinc-50/50 text-xs text-zinc-500">
          Historical multi-year financial statements are currently unavailable from Parse.bot API for this company. Missing values are not fabricated.
        </div>
      </div>
    );
  }

  const { years, summaries, totalYearsAvailable } = indicators;

  const formatValue = (
    val: number | null | undefined,
    type: "bpa" | "roe" | "payoutRatio" | "dividendYield" | "per"
  ): string => {
    if (val === null || val === undefined || isNaN(val)) {
      return "—";
    }
    if (type === "bpa") {
      return `${val.toFixed(2)} ${currency}`;
    }
    if (type === "roe" || type === "payoutRatio" || type === "dividendYield") {
      return `${val.toFixed(2)}%`;
    }
    if (type === "per") {
      return `${val.toFixed(2)}x`;
    }
    return val.toFixed(2);
  };

  const renderTrendBadge = (trend: IndicatorTrend) => {
    if (!trend) {
      return <span className="text-[11px] text-zinc-500 font-mono">Unavailable</span>;
    }

    if (trend === "increasing") {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
          <TrendingUp className="w-3.5 h-3.5" />
          Increasing
        </span>
      );
    }

    if (trend === "decreasing") {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700">
          <TrendingDown className="w-3.5 h-3.5" />
          Decreasing
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-zinc-600">
        <Minus className="w-3.5 h-3.5" />
        Stable
      </span>
    );
  };

  const summaryCards = [
    { key: "bpa" as const, title: "BPA / EPS", summary: summaries.bpa },
    { key: "roe" as const, title: "ROE", summary: summaries.roe },
    { key: "payoutRatio" as const, title: "Payout Ratio", summary: summaries.payoutRatio },
    { key: "dividendYield" as const, title: "Dividend Yield", summary: summaries.dividendYield },
    { key: "per" as const, title: "PER / P/E", summary: summaries.per },
  ];

  return (
    <div className="pt-6 border-t border-zinc-100">
      {/* Header */}
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold text-zinc-900 tracking-tight">
            Five-Year Key Indicators
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Factual historical ratios from Omkar Cloud across {totalYearsAvailable}{" "}
            {totalYearsAvailable === 1 ? "fiscal year" : "available fiscal years"}.
          </p>
        </div>
        <div className="text-[11px] text-zinc-600 flex items-center gap-1">
          <HelpCircle className="w-3 h-3 text-zinc-500" />
          <span>Factual values only · Missing data represented as —</span>
        </div>
      </div>

      {/* 5-Indicator Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-5">
        {summaryCards.map((item) => (
          <div
            key={item.key}
            className="p-3.5 border border-zinc-200 rounded-xl bg-white shadow-2xs flex flex-col justify-between"
          >
            <div>
              <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">
                {item.title}
              </span>
              <div className="mt-1.5 flex items-baseline gap-1">
                <span className="font-mono text-base font-bold text-zinc-900 tabular-nums">
                  {formatValue(item.summary.latestValue, item.key)}
                </span>
              </div>
              <span className="text-[10px] text-zinc-500 block mt-0.5">Latest value</span>
            </div>

            <div className="mt-3 pt-2.5 border-t border-zinc-100 space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-zinc-500">5Y Avg:</span>
                <span className="font-mono font-medium text-zinc-800 tabular-nums">
                  {formatValue(item.summary.fiveYearAverage, item.key)}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-zinc-500">Trend:</span>
                {renderTrendBadge(item.summary.trend)}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Year-by-Year Historical Table */}
      <div className="border border-zinc-200 rounded-xl overflow-hidden bg-white shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50/75 text-zinc-600 font-semibold text-[11px]">
                <th scope="col" className="py-2.5 px-4 font-semibold text-zinc-800">
                  Year
                </th>
                <th scope="col" className="py-2.5 px-4 text-right font-semibold text-zinc-800">
                  BPA / EPS ({currency})
                </th>
                <th scope="col" className="py-2.5 px-4 text-right font-semibold text-zinc-800">
                  ROE (%)
                </th>
                <th scope="col" className="py-2.5 px-4 text-right font-semibold text-zinc-800">
                  Payout (%)
                </th>
                <th scope="col" className="py-2.5 px-4 text-right font-semibold text-zinc-800">
                  Dividend Yield (%)
                </th>
                <th scope="col" className="py-2.5 px-4 text-right font-semibold text-zinc-800">
                  PER (x)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 font-mono tabular-nums">
              {years.map((row) => (
                <tr
                  key={row.year}
                  className="hover:bg-zinc-50/60 transition-colors"
                >
                  <td className="py-2.5 px-4 font-semibold text-zinc-900 font-sans">
                    {row.year}
                  </td>
                  <td className="py-2.5 px-4 text-right text-zinc-800">
                    {row.bpa !== null ? row.bpa.toFixed(2) : <span className="text-zinc-400 font-sans">—</span>}
                  </td>
                  <td className="py-2.5 px-4 text-right text-zinc-800">
                    {row.roe !== null ? `${row.roe.toFixed(2)}%` : <span className="text-zinc-400 font-sans">—</span>}
                  </td>
                  <td className="py-2.5 px-4 text-right text-zinc-800">
                    {row.payoutRatio !== null ? `${row.payoutRatio.toFixed(2)}%` : <span className="text-zinc-400 font-sans">—</span>}
                  </td>
                  <td className="py-2.5 px-4 text-right text-zinc-800">
                    {row.dividendYield !== null ? `${row.dividendYield.toFixed(2)}%` : <span className="text-zinc-400 font-sans">—</span>}
                  </td>
                  <td className="py-2.5 px-4 text-right text-zinc-800">
                    {row.per !== null ? `${row.per.toFixed(2)}x` : <span className="text-zinc-400 font-sans">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
