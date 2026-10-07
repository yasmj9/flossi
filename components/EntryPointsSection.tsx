import React from "react";
import { Sparkles, Target } from "lucide-react";
import { JevEntryOpportunity, EntryAttractiveness } from "@/lib/jev-client";

interface EntryPointsSectionProps {
  entries?: JevEntryOpportunity[] | null;
  currency?: string;
}

export function EntryPointsSection({
  entries,
  currency = "MAD",
}: EntryPointsSectionProps) {
  const items = Array.isArray(entries) ? entries : [];
  const hasEntries = items.length > 0;

  // Minimalist styling for Attractiveness badge
  const getAttractivenessBadge = (attr: EntryAttractiveness) => {
    switch (attr) {
      case "VERY_HIGH":
        return {
          label: "VERY HIGH",
          bg: "bg-emerald-50",
          text: "text-emerald-800",
          border: "border-emerald-200",
        };
      case "HIGH":
        return {
          label: "HIGH",
          bg: "bg-emerald-50",
          text: "text-emerald-700",
          border: "border-emerald-200",
        };
      case "MEDIUM":
        return {
          label: "MEDIUM",
          bg: "bg-amber-50",
          text: "text-amber-800",
          border: "border-amber-200",
        };
      case "LOW":
        return {
          label: "LOW",
          bg: "bg-zinc-100",
          text: "text-zinc-700",
          border: "border-zinc-200",
        };
      default:
        return {
          label: attr,
          bg: "bg-zinc-50",
          text: "text-zinc-700",
          border: "border-zinc-200",
        };
    }
  };

  return (
    <section className="bg-white border border-zinc-200 rounded-lg p-6 space-y-6">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-zinc-100 pb-4">
        <div>
          <h2 className="text-base font-semibold text-zinc-900 tracking-tight flex items-center gap-2">
            <span>Entry Opportunities</span>
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Credible candidate price zones evaluated and ranked strictly by JEV AI
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
            Up to 3 Factual Zones
          </span>
        </div>
      </div>

      {!hasEntries ? (
        <div className="py-8 text-center space-y-2 border border-dashed border-zinc-200 rounded-md bg-zinc-50/50">
          <Target className="w-6 h-6 text-zinc-300 mx-auto" />
          <p className="text-xs font-medium text-zinc-600">
            No candidate entry zones available.
          </p>
          <p className="text-[11px] text-zinc-400 max-w-sm mx-auto">
            Insufficient technical support or historical structure available to identify credible entry points for this stock.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((entry, idx) => {
            const isTopEntry = entry.rank === 1 || idx === 0;
            const badgeStyle = getAttractivenessBadge(entry.attractiveness);
            const zoneText =
              entry.zoneFormatted ||
              (entry.from && entry.to ? `${entry.from}–${entry.to} ${currency}` : "Unavailable");

            return (
              <div
                key={entry.id || idx}
                className={`rounded-lg p-5 flex flex-col justify-between space-y-4 transition-all ${
                  isTopEntry
                    ? "border-2 border-zinc-900 bg-white shadow-xs"
                    : "border border-zinc-200 bg-white"
                }`}
              >
                {/* Entry Card Header */}
                <div className="flex items-center justify-between gap-2 border-b border-zinc-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-bold uppercase tracking-wider ${
                        isTopEntry ? "text-zinc-900" : "text-zinc-600"
                      }`}
                    >
                      Entry #{entry.rank}
                    </span>
                    {isTopEntry && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold bg-zinc-900 text-white rounded">
                        <Sparkles className="w-2.5 h-2.5" />
                        Top Rank
                      </span>
                    )}
                  </div>
                  <span className="text-sm font-bold font-mono text-zinc-900">
                    {zoneText}
                  </span>
                </div>

                {/* Attractiveness & Confidence Metrics */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider block">
                      Attractiveness
                    </span>
                    <div className="mt-1.5">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 text-xs font-semibold rounded border ${badgeStyle.bg} ${badgeStyle.text} ${badgeStyle.border}`}
                      >
                        {badgeStyle.label}
                      </span>
                    </div>
                  </div>

                  <div>
                    <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider block">
                      Confidence
                    </span>
                    <div className="mt-1">
                      <span className="text-xl font-bold font-mono tracking-tight text-zinc-900">
                        {entry.confidence !== null ? `${entry.confidence}%` : "—"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Reason Section */}
                <div className="pt-2 border-t border-zinc-100 space-y-1">
                  <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider block">
                    Reason
                  </span>
                  <p className="text-xs text-zinc-700 leading-relaxed font-normal">
                    {entry.reason}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
