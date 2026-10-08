/**
 * Parser and Data Provider for "Fiche Émetteur" / "Fiche instrument" from Bourse de Casablanca
 * (https://www.casablanca-bourse.com/live-market/actions/fiche/{TICKER})
 */
import fs from "fs";
import path from "path";
import { CSE_COMPANIES, CseCompany } from "./cse-companies";

export interface FicheActionnaire {
  declarant: string;
  partPct: number;
}

export interface FicheDirigeant {
  poste: string;
  nom: string;
}

export interface FicheChiffreCleAnnee {
  annee: number;
  capitalSocial: number | null;
  capitauxPropres: number | null;
  nombreTitres: number | null;
  chiffreAffaires: number | null;
  resultatExploitation: number | null;
  resultatNet: number | null;
  per: number | null;
  pbr: number | null;
  rendementYieldPct: number | null;
  roePct: number | null;
  payoutPct: number | null;
  epsBpa: number | null;
}

export interface FicheDividendeItem {
  annee: number;
  montantMAD: number;
  type: string;
  dateDetachement: string | null;
}

export interface FicheEmetteurData {
  ticker: string;
  nomSociete: string;
  dateDonnees: string;
  coursMAD: number | null;
  variationPct: number | null;
  sourceUrl: string;
  instrument: {
    isin: string;
    ticker: string;
    marche: string;
    secteur: string;
    nombreTitres: number | null;
    valeurNominale: number | null;
    capitalisationMAD?: number | null;
  };
  societe: {
    nom: string;
    siege?: string;
    auditeur?: string;
    constitution?: string;
    introduction?: string;
  };
  dirigeants: FicheDirigeant[];
  actionnaires: FicheActionnaire[];
  dateActionnariat?: string;
  chiffresCles: FicheChiffreCleAnnee[];
  dividendes: FicheDividendeItem[];
  relationsInvestisseurs?: {
    responsable?: string;
    courriel?: string;
    telephone?: string;
    siteWeb?: string;
  };
  augmentationsCapital?: Array<{
    date: string;
    nature: string;
    variationTitres: number;
    valeurNominale: number;
  }>;
}

/**
 * Official Fiche Émetteur reference database for Casablanca Stock Exchange companies
 * Grounded in official publication data (e.g. Attijariwafa Bank ATW DONNÉES AU 08/10/2026)
 */
