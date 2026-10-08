"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Search,
  Building2,
  ArrowRight,
  AlertCircle,
  KeyRound,
  RefreshCw,
  X,
  SlidersHorizontal,
} from "lucide-react";

export interface CompanyItem {
  ticker: string;
  name: string;
  exchange: string;
  currency: string;
  sector: string;
  isin?: string;
}

export function CompanySearch() {
  const [query, setQuery] = useState("");
  const [companies, setCompanies] = useState<CompanyItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isApiKeyConfigured, setIsApiKeyConfigured] = useState<boolean | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [selectedSector, setSelectedSector] = useState<string>("All");

  useEffect(() => {
    let ignore = false;
    async function loadCompanies() {
      setIsLoading(true);
      setApiError(null);
      try {
        const res = await fetch("/api/companies/search", { cache: "no-store" });
        const json = await res.json();
        if (ignore) return;
        if (json.success && Array.isArray(json.companies)) {
          setCompanies(json.companies);
          setIsApiKeyConfigured(json.apiKeyConfigured);
        } else {
          setApiError(json.error || "Failed to load Casablanca Stock Exchange companies.");
        }
      } catch (err: unknown) {
        if (!ignore) {
          setApiError((err as Error).message || "Network error loading company directory.");
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }
    void loadCompanies();
    return () => {
      ignore = true;
    };
  }, []);

  // Collect unique sectors for optional filter tabs
  const sectors = useMemo(() => {
    const set = new Set<string>();
    companies.forEach((c) => {
      if (c.sector) set.add(c.sector);
    });
    return ["All", ...Array.from(set).sort()];
  }, [companies]);

  // Filter companies by search query and sector
  const filteredCompanies = useMemo(() => {
    const q = query.trim().toLowerCase();
    return companies.filter((c) => {
      const matchesSector = selectedSector === "All" || c.sector === selectedSector;
      if (!matchesSector) return false;
      if (!q) return true;
      const matchTicker = c.ticker.toLowerCase().includes(q);
      const matchName = c.name.toLowerCase().includes(q);
      const matchSector = c.sector.toLowerCase().includes(q);
      return matchTicker || matchName || matchSector;
    });
  }, [companies, query, selectedSector]);

  return (
    <div className="w-full max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6 pb-6 border-b border-zinc-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              <span>Bourse de Casablanca</span>
              <span aria-hidden="true">·</span>
              <span>CSE Listed Directory</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 mt-1">
              Casablanca Stock Exchange Companies
            </h1>
            <p className="text-sm text-zinc-600 mt-1">
              Search by company name or stock symbol to view basic info and start analysis.
            </p>
          </div>

          <div className="text-xs text-zinc-500 bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 shrink-0 self-start sm:self-auto">
            <span>Listed Companies: </span>
            <strong className="font-semibold text-zinc-800">{companies.length}</strong>
          </div>
        </div>
      </div>

      {/* API Key Not Configured Alert */}
      {isApiKeyConfigured === false && (
        <div className="mb-6 p-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-900 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong className="font-semibold block">Drahmi API key is not configured</strong>
              <span>
                You can browse Casablanca Stock Exchange companies, but real-time quotes and AI analysis require a Drahmi API key.
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

      {/* API Error Alert */}
      {apiError && (
        <div className="mb-6 p-4 rounded-xl border border-red-200 bg-red-50 text-red-900 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <div className="flex-1 font-medium">{apiError}</div>
        </div>
      )}

      {/* Search Input Bar */}
      <div className="mb-6">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search company name or ticker (e.g. Attijariwafa Bank, ATW, Maroc Telecom, IAM, Akdital)..."
            className="w-full pl-10 pr-10 py-3 bg-white border border-zinc-300 rounded-xl text-sm text-zinc-900 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900 transition-all shadow-xs"
            autoFocus
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-zinc-400 hover:text-zinc-700"
              title="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Sector Filter Chips */}
        {sectors.length > 1 && (
          <div className="flex items-center gap-1.5 overflow-x-auto py-2.5 mt-1 no-scrollbar">
            <span className="text-[11px] font-medium text-zinc-600 flex items-center gap-1 mr-1 shrink-0">
              <SlidersHorizontal className="w-3 h-3" />
              Sector:
            </span>
            {sectors.slice(0, 10).map((sec) => (
              <button
                key={sec}
                type="button"
                onClick={() => setSelectedSector(sec)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  selectedSector === sec
                    ? "bg-zinc-900 text-white"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900"
                }`}
              >
                {sec}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Loading State */}
      {isLoading ? (
        <div className="py-20 text-center text-zinc-500 text-sm flex flex-col items-center gap-2">
          <RefreshCw className="w-5 h-5 animate-spin text-zinc-400" />
          Loading Casablanca Stock Exchange directory...
        </div>
      ) : filteredCompanies.length === 0 ? (
        /* No Results State */
        <div className="border border-zinc-200 rounded-xl p-12 text-center bg-white shadow-xs">
          <Building2 className="w-8 h-8 text-zinc-400 mx-auto mb-3" />
          <h2 className="text-base font-semibold text-zinc-900">No companies found</h2>
          <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
            No Casablanca Stock Exchange listed company matched &ldquo;{query}&rdquo;.
            Try searching by ticker (e.g. ATW, IAM, BCP) or company name.
          </p>
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setSelectedSector("All");
              }}
              className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-md transition-colors"
            >
              Reset search
            </button>
          )}
        </div>
      ) : (
        /* Results Grid */
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-xs text-zinc-500 px-1 pb-1">
            <span>
              Showing {filteredCompanies.length}{" "}
              {filteredCompanies.length === 1 ? "company" : "companies"}
            </span>
            <span className="hidden sm:inline">Select a company to open overview</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredCompanies.map((company) => (
              <Link
                key={company.ticker}
                href={`/companies/${company.ticker}`}
                className="group p-4 bg-white border border-zinc-200 rounded-xl hover:border-zinc-400 hover:shadow-xs transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Top row: Ticker + Sector */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-sm font-bold text-zinc-900 group-hover:text-black">
                      {company.ticker}
                    </span>
                    <span className="text-[11px] text-zinc-500 bg-zinc-50 px-2 py-0.5 rounded border border-zinc-200">
                      {company.sector}
                    </span>
                  </div>

                  {/* Company Name */}
                  <h2 className="text-sm font-semibold text-zinc-800 mt-1.5 group-hover:text-black line-clamp-1">
                    {company.name}
                  </h2>
                </div>

                {/* Bottom row: Exchange + Currency + Action */}
                <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between text-xs">
                  <div className="text-zinc-500 text-[11px] flex items-center gap-2">
                    <span>{company.exchange}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-medium text-zinc-700">{company.currency}</span>
                  </div>

                  <span className="text-zinc-400 group-hover:text-zinc-900 group-hover:translate-x-0.5 transition-all flex items-center gap-1 text-[11px] font-medium">
                    View
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
