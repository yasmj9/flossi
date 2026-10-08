import { NextRequest, NextResponse } from "next/server";
import { getCseCompany } from "@/lib/cse-companies";
import { fetchCompanyFromDrahmi } from "@/lib/drahmi-client";
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

    const drahmiKey = await getApiKey("drahmi");
    const omkarKey = await getApiKey("omkar");

    if (!drahmiKey && !omkarKey) {
      return NextResponse.json({
        success: true,
        status: "api_key_not_configured",
        company,
        quote: null,
        error: "Drahmi API key is not configured. Configure it in Settings to fetch real-time market data.",
      });
    }

    const result = drahmiKey
      ? await fetchCompanyFromDrahmi(company.ticker)
      : await fetchCompanyFromOmkar(company.ticker);

    return NextResponse.json({
      success: result.status === "success",
      status: result.status,
      company: result.company || company,
      quote: result.quote || null,
      error: result.error || null,
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
