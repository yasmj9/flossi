import { NextRequest, NextResponse } from "next/server";
import { CSE_COMPANIES } from "@/lib/cse-companies";
import { getAllImportedFiches } from "@/lib/fiche-emetteur";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q") || "";

    const importedFiches = getAllImportedFiches();
    const importedTickers = new Set(importedFiches.map((f) => f.ticker.toUpperCase()));

    // Return all companies with imported status flag
    const companies = CSE_COMPANIES.map((c) => ({
      ...c,
      isImported: importedTickers.has(c.ticker.toUpperCase()),
      ficheData: importedFiches.find((f) => f.ticker.toUpperCase() === c.ticker.toUpperCase()) || null,
    }));

    return NextResponse.json({
      success: true,
      query,
      importedFiches,
      total: companies.length,
      companies,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: (err as Error).message || "Failed to list companies",
      },
      { status: 500 }
    );
  }
}
