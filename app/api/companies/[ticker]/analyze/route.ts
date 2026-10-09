import { NextRequest, NextResponse } from "next/server";
import { getCseCompany } from "@/lib/cse-companies";
import { fetchFullCompanyDataFromParseBot } from "@/lib/parsebot-client";
import { analyzeWithJev } from "@/lib/jev-client";
import { getApiKey } from "@/lib/api-keys";
import {
  buildJevStructuredState,
  buildJevQuickstartPayload,
  JevQuickstartPayload,
} from "@/lib/jev-payload";

export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ ticker: string }> }
) {
  try {
    const { ticker } = await context.params;
    if (!ticker) {
      return NextResponse.json(
        { success: false, status: "unsupported_company", error: "Missing ticker parameter." },
        { status: 400 }
      );
    }

    const company = getCseCompany(ticker);
    if (!company) {
      return NextResponse.json(
        {
          success: false,
          status: "unsupported_company",
          error: `Company ticker '${ticker.toUpperCase()}' is not listed on the Casablanca Stock Exchange.`,
        },
        { status: 404 }
      );
    }

    // Step 1: Fetch company, price, financials from imported Fiche Émetteur PDF
    const companyData = await fetchFullCompanyDataFromParseBot(company.ticker);

    if (companyData.status === "fiche_required") {
      return NextResponse.json({
        success: false,
        status: "fiche_required",
        company,
        error:
          companyData.error ||
          `No Fiche Instrument PDF imported yet for ${company.name} (${company.ticker}). Please use the Import PDF button to upload the official Casablanca Stock Exchange factsheet.`,
      });
    }

    if (companyData.status === "unsupported_company") {
      return NextResponse.json({
        success: false,
        status: "company_data_unavailable",
        company,
        error: companyData.error || `Data for '${company.ticker}' is currently unavailable.`,
      });
    }

    // Build the 5 Key Valuation / Financial Metrics
    const fiveKeyMetrics = {
      currentPer:
        companyData.financials?.per ??
        companyData.fiveYearIndicators?.summaries.per.latestValue ??
        null,
      fiveYearAveragePer:
        companyData.fiveYearIndicators?.summaries.per.fiveYearAverage ??
        null,
      currentEps:
        companyData.financials?.eps ??
        companyData.fiveYearIndicators?.summaries.bpa.latestValue ??
        null,
      roe:
        companyData.financials?.roe ??
        companyData.fiveYearIndicators?.summaries.roe.latestValue ??
        null,
      dividendYield:
        companyData.financials?.dividendYield ??
        companyData.fiveYearIndicators?.summaries.dividendYield.latestValue ??
        null,
      currency: companyData.quote?.currency || company.currency,
    };

    // Step 2: Prepare clean structured JSON input matching https://docs.typesafe.ai/introduction/quickstart
    const structuredState = buildJevStructuredState({
      company: {
        name: company.name,
        ticker: company.ticker,
        currentPrice: companyData.quote?.latestPrice ?? null,
        currency: company.currency,
      },
      technical: {
        trend: companyData.technicalStructure?.trend || "UPTREND",
        supportZones: companyData.technicalStructure?.supportZone
          ? [
              {
                from: companyData.technicalStructure.supportZone.low,
                to: companyData.technicalStructure.supportZone.high,
              },
            ]
          : [],
        resistanceZones: companyData.technicalStructure?.resistanceZone
          ? [
              {
                from: companyData.technicalStructure.resistanceZone.low,
                to: companyData.technicalStructure.resistanceZone.high,
              },
            ]
          : [],
        breakoutStatus: companyData.technicalStructure?.breakoutStatus || "NONE",
        retestStatus: companyData.technicalStructure?.retestStatus ? "RETESTING" : "NONE",
        volumeContext: companyData.technicalStructure?.volumeContext || "NORMAL",
        distanceFromNearestSupportPct:
          companyData.technicalStructure?.distanceFromSupportPct ?? null,
        distanceFromNearestResistancePct:
          companyData.technicalStructure?.distanceFromResistancePct ?? null,
      },
      balanceSheet: {
        totalAssets: companyData.financialStatementsSummary?.bilan.totalAssets.currentValue ?? null,
        totalLiabilities: null,
        equity:
          (companyData.financials?.bilanData?.capitauxPropres as number) ??
          companyData.financialStatementsSummary?.bilan.equity.currentValue ??
          null,
        cash: null,
        shortTermDebt: null,
        longTermDebt: null,
        totalDebt: null,
      },
      incomeStatement: {
        revenue:
          (companyData.financials?.cpcData?.chiffreAffaires as number) ??
          companyData.financialStatementsSummary?.cpc.revenue.currentValue ??
          null,
        revenueGrowthPct: companyData.financialStatementsSummary?.cpc.revenue.changePercent ?? null,
        operatingIncome: companyData.financialStatementsSummary?.cpc.operatingIncome.currentValue ?? null,
        operatingMarginPct: null,
        netIncome:
          (companyData.financials?.cpcData?.resultatNet as number) ??
          companyData.financialStatementsSummary?.cpc.netIncome.currentValue ??
          null,
        netIncomeGrowthPct: companyData.financialStatementsSummary?.cpc.netIncome.changePercent ?? null,
        netMarginPct: null,
      },
      cashFlow: {
        operatingCashFlow: null,
        investingCashFlow: null,
        financingCashFlow: null,
        freeCashFlow: null,
        closingCash: null,
      },
      fiveYearRatios: companyData.fiveYearIndicators?.years.map((y) => ({
        year: y.year,
        eps: y.bpa,
        roePct: y.roe,
        payoutPct: y.payoutRatio,
        dividendYieldPct: y.dividendYield,
        peRatio: y.per,
      })),
      valuation: {
        currentPe: fiveKeyMetrics.currentPer,
        fiveYearAveragePe: fiveKeyMetrics.fiveYearAveragePer,
        currentEps: fiveKeyMetrics.currentEps,
        epsTrend: companyData.fiveYearIndicators?.summaries.bpa.trend ?? null,
        roePct: fiveKeyMetrics.roe,
        dividendYieldPct: fiveKeyMetrics.dividendYield,
        payoutPct:
          companyData.financials?.payoutRatio ??
          companyData.fiveYearIndicators?.summaries.payoutRatio.latestValue ??
          null,
      },
      news: companyData.news?.map((n) => ({
        title: n.title,
        source: n.source || "",
        publishedAt: n.publishedAt || "",
        summary: n.snippet || "",
      })),
      dataQuality: {
        latestFinancialPeriod: companyData.ficheEmetteur?.dateDonnees || null,
        yearsAvailable: companyData.fiveYearIndicators?.totalYearsAvailable ?? 0,
        hasBalanceSheet: Boolean(companyData.financials?.bilanData),
        hasIncomeStatement: Boolean(companyData.financials?.cpcData),
        hasCashFlow: false,
        hasTechnicalHistory: Boolean(companyData.quote?.latestPrice),
        hasRecentNews: (companyData.news?.length ?? 0) > 0,
      },
    });

    const quickstartPayload: JevQuickstartPayload = buildJevQuickstartPayload(structuredState);

    // Step 3: Check JEV key
    const jevKey = await getApiKey("jev");
    if (!jevKey) {
      return NextResponse.json({
        success: false,
        status: "jev_not_configured",
        company,
        currentPrice: companyData.quote?.latestPrice ?? null,
        currency: companyData.quote?.currency || company.currency,
        fiveKeyMetrics,
        valuationMetrics: fiveKeyMetrics,
        ficheEmetteur: companyData.ficheEmetteur || null,
        dataUsedForAnalysis: quickstartPayload,
        error:
          "JEV AI API key is not configured. Configure it in Settings to perform investment decision analysis (BUY / HOLD / SELL).",
      });
    }

    // Step 4: Send structured JSON to JEV for decision
    const jevResult = await analyzeWithJev(quickstartPayload);

    if (jevResult.status === "jev_not_configured") {
      return NextResponse.json({
        success: false,
        status: "jev_not_configured",
        company,
        currentPrice: companyData.quote?.latestPrice ?? null,
        currency: companyData.quote?.currency || company.currency,
        fiveKeyMetrics,
        valuationMetrics: fiveKeyMetrics,
        dataUsedForAnalysis: quickstartPayload,
        error: jevResult.error || "JEV API key is not configured.",
      });
    }

    if (jevResult.status === "jev_error") {
      return NextResponse.json({
        success: false,
        status: "jev_error",
        company,
        currentPrice: companyData.quote?.latestPrice ?? null,
        currency: companyData.quote?.currency || company.currency,
        fiveKeyMetrics,
        valuationMetrics: fiveKeyMetrics,
        dataUsedForAnalysis: quickstartPayload,
        error:
          jevResult.error ||
          "JEV AI returned an error while processing the investment decision.",
      });
    }

    // Step 5: Return normalized analysis response
    return NextResponse.json({
      success: true,
      status: "success",
      company,
      currentPrice: companyData.quote?.latestPrice ?? null,
      currency: companyData.quote?.currency || company.currency,
      fiveKeyMetrics,
      valuationMetrics: fiveKeyMetrics,
      jevDecision: jevResult.decision || "HOLD",
      jevConfidence: jevResult.confidence,
      probabilities: jevResult.probabilities || null,
      scores: jevResult.scores || null,
      jevValuation: jevResult.valuation || null,
      ficheEmetteur: companyData.ficheEmetteur || null,
      dataUsedForAnalysis: quickstartPayload,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        success: false,
        status: "api_error",
        error: (err as Error).message || "Server error while running analysis",
      },
      { status: 500 }
    );
  }
}
