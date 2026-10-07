import { NextRequest, NextResponse } from "next/server";
import { getCseCompany } from "@/lib/cse-companies";
import { fetchFullCompanyDataFromOmkar } from "@/lib/omkar-client";
import { analyzeWithJev } from "@/lib/jev-client";
import { getApiKey } from "@/lib/api-keys";

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

    // Check configuration
    const omkarKey = await getApiKey("omkar");
    if (!omkarKey) {
      return NextResponse.json({
        success: false,
        status: "omkar_not_configured",
        company,
        error: "Omkar Cloud API key is not configured. Configure it in Settings to fetch stock & financial data.",
      });
    }

    const jevKey = await getApiKey("jev");
    if (!jevKey) {
      return NextResponse.json({
        success: false,
        status: "jev_not_configured",
        company,
        error: "JEV AI API key is not configured. Configure it in Settings to perform investment decision analysis.",
      });
    }

    // Step 1 - 5: Fetch company, price, financials, news from Omkar Cloud & normalize
    const omkarData = await fetchFullCompanyDataFromOmkar(company.ticker);

    if (omkarData.status === "api_error") {
      return NextResponse.json({
        success: false,
        status: "api_error",
        company,
        error: omkarData.error || "Failed to fetch data from Omkar Cloud.",
      });
    }

    if (omkarData.status === "unsupported_company") {
      return NextResponse.json({
        success: false,
        status: "company_data_unavailable",
        company,
        error: omkarData.error || `Data for '${company.ticker}' is currently unavailable from Omkar Cloud.`,
      });
    }

    const normalizedJson = omkarData.normalizedJevInput;
    if (!normalizedJson) {
      return NextResponse.json({
        success: false,
        status: "company_data_unavailable",
        company,
        error: "Unable to normalize stock data for analysis.",
      });
    }

    // Step 6 & 7: Send structured JSON to JEV for decision
    const jevResult = await analyzeWithJev(normalizedJson as unknown as Record<string, unknown>);

    if (jevResult.status === "jev_not_configured") {
      return NextResponse.json({
        success: false,
        status: "jev_not_configured",
        company,
        error: jevResult.error || "JEV API key is not configured.",
      });
    }

    if (jevResult.status === "jev_error") {
      return NextResponse.json({
        success: false,
        status: "jev_error",
        company,
        currentPrice: omkarData.quote?.latestPrice ?? null,
        currency: omkarData.quote?.currency || company.currency,
        dataUsedForAnalysis: normalizedJson,
        error: jevResult.error || "JEV AI returned an error while processing the investment decision.",
      });
    }

    // Step 8: Return normalized analysis response
    return NextResponse.json({
      success: true,
      status: "success",
      company,
      currentPrice: omkarData.quote?.latestPrice ?? null,
      currency: omkarData.quote?.currency || company.currency,
      jevDecision: jevResult.decision || "HOLD",
      jevConfidence: jevResult.confidence,
      probabilities: jevResult.probabilities || null,
      positiveFactors: jevResult.positiveFactors || [],
      negativeFactors: jevResult.negativeFactors || [],
      risks: jevResult.risks || [],
      investmentContext: jevResult.investmentContext || null,
      valuation: jevResult.valuation || null,
      valuationMetrics: {
        currentPer: omkarData.financials?.per ?? omkarData.fiveYearIndicators?.summaries.per.latestValue ?? null,
        fiveYearAveragePer: omkarData.fiveYearIndicators?.summaries.per.fiveYearAverage ?? null,
        currentEps: omkarData.financials?.eps ?? omkarData.fiveYearIndicators?.summaries.bpa.latestValue ?? null,
        roe: omkarData.financials?.roe ?? omkarData.fiveYearIndicators?.summaries.roe.latestValue ?? null,
        dividendYield: omkarData.financials?.dividendYield ?? omkarData.fiveYearIndicators?.summaries.dividendYield.latestValue ?? null,
        currency: omkarData.quote?.currency || company.currency,
      },
      technical: jevResult.technical || null,
      technicalStructure: omkarData.technicalStructure || null,
      newsImpact: jevResult.newsImpact || null,
      news: omkarData.news || [],
      entries: jevResult.entries || [],
      candidateEntryZones: omkarData.candidateEntryZones || [],
      fiveYearIndicators: omkarData.fiveYearIndicators || null,
      financialStatementsSummary: omkarData.financialStatementsSummary || null,
      dataUsedForAnalysis: normalizedJson,
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
