export interface FieldTooltip {
  title: string;
  description: string;
  example: string;
}

export const TOOLTIPS: Record<string, FieldTooltip> = {
  // Informations sur l'action
  currentPrice: {
    title: "Prix actuel de l'action",
    description: "Le cours de bourse le plus récent négocié sur la Bourse de Casablanca.",
    example: "Exemple : L'action Akdital s'échange actuellement à 720 MAD.",
  },
  price52wLow: {
    title: "Prix le plus bas sur 52 semaines",
    description: "Le cours plancher atteint par le titre au cours des 52 dernières semaines d'échange.",
    example: "Exemple : Si le cours le plus bas en un an était de 490 MAD, cela sert de repère de valorisation historique.",
  },
  price52wHigh: {
    title: "Prix le plus haut sur 52 semaines",
    description: "Le cours plafond atteint par le titre au cours des 52 dernières semaines.",
    example: "Exemple : Si le titre a culminé à 750 MAD, le cours actuel est proche de son sommet annuel.",
  },
  eps: {
    title: "BPA — Bénéfice Net Par Action (EPS)",
    description: "La part du résultat net qui revient à chaque action ordinaire émise par la société.",
    example: "Exemple : Si une entreprise réalise un bénéfice de 100 millions MAD avec 10 millions d'actions, BPA = 10 MAD par action.",
  },
  peRatio: {
    title: "PER — Price Earnings Ratio",
    description: "Le multiple de cours sur bénéfice. Indique combien d'années de bénéfice l'investisseur paye pour acheter l'action.",
    example: "Exemple : Pour un cours de 720 MAD et un BPA de 24 MAD, le PER = 720 / 24 = 30x.",
  },
  pbRatio: {
    title: "PBR — Price to Book Ratio",
    description: "Le ratio entre le cours de bourse et la valeur comptable des capitaux propres par action.",
    example: "Exemple : Si les capitaux propres par action sont de 180 MAD et le cours est à 720 MAD, le PBR = 4,0x.",
  },
  sharesOutstanding: {
    title: "Nombre d'actions en circulation",
    description: "Le nombre total de titres formant le capital social de la société.",
    example: "Exemple : Akdital compte environ 4 330 000 actions ordinaires cotées.",
  },
  dividendPerShare: {
    title: "Dividende par action (DPS)",
    description: "Le montant du dividende annuel brut distribué aux actionnaires par titre détenu.",
    example: "Exemple : Un dividende proposé de 12 MAD pour une action à 600 MAD représente un rendement brut de 2 %.",
  },
  priceObservationDate: {
    title: "Date du prix observé",
    description: "La date à laquelle vous avez relevé la cote boursière pour figer votre analyse.",
    example: "Exemple : Relevé de clôture au 12 octobre 2024.",
  },

  // Croissance
  revenue: {
    title: "Chiffre d'affaires",
    description: "Le total des ventes de biens et prestations de services réalisées sur l'exercice comptable.",
    example: "Exemple : Un groupe hospitalier réalise 1 900 millions MAD de chiffre d'affaires consolidé en 2023.",
  },
  netProfit: {
    title: "Résultat net global",
    description: "Le bénéfice ou la perte après déduction de toutes les charges, amortissements, impôts et intérêts.",
    example: "Exemple : Un résultat net total de 210 millions MAD.",
  },
  netProfitGroupShare: {
    title: "Résultat net part du groupe (RNPG)",
    description: "La quote-part du bénéfice net consolidé revenant spécifiquement aux actionnaires de la société mère (hors minoritaires).",
    example: "Exemple : Sur 210 millions MAD de résultat net global, 198 millions MAD reviennent aux actionnaires de la société mère.",
  },

  // Rentabilité
  operatingProfit: {
    title: "Résultat d'exploitation (EBIT)",
    description: "Le résultat économique généré directement par les activités opérationnelles, avant charges financières et impôts.",
    example: "Exemple : Sur 1 000 millions MAD de ventes et 750 millions MAD de charges opérationnelles, le résultat d'exploitation est de 250 millions MAD.",
  },
  ebitda: {
    title: "EBITDA — Excédent Brut d'Exploitation",
    description: "Le flux opérationnel avant dotations aux amortissements et provisions, intérêts et impôts.",
    example: "Exemple : Un EBITDA de 550 millions MAD illustre la capacité brute de l'entreprise à dégager du cash opérationnel.",
  },
  equity: {
    title: "Capitaux propres totaux",
    description: "La valeur comptable nette des actifs appartenant aux actionnaires (capital, réserves et résultat).",
    example: "Exemple : Des capitaux propres totaux de 1 200 millions MAD au bilan consolidé.",
  },
  equityGroupShare: {
    title: "Capitaux propres part du groupe",
    description: "Les fonds propres revenant spécifiquement aux actionnaires de la société tête de groupe.",
    example: "Exemple : 1 150 millions MAD après déduction des intérêts minoritaires.",
  },
  roe: {
    title: "ROE — Rentabilité des capitaux propres",
    description: "Le ratio mesurant le rendement généré pour les actionnaires (Résultat net / Capitaux propres).",
    example: "Exemple : 180 millions MAD de RNPG pour 1 200 millions MAD de capitaux propres donne un ROE de 15 %.",
  },
  operatingMargin: {
    title: "Marge opérationnelle (%)",
    description: "Le pourcentage du chiffre d'affaires transformé en résultat d'exploitation (EBIT / Chiffre d'affaires).",
    example: "Exemple : Un résultat d'exploitation de 200 millions MAD sur 1 000 millions MAD de chiffre d'affaires équivaut à 20 %.",
  },
  netMargin: {
    title: "Marge nette (%)",
    description: "Le pourcentage du chiffre d'affaires transformé en bénéfice net final.",
    example: "Exemple : 120 millions MAD de résultat net sur 1 000 millions MAD de chiffre d'affaires donne une marge nette de 12 %.",
  },

  // Endettement
  totalFinancialDebt: {
    title: "Dettes financières totales",
    description: "L'ensemble des dettes bancaires, emprunts obligataires et concours bancaires à court et long terme.",
    example: "Exemple : 1 400 millions MAD de dettes bancaires et obligataires consolidées.",
  },
  interestBearingDebt: {
    title: "Dettes portant intérêt",
    description: "La fraction des dettes financières sur lesquelles courent des intérêts ou agios (crucial pour le ratio Shariah).",
    example: "Exemple : Emprunts à taux fixe ou variable totalisant 1 350 millions MAD.",
  },
  cashAndEquivalents: {
    title: "Trésorerie et équivalents de trésorerie",
    description: "Les liquidités disponibles en banque et placements à court terme très liquides.",
    example: "Exemple : 320 millions MAD disponibles immédiatement en comptes bancaires et SICAV.",
  },
  netDebt: {
    title: "Endettement net",
    description: "Dettes financières totales moins la trésorerie disponible. Indique l'endettement réel restant à couvrir.",
    example: "Exemple : Dettes 1 400 M MAD - Trésorerie 320 M MAD = Endettement net de 1 080 millions MAD.",
  },
  interestExpense: {
    title: "Charges d'intérêts financières",
    description: "Le montant annuel des intérêts décaissés pour rémunérer la dette financière.",
    example: "Exemple : 65 millions MAD de frais financiers payés aux banques et obligataires sur l'année.",
  },
  totalAssets: {
    title: "Total de l'actif",
    description: "La somme de tous les actifs de l'entreprise (immobilisations corporelles, stocks, créances, trésorerie).",
    example: "Exemple : Un bilan totalisant 4 500 millions MAD d'actifs.",
  },

  // Flux de trésorerie
  operatingCashFlow: {
    title: "Flux de trésorerie opérationnel (Cash-flow d'exploitation)",
    description: "L'argent liquide effectivement généré par les ventes et opérations courantes après variation du BFR.",
    example: "Exemple : 480 millions MAD encaissés grâce à l'exploitation courante.",
  },
  capex: {
    title: "Investissements matériels et immatériels (CapEx)",
    description: "Les dépenses d'investissement en nouvelles cliniques, équipements ou modernisation industrielle.",
    example: "Exemple : 350 millions MAD engagés pour construire de nouvelles infrastructures médicales.",
  },
  freeCashFlow: {
    title: "Free Cash Flow (Flux de trésorerie disponible)",
    description: "Le cash restant après couverture des investissements nécessaires au maintien et développement de l'activité (Cash opérationnel - CapEx).",
    example: "Exemple : 480 M MAD - 350 M MAD = 130 millions MAD de cash libre.",
  },

  // Valorisation
  expectedEarningsGrowth: {
    title: "Croissance annuelle attendue des bénéfices (%)",
    description: "Votre estimation prudente du taux annuel composé de progression des bénéfices sur l'horizon d'investissement.",
    example: "Exemple : Prévoir +12 % de croissance annuelle des bénéfices sur les 4 prochaines années.",
  },
  futurePeRatio: {
    title: "PER futur estimé",
    description: "Le multiple de bénéfice que vous jugez raisonnable pour valoriser l'action au terme de votre horizon (sortie).",
    example: "Exemple : Anticiper un PER de 20x à horizon 4 ans si la croissance se stabilise.",
  },
  requiredReturnRate: {
    title: "Rendement annuel exigé (%)",
    description: "Le taux de rentabilité annuel minimum que vous exigez compte tenu du risque action au Maroc (coût d'opportunité).",
    example: "Exemple : 10 % par an pour surperformer le taux sans risque des bons du trésor marocain.",
  },
  manualFairValue: {
    title: "Fair Value estimée manuellement (MAD)",
    description: "La juste valeur intrinsèque issue d'une note de recherche externe de broker ou de vos propres calculs hors outil.",
    example: "Exemple : Un rapport d'analyste fixe l'objectif de cours fondamental à 780 MAD.",
  },
  desiredMarginOfSafety: {
    title: "Marge de sécurité souhaitée (%)",
    description: "La décote minimale exigée par rapport à la juste valeur pour vous protéger contre les aléas et erreurs d'estimation.",
    example: "Exemple : Une marge de 20 % signifie que pour une Fair Value de 800 MAD, vous n'achetez pas au-dessus de 640 MAD.",
  },
  investmentHorizonYears: {
    title: "Horizon d'investissement (Années)",
    description: "La durée de conservation visée pour votre investissement en Bourse de Casablanca.",
    example: "Exemple : Un horizon de 4 ans correspond à une stratégie d'investissement fondamental patrimonial.",
  },

  // Shariah
  businessActivity: {
    title: "Activité principale de l'entreprise",
    description: "La nature économique du métier (doit être exempte d'activités non éthiques telles que banques conventionnelles, alcool, jeux, etc.).",
    example: "Exemple : Santé et soins hospitaliers privés (activité licite).",
  },
  methodology: {
    title: "Méthodologie de screening Shariah",
    description: "Le standard de conformité islamique sélectionné pour tester les ratios financiers (ex : AAOIFI, FTSE, MSCI).",
    example: "Exemple : La norme AAOIFI fixe généralement des seuils stricts sur la dette portant intérêt (< 30% ou 33%).",
  },
  shariahInterestBearingDebt: {
    title: "Dettes portant intérêt (Critère Shariah)",
    description: "Total des passifs financiers rémunérés par un intérêt (Riba), comparé aux actifs ou à la capitalisation boursière.",
    example: "Exemple : 1 200 millions MAD de dettes bancaires conventionnelles.",
  },
  interestIncome: {
    title: "Revenus d'intérêts reçus",
    description: "Les intérêts perçus sur dépôts bancaires ou obligations conventionnelles.",
    example: "Exemple : 1,5 million MAD d'intérêts créditeurs sur excédents de trésorerie.",
  },
  nonPermissibleIncome: {
    title: "Autres revenus non conformes",
    description: "Tout revenu accessoire dérivé d'activités illicites au regard des principes islamiques.",
    example: "Exemple : Revenus de pénalités de retard ou activités prohibées.",
  },
  totalRevenue: {
    title: "Total des revenus (Chiffre d'affaires total)",
    description: "Le dénominateur utilisé pour vérifier que les revenus impurs ne dépassent pas 5 % de l'activité.",
    example: "Exemple : 2 000 millions MAD de chiffre d'affaires consolidé.",
  },
  cashAndInterestSecurities: {
    title: "Trésorerie et placements rémunérés",
    description: "Comptes rémunérés et valeurs mobilières de placement portant intérêt.",
    example: "Exemple : 250 millions MAD placés sur des comptes à terme conventionnels.",
  },
  receivables: {
    title: "Créances clients et comptes rattachés",
    description: "Les créances d'exploitation pour le test de liquidité / ratio d'illiquidité de certains standards.",
    example: "Exemple : 450 millions MAD de créances clients au bilan.",
  },
  shariahTotalAssets: {
    title: "Total de l'actif (Base de screening)",
    description: "Le total du bilan utilisé comme dénominateur par des méthodologies comme l'AAOIFI.",
    example: "Exemple : 4 500 millions MAD d'actif total au bilan.",
  },
  marketCap: {
    title: "Capitalisation boursière",
    description: "Le cours de l'action multiplié par le nombre total d'actions (dénominateur utilisé par MSCI ou S&P).",
    example: "Exemple : 720 MAD * 4 330 000 actions = 3 117,6 millions MAD.",
  },
};
