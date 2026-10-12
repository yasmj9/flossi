/**
 * Configuration des seuils déterministes pour le moteur de scoring
 * d'analyse financière fondamentale (CSE - Bourse de Casablanca).
 *
 * Ces seuils constituent des règles heuristiques explicites, auditables
 * et calibrables selon le secteur d'activité de l'entreprise.
 */

export interface SectorThresholds {
  growth: {
    revenueYoyBands: { min: number; points: number; label: string }[];
    cagr3yBands: { min: number; points: number; label: string }[];
    earningsGrowthBands: { min: number; points: number; label: string }[];
  };
  profitability: {
    roeBands: { min: number; points: number; label: string }[];
    netMarginBands: { min: number; points: number; label: string }[];
    operatingMarginBands: { min: number; points: number; label: string }[];
  };
  debt: {
    // Net Debt / EBITDA (inférieur est meilleur)
    netDebtEbitdaBands: { max: number; points: number; label: string }[];
    // Gearing : Dette financière / Capitaux propres (inférieur est meilleur)
    debtToEquityBands: { max: number; points: number; label: string }[];
  };
  cashFlow: {
    // Ratio conversion de cash : OCF / Résultat net
    ocfToNetIncomeBands: { min: number; points: number; label: string }[];
    // FCF / CA ou FCF positif continu
    fcfQualityBands: {
      positiveFcfPoints: number;
      capexExceedsOcfPoints: number;
      negativeOcfPoints: number;
    };
  };
}

/**
 * Seuils standards par défaut (Heuristique générale)
 */
export const DEFAULT_THRESHOLDS: SectorThresholds = {
  growth: {
    // Chiffre d'affaires YoY (10 pts max)
    revenueYoyBands: [
      { min: 15.0, points: 10, label: 'Excellente croissance (> 15%)' },
      { min: 8.0, points: 8, label: 'Bonne dynamique (8% à 15%)' },
      { min: 3.0, points: 5, label: 'Croissance modérée (3% à 8%)' },
      { min: 0.0, points: 3, label: 'Croissance atone (0% à 3%)' },
      { min: -Infinity, points: 0, label: 'Régression du chiffre d’affaires (< 0%)' },
    ],
    // CAGR 3 ans CA (5 pts max)
    cagr3yBands: [
      { min: 12.0, points: 5, label: 'TCAC 3 ans très soutenu (> 12%)' },
      { min: 6.0, points: 4, label: 'TCAC 3 ans solide (6% à 12%)' },
      { min: 2.0, points: 2.5, label: 'TCAC 3 ans faible (2% à 6%)' },
      { min: 0.0, points: 1, label: 'Stagnation sur 3 ans (0% à 2%)' },
      { min: -Infinity, points: 0, label: 'Tendance baissière sur 3 ans (< 0%)' },
    ],
    // Croissance Bénéfices / BPA (10 pts max)
    earningsGrowthBands: [
      { min: 15.0, points: 10, label: 'Progression des bénéfices supérieure (> 15%)' },
      { min: 8.0, points: 8, label: 'Bonne croissance des profits (8% à 15%)' },
      { min: 2.0, points: 5, label: 'Légère hausse des bénéfices (2% à 8%)' },
      { min: 0.0, points: 2, label: 'Bénéfices stables (0% à 2%)' },
      { min: -Infinity, points: 0, label: 'Bénéfices en repli ou pertes nettes (< 0%)' },
    ],
  },
  profitability: {
    // ROE (10 pts max)
    roeBands: [
      { min: 18.0, points: 10, label: 'Rentabilité des fonds propres élevée (> 18%)' },
      { min: 12.0, points: 8, label: 'Bonne rentabilité ROE (12% à 18%)' },
      { min: 8.0, points: 5, label: 'ROE convenable (8% à 12%)' },
      { min: 4.0, points: 2.5, label: 'ROE faible (4% à 8%)' },
      { min: -Infinity, points: 0, label: 'ROE insuffisant ou négatif (< 4%)' },
    ],
    // Marge nette (10 pts max)
    netMarginBands: [
      { min: 15.0, points: 10, label: 'Marge nette excellente (> 15%)' },
      { min: 8.0, points: 8, label: 'Marge nette saine (8% à 15%)' },
      { min: 4.0, points: 5, label: 'Marge nette moyenne (4% à 8%)' },
      { min: 1.0, points: 2.5, label: 'Marge nette mince (1% à 4%)' },
      { min: -Infinity, points: 0, label: 'Marge déficitaire ou nulle (< 1%)' },
    ],
    // Marge opérationnelle (5 pts max)
    operatingMarginBands: [
      { min: 20.0, points: 5, label: 'Marge d’exploitation élevée (> 20%)' },
      { min: 12.0, points: 4, label: 'Bonne marge d’exploitation (12% à 20%)' },
      { min: 6.0, points: 2.5, label: 'Marge d’exploitation correcte (6% à 12%)' },
      { min: 2.0, points: 1, label: 'Marge d’exploitation faible (2% à 6%)' },
      { min: -Infinity, points: 0, label: 'Marge d’exploitation critique (< 2%)' },
    ],
  },
  debt: {
    // Dette Nette / EBITDA (15 pts max)
    netDebtEbitdaBands: [
      { max: 0.0, points: 15, label: 'Trésorerie nette positive (Dette nette négative)' },
      { max: 1.5, points: 15, label: 'Endettement très faible (≤ 1.5x EBITDA)' },
      { max: 2.5, points: 11, label: 'Endettement modéré et maîtrisé (1.5x à 2.5x)' },
      { max: 3.5, points: 6, label: 'Levier financier sensible (2.5x à 3.5x)' },
      { max: 4.5, points: 2, label: 'Levier financier élevé (3.5x à 4.5x)' },
      { max: Infinity, points: 0, label: 'Surendettement critique (> 4.5x EBITDA ou EBITDA négatif)' },
    ],
    // Dette Financière / Capitaux Propres (Gearing, 10 pts max)
    debtToEquityBands: [
      { max: 0.3, points: 10, label: 'Gearing très sain (Dette / CP ≤ 30%)' },
      { max: 0.6, points: 8, label: 'Gearing équilibré (30% à 60%)' },
      { max: 1.0, points: 5, label: 'Gearing acceptable (60% à 100%)' },
      { max: 1.5, points: 2.5, label: 'Gearing élevé (100% à 150%)' },
      { max: Infinity, points: 0, label: 'Gearing excessif (> 150% des fonds propres)' },
    ],
  },
  cashFlow: {
    // OCF / Résultat Net (15 pts max)
    ocfToNetIncomeBands: [
      { min: 1.2, points: 15, label: 'Excellente conversion cash (> 120% du bénéfice)' },
      { min: 0.9, points: 12, label: 'Bonne conversion cash (90% à 120%)' },
      { min: 0.6, points: 7, label: 'Conversion cash partielle (60% à 90%)' },
      { min: 0.2, points: 3, label: 'Conversion cash faible (20% à 60%)' },
      { min: -Infinity, points: 0, label: 'Déconnexion cash/résultat (< 20% ou OCF négatif)' },
    ],
    // Qualité FCF (10 pts max)
    fcfQualityBands: {
      positiveFcfPoints: 10,
      capexExceedsOcfPoints: 4, // Tolérance pour CapEx d'expansion
      negativeOcfPoints: 0,
    },
  },
};