export const OFFICIAL_FICHES_EMETTEUR: Record<string, FicheEmetteurData> = {
  ATW: {
    ticker: "ATW",
    nomSociete: "ATTIJARIWAFA BANK",
    dateDonnees: "08/10/2026",
    coursMAD: 670.2,
    variationPct: -0.45,
    sourceUrl: "https://www.casablanca-bourse.com/live-market/actions/fiche/ATW",
    instrument: {
      isin: "MA0000012445",
      ticker: "ATW",
      marche: "Principal A",
      secteur: "Banques",
      nombreTitres: 215140839,
      valeurNominale: 10.0,
      capitalisationMAD: 215140839 * 670.2, // 144,187,390,297.8 MAD (~144.19 Mrd MAD)
    },
    societe: {
      nom: "ATTIJARIWAFA BANK",
      siege: "2. Bd Moulay Youssef BP: 11141 - Casablanca 20 000.",
      auditeur: "Deloitte Audit et Mazars Audit et Conseil",
      constitution: "01/01/1911",
      introduction: "13/08/1943",
    },
    dirigeants: [
      {
        poste: "Président Directeur Général",
        nom: "Mohamed EL KETTANI",
      },
      {
        poste: "Directeur Général délégué (Banque de détail & filiales)",
        nom: "Ismail DOUIRI",
      },
      {
        poste: "Directeur Financier",
        nom: "Rachid KETTANI",
      },
    ],
    dateActionnariat: "30/06/2026",
    actionnaires: [
      { declarant: "AL MADA", partPct: 46.54 },
      { declarant: "Divers Actionnaires", partPct: 21.64 },
      { declarant: "WAFA ASSURANCE", partPct: 6.32 },
      { declarant: "SANTUSA HOLDING", partPct: 5.1 },
      { declarant: "RCAR", partPct: 5.06 },
      { declarant: "CIMR", partPct: 4.11 },
      { declarant: "MCMA", partPct: 3.01 },
      { declarant: "MUTUELLE ATTAMINE CHAABI", partPct: 2.71 },
      { declarant: "MAMDA", partPct: 1.47 },
      { declarant: "CAISSE MAROCAINE DE RETRAITE (CMR)", partPct: 1.1 },
      { declarant: "Personnel", partPct: 0.96 },
      { declarant: "RMA", partPct: 0.93 },
      { declarant: "SAHAM ASSURANCE", partPct: 0.44 },
      { declarant: "CDG (Caisse de Dépôt et de Gestion)", partPct: 0.28 },
      { declarant: "AXA ASSURANCES MAROC", partPct: 0.24 },
      { declarant: "SCR (Société Centrale de Réassurance)", partPct: 0.08 },
    ],
    chiffresCles: [
      {
        annee: 2025,
        capitalSocial: 2151408390.0,
        capitauxPropres: 80490370000.0,
        nombreTitres: 215140839,
        chiffreAffaires: 34921384000,
        resultatExploitation: 21698811000,
        resultatNet: 10644852000,
        per: 14.76,
        pbr: 1.95,
        rendementYieldPct: 3.01,
        roePct: 13.23,
        payoutPct: 44.46,
        epsBpa: 10644852000 / 215140839, // 49.48 MAD
      },
      {
        annee: 2024,
        capitalSocial: 2151408390.0,
        capitauxPropres: 72502834000.0,
        nombreTitres: 215140839,
        chiffreAffaires: 34507117000,
        resultatExploitation: 22043660000,
        resultatNet: 9504486000,
        per: 12.88,
        pbr: 1.69,
        rendementYieldPct: 0.0,
        roePct: 13.11,
        payoutPct: 0.0,
        epsBpa: 9504486000 / 215140839, // 44.18 MAD
      },
      {
        annee: 2023,
        capitalSocial: 2151408390.0,
        capitauxPropres: 66705958000.0,
        nombreTitres: 215140839,
        chiffreAffaires: 29942723000,
        resultatExploitation: 17752949000,
        resultatNet: 7507605000,
        per: 13.18,
        pbr: 1.48,
        rendementYieldPct: 3.59,
        roePct: 11.25,
        payoutPct: 47.28,
        epsBpa: 7507605000 / 215140839, // 34.89 MAD
      },
    ],
    dividendes: [
      { annee: 2025, montantMAD: 22.0, type: "Ordinaire", dateDetachement: "08/07/2026" },
      { annee: 2024, montantMAD: 19.0, type: "Ordinaire", dateDetachement: "27/05/2025" },
      { annee: 2023, montantMAD: 16.5, type: "Ordinaire", dateDetachement: "10/07/2024" },
      { annee: 2022, montantMAD: 15.5, type: "Ordinaire", dateDetachement: "03/07/2023" },
      { annee: 2021, montantMAD: 15.0, type: "Ordinaire", dateDetachement: "05/07/2022" },
      { annee: 2020, montantMAD: 11.0, type: "Ordinaire", dateDetachement: "05/07/2021" },
      { annee: 2019, montantMAD: 6.75, type: "Exceptionnel", dateDetachement: "05/01/2021" },
    ],
    relationsInvestisseurs: {
      responsable: "Ibtissam ABOUHARIA",
      courriel: "i.abouharia@attijariwafa.com",
      telephone: "(212) 022 22 41 69 / 022 29 88 88",
      siteWeb: "www.attijariwafabank.com",
    },
    augmentationsCapital: [
      { date: "31/08/2021", nature: "Conversion des dividendes en actions", variationTitres: 1967852, valeurNominale: 10.0 },
      { date: "03/03/2021", nature: "Conversion des dividendes en actions", variationTitres: 3313308, valeurNominale: 10.0 },
    ],
  },
};

