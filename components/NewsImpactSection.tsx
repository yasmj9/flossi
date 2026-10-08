import React from "react";
import { ExternalLink, Newspaper } from "lucide-react";
import { JevNewsImpactResult, NewsImpact } from "@/lib/jev-client";
import { CompanyNewsItem } from "@/lib/parsebot-client";

interface NewsImpactSectionProps {
  newsImpact?: JevNewsImpactResult | null;
  news?: CompanyNewsItem[] | null;
}

export function NewsImpactSection({
  newsImpact,
  news,
}: NewsImpactSectionProps) {
  const items = Array.isArray(news) ? news : [];
  const displayItems = items.slice(0, 5);
  const hasNews = displayItems.length > 0;

  const impact: NewsImpact = newsImpact?.newsImpact || (hasNews ? "NEUTRAL" : "NEUTRAL");
  const confidence = newsImpact?.confidence ?? null;
  const keyReasons = newsImpact?.keyReasons || [];

  // Minimalist styling for News Impact badge
  const getImpactBadge = (val: NewsImpact) => {
    switch (val) {
      case "VERY_POSITIVE":
        return {
          label: "VERY POSITIVE",
          bg: "bg-emerald-50",
          text: "text-emerald-800",
          border: "border-emerald-200",
        };
      case "POSITIVE":
        return {
          label: "POSITIVE",
          bg: "bg-emerald-50",
          text: "text-emerald-700",
          border: "border-emerald-200",
        };
      case "NEUTRAL":
        return {
          label: "NEUTRAL",
          bg: "bg-zinc-50",
          text: "text-zinc-700",
          border: "border-zinc-200",
        };
      case "NEGATIVE":
        return {
          label: "NEGATIVE",
          bg: "bg-rose-50",
          text: "text-rose-700",
          border: "border-rose-200",
        };
      case "VERY_NEGATIVE":
        return {
          label: "VERY NEGATIVE",
          bg: "bg-rose-50",
          text: "text-rose-800",
          border: "border-rose-300",
        };
      default:
        return {
          label: val,
          bg: "bg-zinc-50",
          text: "text-zinc-700",
          border: "border-zinc-200",
        };
    }
  };

  const badgeStyle = getImpactBadge(impact);

  return (
    <section className="bg-white border border-zinc-200 rounded-lg p-6 space-y-6">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-zinc-100 pb-4">
        <div>
          <h2 className="text-base font-semibold text-zinc-900 tracking-tight">
            News Impact Analysis
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Recent company-related news evaluated by JEV AI for overall investment impact
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
            Contextual Evaluation
          </span>
        </div>
      </div>

      {/* Main Impact & Confidence Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Card 1: News Impact */}
        <div className="border border-zinc-200 rounded-md p-4 bg-white flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
              News Impact
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
            Contextual sentiment & catalyst assessment
          </span>
        </div>

        {/* Card 2: Confidence */}
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
            JEV confidence in news materiality
          </span>
        </div>
      </div>

      {/* Recent Relevant News Items */}
      <div className="border border-zinc-200 rounded-md p-4 bg-white space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
          <h3 className="text-xs font-semibold text-zinc-900 uppercase tracking-wider">
            Recent Relevant News ({displayItems.length})
          </h3>
          <span className="text-[11px] text-zinc-400 font-mono">
            Parse.bot API Feed
          </span>
        </div>

        {!hasNews ? (
          <div className="py-6 text-center space-y-2">
            <Newspaper className="w-6 h-6 text-zinc-300 mx-auto" />
            <p className="text-xs text-zinc-500 font-medium">
              No relevant recent news available.
            </p>
            <p className="text-[11px] text-zinc-400">
              No recent corporate press releases or company-specific articles were found in the current data feed.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-100">
            {displayItems.map((item, idx) => (
              <div
                key={idx}
                className="py-3 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-start justify-between gap-3 group"
              >
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex items-start gap-2">
                    {item.url ? (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-medium text-zinc-900 hover:text-zinc-600 hover:underline leading-snug break-words flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <span>{item.title}</span>
                        <ExternalLink className="w-3 h-3 text-zinc-400 shrink-0 inline opacity-70 group-hover:opacity-100" />
                      </a>
                    ) : (
                      <span className="text-xs font-medium text-zinc-900 leading-snug break-words">
                        {item.title}
                      </span>
                    )}
                  </div>

                  {item.snippet && (
                    <p className="text-[11px] text-zinc-600 line-clamp-2 leading-relaxed">
                      {item.snippet}
                    </p>
                  )}

                  <div className="flex items-center gap-2 pt-0.5 text-[11px] text-zinc-400 font-mono">
                    {item.source && (
                      <span className="text-zinc-600 font-medium">{item.source}</span>
                    )}
                    {item.source && item.publishedAt && <span>•</span>}
                    {item.publishedAt && <span>{item.publishedAt}</span>}
                  </div>
                </div>

                {item.url && (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 inline-flex items-center gap-1 text-[11px] font-medium text-zinc-500 hover:text-zinc-900 px-2 py-1 rounded border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 transition-colors cursor-pointer self-start sm:self-auto"
                  >
                    <span>Open source</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Why? Reasons Section */}
      {keyReasons.length > 0 && (
        <div className="border border-zinc-200 rounded-md p-4 bg-white space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-zinc-900 uppercase tracking-wider">
              Why?
            </h3>
            <span className="text-[11px] text-zinc-400">JEV news impact drivers</span>
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