/**
 * Calibrations sectorielles spécifiques pour Casablanca Stock Exchange
 */
export const SECTOR_CUSTOM_THRESHOLDS: Record<string, Partial<SectorThresholds>> = {
  'Santé & pharmacie': {
    // Modèle intensif en investissements (ex: cliniques, Akdital) : tolérance CapEx d'expansion
    debt: {
      netDebtEbitdaBands: [
        { max: 0.0, points: 15, label: 'Trésorerie nette positive' },
        { max: 2.0, points: 15, label: 'Levier clinique maîtrisé (≤ 2.0x EBITDA)' },
        { max: 3.2, points: 11, label: 'Levier expansion clinique normale (2.0x à 3.2x)' },
        { max: 4.2, points: 6, label: 'Levier expansion soutenu (3.2x à 4.2x)' },
        { max: 5.0, points: 2, label: 'Levier élevé sous surveillance (4.2x à 5.0x)' },
        { max: Infinity, points: 0, label: 'Levier excessif (> 5.0x EBITDA)' },
      ],
      debtToEquityBands: [
        { max: 0.5, points: 10, label: 'Gearing santé excellent (≤ 50%)' },
        { max: 1.0, points: 8, label: 'Gearing santé équilibré (50% à 100%)' },
        { max: 1.5, points: 5, label: 'Gearing développement (100% à 150%)' },
        { max: 2.0, points: 2, label: 'Gearing élevé (150% à 200%)' },
        { max: Infinity, points: 0, label: 'Gearing critique (> 200%)' },
      ],
    },
    cashFlow: {
      ...DEFAULT_THRESHOLDS.cashFlow,
      fcfQualityBands: {
        positiveFcfPoints: 10,
        capexExceedsOcfPoints: 6, // Tolérance accrue pour investissements d'expansion médicale
        negativeOcfPoints: 0,
      },
    },
  },
  'Télécommunications': {
    // Opérateurs télécoms matures (ex: Maroc Telecom) : forte génération de trésorerie, marges élevées
    profitability: {
      ...DEFAULT_THRESHOLDS.profitability,
      operatingMarginBands: [
        { min: 30.0, points: 5, label: 'Marge opérationnelle télécom élevée (> 30%)' },
        { min: 20.0, points: 4, label: 'Marge opérationnelle solide (20% à 30%)' },
        { min: 10.0, points: 2.5, label: 'Marge télécom modérée (10% à 20%)' },
        { min: 0.0, points: 1, label: 'Marge télécom faible (0% à 10%)' },
        { min: -Infinity, points: 0, label: 'Marge critique (< 0%)' },
      ],
    },
  },
  'Biens de consommation & agroalimentaire': {
    // Volume important, marges plus resserrées
    profitability: {
      ...DEFAULT_THRESHOLDS.profitability,
      netMarginBands: [
        { min: 10.0, points: 10, label: 'Marge agroalimentaire très forte (> 10%)' },
        { min: 6.0, points: 8, label: 'Marge saine (6% à 10%)' },
        { min: 3.0, points: 5, label: 'Marge normale (3% à 6%)' },
        { min: 1.0, points: 2.5, label: 'Marge mince (1% à 3%)' },
        { min: -Infinity, points: 0, label: 'Marge déficitaire (< 1%)' },
      ],
    },
  },
};

