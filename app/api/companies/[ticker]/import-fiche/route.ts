import { NextRequest, NextResponse } from "next/server";
import { getCseCompany } from "@/lib/cse-companies";
import { parseFicheEmetteurText, FicheEmetteurData, saveFicheEmetteur } from "@/lib/fiche-emetteur";
import { extractTextFromPdfBuffer } from "@/lib/pdf-extractor";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ ticker: string }> }
) {
  try {
    const { ticker } = await context.params;
    if (!ticker) {
      return NextResponse.json(
        { success: false, error: "Missing ticker parameter." },
        { status: 400 }
      );
    }

    const company = getCseCompany(ticker);
    if (!company) {
      return NextResponse.json(
        { success: false, error: `Company ticker '${ticker.toUpperCase()}' is not listed on CSE.` },
        { status: 404 }
      );
    }

    const contentType = req.headers.get("content-type") || "";
    let extractedText = "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      if (!file) {
        return NextResponse.json(
          { success: false, error: "No file was uploaded. Please upload a Fiche Émetteur PDF." },
          { status: 400 }
        );
      }

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      try {
        extractedText = await extractTextFromPdfBuffer(buffer);
      } catch (pdfErr: unknown) {
        return NextResponse.json(
          { success: false, error: `Failed to parse PDF: ${(pdfErr as Error).message || "Invalid PDF"}` },
          { status: 400 }
        );
      }
    } else {
      // JSON with raw text
      const body = await req.json();
      extractedText = body.text || "";
    }

    if (!extractedText.trim()) {
      return NextResponse.json(
        { success: false, error: "No text could be extracted from the document." },
        { status: 400 }
      );
    }

    const parsed = parseFicheEmetteurText(extractedText);
    
    // Merge with base company information
    const completeData: FicheEmetteurData = {
      ticker: company.ticker,
      nomSociete: company.name,
      dateDonnees: new Date().toLocaleDateString("fr-FR"),
      coursMAD: parsed.coursMAD ?? null,
      variationPct: parsed.variationPct ?? null,
      sourceUrl: `https://www.casablanca-bourse.com/live-market/actions/fiche/${company.ticker}`,
      instrument: {
        isin: parsed.instrument?.isin || company.isin || "",
        ticker: company.ticker,
        marche: parsed.instrument?.marche || "Principal A",
        secteur: company.sector,
        nombreTitres: parsed.instrument?.nombreTitres ?? null,
        valeurNominale: parsed.instrument?.valeurNominale ?? null,
        capitalisationMAD: parsed.instrument?.capitalisationMAD ?? null,
      },
      societe: {
        nom: company.name,
      },
      dirigeants: parsed.dirigeants || [],
      actionnaires: parsed.actionnaires || [],
      chiffresCles: parsed.chiffresCles || [],
      dividendes: parsed.dividendes || [],
    };

    // Cache in memory and persist to disk for subsequent requests
    await saveFicheEmetteur(company.ticker, completeData);

    return NextResponse.json({
      success: true,
      message: `Successfully imported Fiche Émetteur for ${company.name} (${company.ticker}).`,
      data: completeData,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: (err as Error).message || "Server error importing Fiche Émetteur" },
      { status: 500 }
    );
  }
}
