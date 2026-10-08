import { NextRequest, NextResponse } from "next/server";
import { extractTextFromPdfBuffer } from "@/lib/pdf-extractor";
import { getCseCompany, CSE_COMPANIES } from "@/lib/cse-companies";
import {
  parseFicheEmetteurText,
  saveFicheEmetteur,
  FicheEmetteurData,
  OFFICIAL_FICHES_EMETTEUR,
} from "@/lib/fiche-emetteur";

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";

    // 1. Quick load sample request (e.g. JSON { sample: "ATW" })
    if (contentType.includes("application/json")) {
      const body = await req.json();
      if (body.sample) {
        const sampleKey = String(body.sample).toUpperCase();
        const sampleData = OFFICIAL_FICHES_EMETTEUR[sampleKey];
        if (sampleData) {
          await saveFicheEmetteur(sampleKey, sampleData);
          return NextResponse.json({
            success: true,
            ticker: sampleData.ticker,
            companyName: sampleData.nomSociete,
            coursMAD: sampleData.coursMAD,
            message: `Loaded official sample Fiche for ${sampleData.nomSociete} (${sampleData.ticker}).`,
            data: sampleData,
          });
        }
      }
    }

    // 2. File Upload via multipart/form-data
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json(
        { success: false, error: "Expected multipart/form-data with a PDF file." },
        { status: 400 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No PDF file received. Please upload a Fiche Émetteur PDF." },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let extractedText = "";
    try {
      extractedText = await extractTextFromPdfBuffer(buffer);
    } catch (parseErr: unknown) {
      return NextResponse.json(
        {
          success: false,
          error: `Failed to extract text from PDF: ${(parseErr as Error).message || "Invalid PDF format"}`,
        },
        { status: 400 }
      );
    }

    if (!extractedText.trim()) {
      return NextResponse.json(
        { success: false, error: "Uploaded PDF contains no extractable text." },
        { status: 400 }
      );
    }

    // Parse the extracted text according to Casablanca Stock Exchange format
    const parsed = parseFicheEmetteurText(extractedText);
    const ticker = (parsed.ticker || "ATW").toUpperCase();
    const company = getCseCompany(ticker) || CSE_COMPANIES.find((c) => c.ticker === ticker);

    const completeData: FicheEmetteurData = {
      ticker,
      nomSociete: parsed.nomSociete || company?.name || ticker,
      dateDonnees: parsed.dateDonnees || new Date().toLocaleDateString("fr-FR"),
      coursMAD: parsed.coursMAD ?? null,
      variationPct: parsed.variationPct ?? null,
      sourceUrl: `https://www.casablanca-bourse.com/live-market/actions/fiche/${ticker}`,
      instrument: {
        isin: parsed.instrument?.isin || company?.isin || "",
        ticker,
        marche: parsed.instrument?.marche || "Principal A",
        secteur: parsed.instrument?.secteur || company?.sector || "Actions",
        nombreTitres: parsed.instrument?.nombreTitres ?? null,
        valeurNominale: parsed.instrument?.valeurNominale ?? 10.0,
        capitalisationMAD: parsed.instrument?.capitalisationMAD ?? null,
      },
      societe: {
        nom: parsed.nomSociete || company?.name || ticker,
        siege: parsed.societe?.siege,
        auditeur: parsed.societe?.auditeur,
        constitution: parsed.societe?.constitution,
        introduction: parsed.societe?.introduction,
      },
      dirigeants: parsed.dirigeants || [],
      actionnaires: parsed.actionnaires || [],
      dateActionnariat: parsed.dateActionnariat,
      chiffresCles: parsed.chiffresCles || [],
      dividendes: parsed.dividendes || [],
      relationsInvestisseurs: parsed.relationsInvestisseurs,
    };

    // Persist to memory and disk cache
    await saveFicheEmetteur(ticker, completeData);

    return NextResponse.json({
      success: true,
      ticker,
      companyName: completeData.nomSociete,
      coursMAD: completeData.coursMAD,
      variationPct: completeData.variationPct,
      dateDonnees: completeData.dateDonnees,
      message: `Successfully imported Fiche Émetteur for ${completeData.nomSociete} (${ticker}).`,
      data: completeData,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: (err as Error).message || "Server error while importing PDF.",
      },
      { status: 500 }
    );
  }
}
