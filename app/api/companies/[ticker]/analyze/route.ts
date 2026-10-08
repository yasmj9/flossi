import { NextRequest, NextResponse } from "next/server";
import { getCseCompany } from "@/lib/cse-companies";
import { fetchFullCompanyDataFromParseBot } from "@/lib/parsebot-client";
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

    const normalizedJson = companyData.normalizedJevInput;
    if (!normalizedJson) {
      return NextResponse.json({
        success: false,
        status: "company_data_unavailable",
        company,
        error: "Unable to normalize stock data from the Fiche PDF for analysis.",
      });
    }

    // Step 2: Check JEV key
    const jevKey = await getApiKey("jev");
    if (!jevKey) {
      return NextResponse.json({
        success: false,
        status: "jev_not_configured",
        company,
        currentPrice: companyData.quote?.latestPrice ?? null,
        currency: companyData.quote?.currency || company.currency,
        valuationMetrics: {
          currentPer: companyData.financials?.per ?? companyData.fiveYearIndicators?.summaries.per.latestValue ?? null,
          fiveYearAveragePer: companyData.fiveYearIndicators?.summaries.per.fiveYearAverage ?? null,
          currentEps: companyData.financials?.eps ?? companyData.fiveYearIndicators?.summaries.bpa.latestValue ?? null,
          roe: companyData.financials?.roe ?? companyData.fiveYearIndicators?.summaries.roe.latestValue ?? null,
          dividendYield: companyData.financials?.dividendYield ?? companyData.fiveYearIndicators?.summaries.dividendYield.latestValue ?? null,
          currency: companyData.quote?.currency || company.currency,
        },
        technicalStructure: companyData.technicalStructure || null,
        candidateEntryZones: companyData.candidateEntryZones || [],
        fiveYearIndicators: companyData.fiveYearIndicators || null,
        financialStatementsSummary: companyData.financialStatementsSummary || null,
        ficheEmetteur: companyData.ficheEmetteur || null,
        dataUsedForAnalysis: normalizedJson,
        error: "JEV AI API key is not configured. Configure it in Settings to perform investment decision analysis (BUY / HOLD / SELL).",
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
        currentPrice: companyData.quote?.latestPrice ?? null,
        currency: companyData.quote?.currency || company.currency,
        dataUsedForAnalysis: normalizedJson,
        error: jevResult.error || "JEV AI returned an error while processing the investment decision.",
      });
    }

    // Step 8: Return normalized analysis response
    return NextResponse.json({
      success: true,
      status: "success",
      company,
      currentPrice: companyData.quote?.latestPrice ?? null,
      currency: companyData.quote?.currency || company.currency,
      jevDecision: jevResult.decision || "HOLD",
      jevConfidence: jevResult.confidence,
      probabilities: jevResult.probabilities || null,
      positiveFactors: jevResult.positiveFactors || [],
      negativeFactors: jevResult.negativeFactors || [],
      risks: jevResult.risks || [],
      investmentContext: jevResult.investmentContext || null,
      valuation: jevResult.valuation || null,
      valuationMetrics: {
        currentPer: companyData.financials?.per ?? companyData.fiveYearIndicators?.summaries.per.latestValue ?? null,
        fiveYearAveragePer: companyData.fiveYearIndicators?.summaries.per.fiveYearAverage ?? null,
        currentEps: companyData.financials?.eps ?? companyData.fiveYearIndicators?.summaries.bpa.latestValue ?? null,
        roe: companyData.financials?.roe ?? companyData.fiveYearIndicators?.summaries.roe.latestValue ?? null,
        dividendYield: companyData.financials?.dividendYield ?? companyData.fiveYearIndicators?.summaries.dividendYield.latestValue ?? null,
        currency: companyData.quote?.currency || company.currency,
      },
      technical: jevResult.technical || null,
      technicalStructure: companyData.technicalStructure || null,
      newsImpact: jevResult.newsImpact || null,
      news: companyData.news || [],
      entries: jevResult.entries || [],
      candidateEntryZones: companyData.candidateEntryZones || [],
      fiveYearIndicators: companyData.fiveYearIndicators || null,
      financialStatementsSummary: companyData.financialStatementsSummary || null,
      ficheEmetteur: companyData.ficheEmetteur || null,
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
