import { NextRequest, NextResponse } from "next/server";
import { searchCseCompanies } from "@/lib/cse-companies";
import { getApiKey } from "@/lib/api-keys";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q") || "";

    const omkarKey = await getApiKey("omkar");
    const results = searchCseCompanies(query);

    return NextResponse.json({
      success: true,
      query,
      apiKeyConfigured: !!omkarKey,
      total: results.length,
      companies: results,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: (err as Error).message || "Failed to search companies",
      },
      { status: 500 }
    );
  }
}