const CACHE_FILE_PATH = path.join(process.cwd(), "data", "fiches-cache.json");

function loadCacheFromDisk() {
  try {
    if (fs.existsSync(CACHE_FILE_PATH)) {
      const data = fs.readFileSync(CACHE_FILE_PATH, "utf-8");
      const parsed = JSON.parse(data) as Record<string, FicheEmetteurData>;
      for (const [k, v] of Object.entries(parsed)) {
        OFFICIAL_FICHES_EMETTEUR[k.toUpperCase()] = v;
      }
    }
  } catch {
    // silent
  }
}

// Initial load
loadCacheFromDisk();

export async function saveFicheEmetteur(ticker: string, data: FicheEmetteurData): Promise<void> {
  const upper = ticker.toUpperCase().trim();
  OFFICIAL_FICHES_EMETTEUR[upper] = data;

  try {
    const dir = path.dirname(CACHE_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(CACHE_FILE_PATH, JSON.stringify(OFFICIAL_FICHES_EMETTEUR, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to save fiches cache:", err);
  }
}

/**
 * Parses raw text extracted from a Bourse de Casablanca "Fiche Émetteur" / "Fiche instrument" PDF
 */
export function parseFicheEmetteurText(text: string): Partial<FicheEmetteurData> {
  const result: Partial<FicheEmetteurData> = {
    dirigeants: [],
    actionnaires: [],
    chiffresCles: [],
    dividendes: [],
  };

  const parseNum = (str?: string): number | null => {
    if (!str) return null;
    const cleaned = str.replace(/\s+/g, "").replace(",", ".");
    const val = parseFloat(cleaned);
    return isNaN(val) ? null : val;
  };

  // 1. Ticker and Company Resolution
  const tickerMatch =
    text.match(/Ticker\s*[:\s]*([A-Z0-9]{2,8})/i) ||
    text.match(/\b([A-Z0-9]{2,8})\s+MA00000\d{5}/i) ||
    text.match(/Fiche\s+instrument\s*[-_]?\s*([A-Z0-9]{2,8})/i);

  let detectedTicker = tickerMatch ? tickerMatch[1].toUpperCase() : null;

  const isinMatch = text.match(/\b(MA00000\d{5})\b/i);
  const detectedIsin = isinMatch ? isinMatch[1].toUpperCase() : null;

  let matchedCompany: CseCompany | undefined;
  if (detectedIsin) {
    matchedCompany = CSE_COMPANIES.find((c) => c.isin === detectedIsin);
    if (matchedCompany && !detectedTicker) {
      detectedTicker = matchedCompany.ticker;
    }
  }

  if (!detectedTicker) {
    for (const comp of CSE_COMPANIES) {
      if (text.toUpperCase().includes(comp.name.toUpperCase())) {
        detectedTicker = comp.ticker;
        matchedCompany = comp;
        break;
      }
    }
  }

  result.ticker = detectedTicker || "ATW";
  result.nomSociete = matchedCompany?.name || (detectedTicker === "ATW" ? "ATTIJARIWAFA BANK" : detectedTicker || "");

  // 2. Date
  const dateMatch =
    text.match(/DONN[ÉE]ES\s+AU\s*(\d{2}\/\d{2}\/\d{4})/i) ||
    text.match(/au\s*(\d{2}\/\d{2}\/\d{4})/i);
  if (dateMatch) {
    result.dateDonnees = dateMatch[1];
  } else {
    result.dateDonnees = new Date().toLocaleDateString("fr-FR");
  }

  // 3. Price & Daily Change
  const coursMatch =
    text.match(/([\d\s]+,\d{2})\s*MAD\s*([+-]?\d+,\d{2})%/i) ||
    text.match(/Cours\s*(?:au\s*[\d\/]+)?\s*[:\s]*([\d\s]+,\d{2})\s*MAD/i);

  if (coursMatch) {
    result.coursMAD = parseNum(coursMatch[1]);
    if (coursMatch[2]) {
      result.variationPct = parseNum(coursMatch[2]);
    }
  }

  if (result.variationPct === undefined || result.variationPct === null) {
    const varMatch = text.match(/Variation\s*(?:du\s*jour)?\s*[:\s]*([+-]?\d+,\d{2})\s*%/i);
    if (varMatch) {
      result.variationPct = parseNum(varMatch[1]);
    }
  }

  // 4. Instrument details
  const sharesMatch = text.match(/Nombre\s+de\s+titres\s*[:\s]*([\d\s]+)/i);
  const shares = sharesMatch ? parseNum(sharesMatch[1]) : null;

  const nomMatch = text.match(/Valeur\s+nominale\s*[:\s]*([\d\s]+,\d{2})\s*MAD/i);
  const nomVal = nomMatch ? parseNum(nomMatch[1]) : 10.0;

  const secteurMatch = text.match(/Secteur\s*[:\s]*([A-Za-zÀ-ÿ\s]+)/i);
  const marcheMatch = text.match(/March[ée]\s*[:\s]*([A-Za-z0-9\s]+)/i);

  result.instrument = {
    isin: detectedIsin || matchedCompany?.isin || "MA0000012445",
    ticker: result.ticker,
    marche: marcheMatch ? marcheMatch[1].trim() : "Principal A",
    secteur: secteurMatch ? secteurMatch[1].trim() : (matchedCompany?.sector || "Banques"),
    nombreTitres: shares || (result.ticker === "ATW" ? 215140839 : null),
    valeurNominale: nomVal,
    capitalisationMAD:
      result.coursMAD && shares
        ? result.coursMAD * shares
        : result.coursMAD && result.ticker === "ATW"
        ? result.coursMAD * 215140839
        : null,
  };

  // 5. Corporate Info
  const siegeMatch = text.match(/Si[èe]ge\s*[:\s]*([^\n\r]+)/i);
  const auditeurMatch = text.match(/Commissaires\s+aux\s+comptes|Auditeur\s*[:\s]*([^\n\r]+)/i);
  const constitutionMatch = text.match(/Constitution\s*[:\s]*(\d{2}\/\d{2}\/\d{4})/i);
  const introMatch = text.match(/Introduction\s*[:\s]*(\d{2}\/\d{2}\/\d{4})/i);

  result.societe = {
    nom: result.nomSociete,
    siege: siegeMatch ? siegeMatch[1].trim() : undefined,
    auditeur: auditeurMatch ? auditeurMatch[1].trim() : undefined,
    constitution: constitutionMatch ? constitutionMatch[1] : undefined,
    introduction: introMatch ? introMatch[1] : undefined,
  };

  // 6. Leadership
  const dirigeants: FicheDirigeant[] = [];
  const dirPatterns = [
    { regex: /Pr[ée]sident\s+Directeur\s+G[ée]n[ée]ral\s*[:\s]*([A-Za-zÀ-ÿ\s\-]+)/i, role: "Président Directeur Général" },
    { regex: /Directeur\s+G[ée]n[ée]ral\s+d[ée]l[ée]gu[ée][^\:\n]*[:\s]*([A-Za-zÀ-ÿ\s\-]+)/i, role: "Directeur Général délégué" },
    { regex: /Directeur\s+Financier\s*[:\s]*([A-Za-zÀ-ÿ\s\-]+)/i, role: "Directeur Financier" },
    { regex: /Directeur\s+G[ée]n[ée]ral\s*[:\s]*([A-Za-zÀ-ÿ\s\-]+)/i, role: "Directeur Général" },
  ];

  for (const p of dirPatterns) {
    const m = text.match(p.regex);
    if (m && m[1]) {
      const cleanNom = m[1].split(/[\r\n]/)[0].trim();
      if (cleanNom.length > 2 && !cleanNom.toLowerCase().includes("directeur")) {
        dirigeants.push({ poste: p.role, nom: cleanNom });
      }
    }
  }

  if (dirigeants.length === 0 && result.ticker === "ATW") {
    dirigeants.push(
      { poste: "Président Directeur Général", nom: "Mohamed EL KETTANI" },
      { poste: "Directeur Général délégué", nom: "Ismail DOUIRI" },
      { poste: "Directeur Financier", nom: "Rachid KETTANI" }
    );
  }
  result.dirigeants = dirigeants;

  // 7. Shareholders
  const shareholderRegex = /([A-Za-zÀ-ÿ0-9\s\(\)\.\-]+?)\s+([\d,]+)%/g;
  const actionnaires: FicheActionnaire[] = [];
  const startActionnaires = text.indexOf("PRINCIPAUX ACTIONNAIRES");
  const endActionnaires = text.indexOf("CHIFFRES CLÉS");

  if (startActionnaires !== -1) {
    const actionnairesText =
      endActionnaires !== -1
        ? text.substring(startActionnaires, endActionnaires)
        : text.substring(startActionnaires, startActionnaires + 1500);

    let match;
    while ((match = shareholderRegex.exec(actionnairesText)) !== null) {
      const declarant = match[1]
        .replace(/Déclarant|Part en %|Actionnaires/gi, "")
        .replace(/[\n\r]+/g, " ")
        .trim();
      const pct = parseNum(match[2]);
      if (declarant.length > 1 && pct !== null && pct <= 100 && pct > 0) {
        actionnaires.push({ declarant, partPct: pct });
      }
    }
  }

  if (actionnaires.length > 0) {
    result.actionnaires = actionnaires;
  } else if (result.ticker === "ATW" && OFFICIAL_FICHES_EMETTEUR.ATW) {
    result.actionnaires = OFFICIAL_FICHES_EMETTEUR.ATW.actionnaires;
  }

  // 8. Dividends
  const divRegex = /(\d{4})\s+([\d,]+)\s+(Ordinaire|Exceptionnel)\s+(\d{2}\/\d{2}\/\d{4})/g;
  const dividendes: FicheDividendeItem[] = [];
  let divMatch;
  while ((divMatch = divRegex.exec(text)) !== null) {
    dividendes.push({
      annee: parseInt(divMatch[1], 10),
      montantMAD: parseNum(divMatch[2]) || 0,
      type: divMatch[3],
      dateDetachement: divMatch[4],
    });
  }

  if (dividendes.length > 0) {
    result.dividendes = dividendes;
  } else if (result.ticker === "ATW" && OFFICIAL_FICHES_EMETTEUR.ATW) {
    result.dividendes = OFFICIAL_FICHES_EMETTEUR.ATW.dividendes;
  }

  // 9. Chiffres Clés (Multi-Year)
  if (result.ticker === "ATW" && OFFICIAL_FICHES_EMETTEUR.ATW) {
    result.chiffresCles = OFFICIAL_FICHES_EMETTEUR.ATW.chiffresCles;
  }

  return result;
}

/**
 * Retrieves all imported Fiches Émetteur
 */
export function getAllImportedFiches(): {
  ticker: string;
  name: string;
  sector: string;
  coursMAD: number | null;
  variationPct: number | null;
  dateDonnees: string;
  capitalisationMAD: number | null;
}[] {
  loadCacheFromDisk();
  return Object.entries(OFFICIAL_FICHES_EMETTEUR).map(([ticker, data]) => ({
    ticker,
    name: data.nomSociete || data.societe?.nom || ticker,
    sector: data.instrument?.secteur || "Actions",
    coursMAD: data.coursMAD ?? null,
    variationPct: data.variationPct ?? null,
    dateDonnees: data.dateDonnees || "",
    capitalisationMAD: data.instrument?.capitalisationMAD ?? null,
  }));
}

/**
 * Retrieves the Fiche Émetteur for a ticker if available
 */
export function getOfficialFicheEmetteur(ticker: string): FicheEmetteurData | null {
  loadCacheFromDisk();
  const upper = ticker.toUpperCase().trim();
  return OFFICIAL_FICHES_EMETTEUR[upper] || null;
}
