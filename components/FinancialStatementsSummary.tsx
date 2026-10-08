"use client";

import { useState } from "react";
import {
  FinancialStatementsData,
  StatementMetric,
  formatFinancialValue,
} from "@/lib/financial-statements";
import { HelpCircle } from "lucide-react";

interface FinancialStatementsSummaryProps {
  statements?: FinancialStatementsData | null;
  currency?: string;
}

type StatementTab = "bilan" | "cpc" | "tresorerie";

export function FinancialStatementsSummary({
  statements,
  currency = "MAD",
}: FinancialStatementsSummaryProps) {
  const [activeTab, setActiveTab] = useState<StatementTab>("bilan");

  if (!statements) {
    return (
      <div className="pt-6 border-t border-zinc-100">
        <div className="mb-3">
          <h2 className="text-sm font-bold text-zinc-900 tracking-tight">
            Financial Statements Summary
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Key summary data from Bilan, CPC, and Trésorerie across compatible reporting periods.
          </p>
        </div>
        <div className="p-4 border border-zinc-200 rounded-xl bg-zinc-50/50 text-xs text-zinc-500">
          Financial statements data is currently unavailable from Parse.bot API for this company. Missing values are not fabricated.
        </div>
      </div>
    );
  }

  const { bilan, cpc, tresorerie, periodLabel, comparisonPeriodLabel } = statements;

  const renderChangeBadge = (metric: StatementMetric) => {
    if (metric.changePercent === null || isNaN(metric.changePercent)) {
      return <span className="text-zinc-400 font-sans">—</span>;
    }

    const sign = metric.changePercent > 0 ? "+" : "";
    const formatted = `${sign}${metric.changePercent.toFixed(1)}%`;

    if (metric.sentiment === "favorable") {
      return (
        <span className="inline-flex items-center font-mono font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[11px] border border-emerald-200">
          {formatted}
        </span>
      );
    }

    if (metric.sentiment === "unfavorable") {
      return (
        <span className="inline-flex items-center font-mono font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded text-[11px] border border-rose-200">
          {formatted}
        </span>
      );
    }

    return (
      <span className="inline-flex items-center font-mono font-medium text-zinc-600 bg-zinc-50 px-2 py-0.5 rounded text-[11px] border border-zinc-200">
        {formatted}
      </span>
    );
  };

  const bilanMetrics: StatementMetric[] = [
    bilan.totalAssets,
    bilan.totalLiabilities,
    bilan.equity,
    bilan.cash,
    bilan.receivables,
    bilan.inventory,
    bilan.shortTermDebt,
    bilan.longTermDebt,
    bilan.totalDebt,
  ];

  const cpcMetrics: StatementMetric[] = [
    cpc.revenue,
    cpc.operatingIncome,
    cpc.ebitda,
    cpc.financialResult,
    cpc.profitBeforeTax,
    cpc.netIncome,
    cpc.revenueGrowth,
    cpc.operatingMargin,
    cpc.netMargin,
    cpc.netIncomeGrowth,
  ];

  const tresorerieMetrics: StatementMetric[] = [
    tresorerie.operatingCashFlow,
    tresorerie.investingCashFlow,
    tresorerie.financingCashFlow,
    tresorerie.freeCashFlow,
    tresorerie.openingCash,
    tresorerie.closingCash,
  ];

  const currentMetrics =
    activeTab === "bilan"
      ? bilanMetrics
      : activeTab === "cpc"
      ? cpcMetrics
      : tresorerieMetrics;

  return (
    <div className="pt-6 border-t border-zinc-100">
      {/* Section Header */}
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-zinc-900 tracking-tight">
            Financial Statements Summary
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Compatible period comparison: <strong className="text-zinc-700">{periodLabel}</strong> vs{" "}
            <strong className="text-zinc-700">{comparisonPeriodLabel}</strong>
          </p>
        </div>

        <div className="text-[11px] text-zinc-500 flex items-center gap-1.5 self-start sm:self-auto">
          <HelpCircle className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
          <span>Green = favorable · Red = unfavorable · Gray = neutral</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-lg border border-zinc-200 w-fit mb-4">
        <button
          type="button"
          onClick={() => setActiveTab("bilan")}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
            activeTab === "bilan"
              ? "bg-white text-zinc-900 font-semibold shadow-2xs"
              : "text-zinc-600 hover:text-zinc-900"
          }`}
        >
          Bilan
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("cpc")}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
            activeTab === "cpc"
              ? "bg-white text-zinc-900 font-semibold shadow-2xs"
              : "text-zinc-600 hover:text-zinc-900"
          }`}
        >
          CPC
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("tresorerie")}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
            activeTab === "tresorerie"
              ? "bg-white text-zinc-900 font-semibold shadow-2xs"
              : "text-zinc-600 hover:text-zinc-900"
          }`}
        >
          Trésorerie
        </button>
      </div>

      {/* Financial Statement Table */}
      <div className="border border-zinc-200 rounded-xl overflow-hidden bg-white shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50/75 text-zinc-600 font-semibold text-[11px]">
                <th scope="col" className="py-2.5 px-4 font-semibold text-zinc-800">
                  Metric
                </th>
                <th scope="col" className="py-2.5 px-4 text-right font-semibold text-zinc-800">
                  {periodLabel} (Current)
                </th>
                <th scope="col" className="py-2.5 px-4 text-right font-semibold text-zinc-800">
                  {comparisonPeriodLabel} (Previous)
                </th>
                <th scope="col" className="py-2.5 px-4 text-right font-semibold text-zinc-800">
                  Change %
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 font-mono tabular-nums">
              {currentMetrics.map((m) => (
                <tr key={m.key} className="hover:bg-zinc-50/60 transition-colors">
                  <td className="py-2.5 px-4 font-sans font-medium text-zinc-900">
                    {m.label}
                  </td>
                  <td className="py-2.5 px-4 text-right text-zinc-800">
                    {formatFinancialValue(m.currentValue, m.unit === "%" ? "%" : currency)}
                  </td>
                  <td className="py-2.5 px-4 text-right text-zinc-600">
                    {formatFinancialValue(m.previousValue, m.unit === "%" ? "%" : currency)}
                  </td>
                  <td className="py-2.5 px-4 text-right font-sans">
                    {renderChangeBadge(m)}
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