/**
 * Récupère les seuils adaptés au secteur sélectionné
 */
export function getSectorThresholds(sector: string): {
  thresholds: SectorThresholds;
  isCustomCalibrated: boolean;
} {
  const custom = SECTOR_CUSTOM_THRESHOLDS[sector];
  if (custom) {
    return {
      thresholds: {
        growth: custom.growth || DEFAULT_THRESHOLDS.growth,
        profitability: custom.profitability || DEFAULT_THRESHOLDS.profitability,
        debt: custom.debt || DEFAULT_THRESHOLDS.debt,
        cashFlow: custom.cashFlow || DEFAULT_THRESHOLDS.cashFlow,
      },
      isCustomCalibrated: true,
    };
  }

  return {
    thresholds: DEFAULT_THRESHOLDS,
    isCustomCalibrated: false,
  };
}

/**
 * Seuils déterministes pour le Score d'Achat du Mois (Buy This Month Score)
 * Pondération totale = 100 points :
 * - Qualité fondamentale de l'entreprise : 40 points
 * - Valorisation & Marge de sécurité : 40 points
 * - Rendement projeté à 4 ans & Point d'entrée cyclique (52 sem.) : 20 points
 */
export const BUY_MONTH_THRESHOLDS = {
  maxQualityPoints: 40,
  maxValuationPoints: 40,
  maxTimingReturnPoints: 20,

  valuationBands: {
    fullSafetyMarginPoints: 40, // Cours <= Prix Cible (décote >= marge souhaitée)
    moderateDiscountPoints: 30, // Décote positive significative (ex: 10% à 20%)
    fairValueRangePoints: 20, // Cours proche de la juste valeur (0% à 10% de décote)
    slightPremiumPoints: 10, // Légère surcote (0% à 10% au-dessus de la juste valeur)
    moderatePremiumPoints: 5, // Surcote modérée (10% à 25% au-dessus)
    severeOvervaluationPoints: 0, // Forte surcote (> 25% au-dessus)
  },

  projectedReturnBands: [
    { min: 15.0, points: 10, label: 'Rendement annuel projeté supérieur (≥ 15%/an)' },
    { min: 10.0, points: 8, label: 'Rendement annuel attractif (10% à 15%/an)' },
    { min: 6.0, points: 5, label: 'Rendement modéré (6% à 10%/an)' },
    { min: 0.0, points: 2, label: 'Rendement faible (0% à 6%/an)' },
    { min: -Infinity, points: 0, label: 'Rendement projeté nul ou négatif' },
  ],

  price52wPositionBands: [
    { max: 30.0, points: 10, label: 'Zone d’entrée favorable (quartile inférieur du range 52 sem.)' },
    { max: 55.0, points: 7.5, label: 'Zone médiane basse (30% à 55% du range)' },
    { max: 75.0, points: 4, label: 'Zone médiane haute (55% à 75% du range)' },
    { max: Infinity, points: 1, label: 'Proche du plus haut 52 sem. (> 75% du range, risque de sommet)' },
  ],
};

