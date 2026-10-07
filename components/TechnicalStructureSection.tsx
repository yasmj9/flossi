import React from "react";
import { JevTechnicalResult, TechnicalAttractiveness } from "@/lib/jev-client";
import { TechnicalStructureData } from "@/lib/technical-structure";

interface TechnicalStructureSectionProps {
  technical?: JevTechnicalResult | null;
  structure?: TechnicalStructureData | null;
  currency?: string;
}

export function TechnicalStructureSection({
  technical,
  structure,
  currency = "MAD",
}: TechnicalStructureSectionProps) {
  // If neither technical nor structure is present, do not render
  if (!technical && !structure) {
    return null;
  }

  const attractiveness: TechnicalAttractiveness =
    technical?.technicalAttractiveness || "NEUTRAL";
  const confidence = technical?.confidence ?? null;
  const keyReasons = technical?.keyReasons || [];

  // Minimalist styling for Technical Attractiveness badge
  const getAttractivenessBadge = (attr: TechnicalAttractiveness) => {
    switch (attr) {
      case "VERY_STRONG":
        return {
          label: "VERY STRONG",
          bg: "bg-emerald-50",
          text: "text-emerald-800",
          border: "border-emerald-200",
        };
      case "STRONG":
        return {
          label: "STRONG",
          bg: "bg-emerald-50",
          text: "text-emerald-700",
          border: "border-emerald-200",
        };
      case "NEUTRAL":
        return {
          label: "NEUTRAL",
          bg: "bg-amber-50",
          text: "text-amber-800",
          border: "border-amber-200",
        };
      case "WEAK":
        return {
          label: "WEAK",
          bg: "bg-rose-50",
          text: "text-rose-700",
          border: "border-rose-200",
        };
      case "VERY_WEAK":
        return {
          label: "VERY WEAK",
          bg: "bg-rose-50",
          text: "text-rose-800",
          border: "border-rose-300",
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

  const badgeStyle = getAttractivenessBadge(attractiveness);

  const trendLabel = structure?.trend || "Unavailable";
  const supportText = structure?.supportZone ? structure.supportZone.formatted : "Unavailable";
  const resistanceText = structure?.resistanceZone ? structure.resistanceZone.formatted : "Unavailable";

  const formatDistance = (val: number | null) => {
    if (val === null || val === undefined) return "Unavailable";
    const sign = val > 0 ? "+" : "";
    return `${sign}${val.toFixed(1)}%`;
  };

  return (
    <section className="bg-white border border-zinc-200 rounded-lg p-6 space-y-6">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-zinc-100 pb-4">
        <div>
          <h2 className="text-base font-semibold text-zinc-900 tracking-tight">
            Technical Structure Analysis
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Factual price zones, trend detection, and JEV technical attractiveness judgment
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
            Chartless Factual Model
          </span>
        </div>
      </div>

      {/* Main Technical Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Card 1: Trend */}
        <div className="border border-zinc-200 rounded-md p-4 bg-white flex flex-col justify-between">
          <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
            Trend
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span
              className={`text-xl font-bold tracking-tight ${
                trendLabel === "Uptrend"
                  ? "text-emerald-700"
                  : trendLabel === "Downtrend"
                  ? "text-rose-700"
                  : "text-zinc-900"
              }`}
            >
              {trendLabel}
            </span>
          </div>
          <span className="text-[11px] text-zinc-400 mt-1">
            {structure?.historicalPointsAvailable
              ? `Calculated over ${structure.historicalPointsAvailable} historical sessions`
              : "Derived from latest market quotes"}
          </span>
        </div>

        {/* Card 2: Technical Attractiveness */}
        <div className="border border-zinc-200 rounded-md p-4 bg-white flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
              Technical Attractiveness
            </span>
            <span className="text-[10px] font-mono text-zinc-400">JEV Judgment</span>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span
              className={`inline-flex items-center px-3 py-1 text-sm font-semibold rounded-md border ${badgeStyle.bg} ${badgeStyle.text} ${badgeStyle.border}`}
            >
              {badgeStyle.label}
            </span>
          </div>
          <span className="text-[11px] text-zinc-400 mt-1">
            Solely determined by JEV based on factual structure
          </span>
        </div>

        {/* Card 3: Confidence */}
        <div className="border border-zinc-200 rounded-md p-4 bg-white flex flex-col justify-between">
          <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
            Confidence
          </span>
          <div className="mt-2">
            <span className="text-2xl font-bold font-mono tracking-tight text-zinc-900">
              {confidence !== null ? `${confidence}%` : "—"}
            </span>
          </div>
          <span className="text-[11px] text-zinc-400 mt-1">
            JEV model assessment reliability
          </span>
        </div>
      </div>

      {/* Factual Support & Resistance Zones */}
      <div className="border border-zinc-200 rounded-md p-4 bg-white space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
          <h3 className="text-xs font-semibold text-zinc-900 uppercase tracking-wider">
            Factual Price Zones & Distances
          </h3>
          <span className="text-[11px] text-zinc-400 font-mono">
            Zones formatted in {currency}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
          {/* Support Zone */}
          <div className="space-y-1">
            <span className="text-xs text-zinc-500 font-medium">Support Zone</span>
            <div className="text-sm font-semibold font-mono text-zinc-900">
              {supportText}
            </div>
            <span className="text-[11px] text-zinc-400 block">
              Established price floor zone
            </span>
          </div>

          {/* Resistance Zone */}
          <div className="space-y-1">
            <span className="text-xs text-zinc-500 font-medium">Resistance Zone</span>
            <div className="text-sm font-semibold font-mono text-zinc-900">
              {resistanceText}
            </div>
            <span className="text-[11px] text-zinc-400 block">
              Established ceiling zone
            </span>
          </div>

          {/* Distance from Support */}
          <div className="space-y-1">
            <span className="text-xs text-zinc-500 font-medium">Distance from Support</span>
            <div className="text-sm font-semibold font-mono text-zinc-900">
              {formatDistance(structure?.distanceFromSupportPct ?? null)}
            </div>
            <span className="text-[11px] text-zinc-400 block">
              Buffer above support boundary
            </span>
          </div>

          {/* Distance from Resistance */}
          <div className="space-y-1">
            <span className="text-xs text-zinc-500 font-medium">Distance from Resistance</span>
            <div className="text-sm font-semibold font-mono text-zinc-900">
              {formatDistance(structure?.distanceFromResistancePct ?? null)}
            </div>
            <span className="text-[11px] text-zinc-400 block">
              Proximity to nearest ceiling
            </span>
          </div>
        </div>

        {/* Secondary Technical Indicators */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-zinc-100">
          <div>
            <span className="text-xs text-zinc-500">Breakout / Structure Status</span>
            <div className="text-xs font-semibold text-zinc-800 mt-0.5">
              {structure?.breakoutStatus || "Within Range"}
            </div>
          </div>
          <div>
            <span className="text-xs text-zinc-500">Volume Context</span>
            <div className="text-xs font-semibold text-zinc-800 mt-0.5">
              {structure?.volumeContext || "Unavailable"}
            </div>
          </div>
          <div>
            <span className="text-xs text-zinc-500">Recent Volatility</span>
            <div className="text-xs font-semibold text-zinc-800 mt-0.5">
              {structure?.recentVolatility || "Unavailable"}
            </div>
          </div>
        </div>
      </div>

      {/* Why? Reasons Section */}
      {keyReasons.length > 0 && (
        <div className="border border-zinc-200 rounded-md p-4 bg-white space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-zinc-900 uppercase tracking-wider">
              Why?
            </h3>
            <span className="text-[11px] text-zinc-400">JEV key technical observations</span>
          </div>
          <ul className="space-y-2 pt-1">
            {keyReasons.map((reason, idx) => (
              <li
                key={idx}
                className="text-xs text-zinc-700 flex items-start gap-2.5 leading-relaxed"
              >
                <span className="text-zinc-400 font-mono mt-0.5">•</span>
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
