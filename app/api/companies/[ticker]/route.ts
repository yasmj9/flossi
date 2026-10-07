import { NextRequest, NextResponse } from "next/server";
import { getCseCompany } from "@/lib/cse-companies";
import { fetchCompanyFromOmkar } from "@/lib/omkar-client";
import { getApiKey } from "@/lib/api-keys";

export async function GET(
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

    const omkarKey = await getApiKey("omkar");
    if (!omkarKey) {
      return NextResponse.json({
        success: true,
        status: "api_key_not_configured",
        company,
        quote: null,
        error: "Omkar Cloud API key is not configured. Configure it in Settings to fetch real-time market data.",
      });
    }

    const omkarResult = await fetchCompanyFromOmkar(company.ticker);

    return NextResponse.json({
      success: omkarResult.status === "success",
      status: omkarResult.status,
      company: omkarResult.company || company,
      quote: omkarResult.quote || null,
      error: omkarResult.error || null,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        success: false,
        status: "api_error",
        error: (err as Error).message || "Server error while fetching company",
      },
      { status: 500 }
    );
  }
}
