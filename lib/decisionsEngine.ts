export type DecisionType =
  | 'BUY_CANDIDATE'
  | 'BUY_MORE_CANDIDATE'
  | 'HOLD'
  | 'WAIT'
  | 'REVIEW_REDUCE'
  | 'REVIEW_SELL'
  | 'SHARIAH_REVIEW_REQUIRED'
  | 'SHARIAH_NON_COMPLIANT'
  | 'INSUFFICIENT_DATA';

export interface DecisionEvaluationCriteria {
  minQualityScore: number; // default 60
  minBuyMonthScore: number; // default 65
  minDataReliabilityScore: number; // default 70
  requiredMarginOfSafetyPercent: number; // default 15
  maxCompanyAllocationPercent: number; // default 25
  maxSectorDeviationPercent: number; // default 15
  stalePriceDays: number; // default 90
}

export const DEFAULT_DECISION_CRITERIA: DecisionEvaluationCriteria = {
  minQualityScore: 60,
  minBuyMonthScore: 65,
  minDataReliabilityScore: 70,
  requiredMarginOfSafetyPercent: 15,
  maxCompanyAllocationPercent: 25,
  maxSectorDeviationPercent: 15,
  stalePriceDays: 90,
};

export interface CompanyDecisionResult {
  ticker: string;
  companyName: string;
  sector: string;
  currentPrice: number;
  priceObservationDate: string;
  isPriceStale: boolean;
  fairValue: number;
  targetBuyPrice: number;
  discountToFairValuePercent: number;
  qualityScore: number;
  buyMonthScore: number;
  dataReliabilityScore: number;
  shariahStatus: string;
  shariahVerdict: string;
  isOwned: boolean;
  sharesOwned: number;
  holdingWeightPercent: number;
  averageCostPrice: number;
  unrealizedGainMAD: number;
  unrealizedGainPercent: number;
  decision: DecisionType;
  decisionLabel: string;
  decisionBadgeColor: string;
  headline: string;
  reasons: string[];
  positivePoints: string[];
  riskWarnings: string[];
  actionGuidance: string;
  rank?: number;
}

export interface MonthlyPurchaseSuggestion {
  ticker: string;
  companyName: string;
  sector: string;
  recommendedShares: number;
  pricePerShare: number;
  totalCost: number;
  estimatedFees: number;
  totalOutflow: number;
  whySelected: string;
  diversificationBenefit: string;
  remainingRisks: string;
}

export interface MonthlyDecisionReport {
  evaluationDate: string;
  timeHorizon: {
    totalYears: number;
    startDate: string;
    targetEndDate: string;
    monthsRemaining: number;
    mandatoryWithdrawal: boolean;
    isApproachingWithdrawalWarning: boolean;
    horizonNote: string;
  };
  portfolioSummary: {
    totalPortfolioValue: number;
    availableCash: number;
    stockMarketValue: number;
    investedCapital: number;
    unrealizedGainMAD: number;
    unrealizedGainPercent: number;
  };
  buyCandidates: CompanyDecisionResult[];
  buyMoreCandidates: CompanyDecisionResult[];
  holdingsReview: CompanyDecisionResult[];
  waitList: CompanyDecisionResult[];
  blockedOrIneligible: CompanyDecisionResult[];
  suggestedPurchases: MonthlyPurchaseSuggestion[];
  suggestedAllocationSummary: {
    totalAllocatedCost: number;
    remainingCash: number;
    allocatedCount: number;
  };
}

export interface InputPortfolioHolding {
  ticker: string;
  companyName: string;
  sector: string;
  sharesOwned: number;
  totalInvested: number;
  averageCostPrice: number;
  currentStockPrice: number;
  currentMarketValue: number;
  unrealizedGainMAD: number;
  unrealizedGainPercent: number;
}

export interface InputSectorAllocation {
  sector: string;
  targetPercent: number;
  currentMarketValue: number;
  currentPercent: number;
  differencePercent: number;
}

export interface InputPortfolioData {
  summary: {
    stockMarketValue: number;
    availableCash: number;
    totalPortfolioValue: number;
    investedCapital: number;
    unrealizedGainMAD: number;
    unrealizedGainPercent: number;
  };
  holdings: InputPortfolioHolding[];
  sectorAllocations: InputSectorAllocation[];
}

export function evaluateMonthlyDecisionsEngine(
  customCriteria?: Partial<DecisionEvaluationCriteria>,
  clientSavedCompanies: any[] = [],
  portfolioInput?: Partial<InputPortfolioData>
): MonthlyDecisionReport {
  const criteria: DecisionEvaluationCriteria = {
    ...DEFAULT_DECISION_CRITERIA,
    ...customCriteria,
  };

  // 1. Portefeuille par défaut si non fourni
  const defaultPortfolio: InputPortfolioData = {
    summary: {
      stockMarketValue: 6500,
      availableCash: 4200,
      totalPortfolioValue: 10700,
      investedCapital: 6000,
      unrealizedGainMAD: 500,
      unrealizedGainPercent: 8.33,
    },
    holdings: [
      {
        ticker: 'AKT',
        companyName: 'Akdital',
        sector: 'Santé & pharmacie',
        sharesOwned: 6,
        totalInvested: 6000,
        averageCostPrice: 1000,
        currentStockPrice: 1083.33,
        currentMarketValue: 6500,
        unrealizedGainMAD: 500,
        unrealizedGainPercent: 8.33,
      },
    ],
    sectorAllocations: [
      { sector: 'Santé & pharmacie', targetPercent: 15, currentMarketValue: 6500, currentPercent: 60.7, differencePercent: 45.7 },
      { sector: 'Biens de consommation & agroalimentaire', targetPercent: 20, currentMarketValue: 0, currentPercent: 0, differencePercent: -20 },
      { sector: 'Télécommunications', targetPercent: 15, currentMarketValue: 0, currentPercent: 0, differencePercent: -15 },
      { sector: 'Mines & métaux', targetPercent: 15, currentMarketValue: 0, currentPercent: 0, differencePercent: -15 },
      { sector: 'Ports & logistique', targetPercent: 10, currentMarketValue: 0, currentPercent: 0, differencePercent: -10 },
      { sector: 'Construction & matériaux', targetPercent: 10, currentMarketValue: 0, currentPercent: 0, differencePercent: -10 },
      { sector: 'Énergie', targetPercent: 10, currentMarketValue: 0, currentPercent: 0, differencePercent: -10 },
      { sector: 'Technologie', targetPercent: 5, currentMarketValue: 0, currentPercent: 0, differencePercent: -5 },
    ],
  };

  const portfolio: InputPortfolioData = {
    summary: {
      ...defaultPortfolio.summary,
      ...(portfolioInput?.summary || {}),
    },
    holdings: portfolioInput?.holdings || defaultPortfolio.holdings,
    sectorAllocations: portfolioInput?.sectorAllocations || defaultPortfolio.sectorAllocations,
  };

  const availableCash = portfolio.summary.availableCash;
  const totalPortfolioValue = portfolio.summary.totalPortfolioValue;

  // 2. Horizon temporel (4 ans)
  const startDate = '2024-01-01';
  const targetEndDate = '2028-01-01';
  const now = new Date();
  const end = new Date(targetEndDate);
  const monthsRemaining = Math.max(0, Math.round((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30.4)));
  const isApproachingWithdrawalWarning = monthsRemaining <= 18;
  const horizonNote = isApproachingWithdrawalWarning
    ? `Alerte horizon : Il reste ${monthsRemaining} mois avant la date cible de retrait (4 ans). Il est recommandé de consolider les plus-values et de limiter les nouvelles prises de risque en actions.`
    : `Horizon long terme actif : ${monthsRemaining} mois restants sur l’objectif de 4 ans. Les fluctuations mensuelles peuvent être exploitées sereinement.`;

  // 3. Charger et normaliser la liste des entreprises
  const defaultCompanies = [
    {
      ticker: 'AKT',
      companyName: 'Akdital',
      sector: 'Santé & pharmacie',
      currentPrice: 1050,
      priceObservationDate: new Date().toISOString().split('T')[0],
      estimatedFairValue: 1250,
      targetBuyPrice: 1062.5,
      qualityScore: 78,
      buyMonthScore: 72,
      dataReliabilityScore: 85,
      shariahVerdict: 'PASSED',
      shariahStatus: 'Conforme',
    },
    {
      ticker: 'LBV',
      companyName: 'LabelVie',
      sector: 'Biens de consommation & agroalimentaire',
      currentPrice: 4200,
      priceObservationDate: new Date().toISOString().split('T')[0],
      estimatedFairValue: 4900,
      targetBuyPrice: 4165,
      qualityScore: 82,
      buyMonthScore: 76,
      dataReliabilityScore: 88,
      shariahVerdict: 'PASSED',
      shariahStatus: 'Conforme',
    },
    {
      ticker: 'MNG',
      companyName: 'Managem',
      sector: 'Mines & métaux',
      currentPrice: 2100,
      priceObservationDate: new Date().toISOString().split('T')[0],
      estimatedFairValue: 2600,
      targetBuyPrice: 2210,
      qualityScore: 80,
      buyMonthScore: 79,
      dataReliabilityScore: 82,
      shariahVerdict: 'PASSED',
      shariahStatus: 'Conforme',
    },
    {
      ticker: 'IAM',
      companyName: 'Maroc Telecom',
      sector: 'Télécommunications',
      currentPrice: 94,
      priceObservationDate: new Date().toISOString().split('T')[0],
      estimatedFairValue: 110,
      targetBuyPrice: 93.5,
      qualityScore: 71,
      buyMonthScore: 68,
      dataReliabilityScore: 90,
      shariahVerdict: 'PASSED',
      shariahStatus: 'Conforme',
    },
    {
      ticker: 'ATW',
      companyName: 'Attijariwafa Bank',
      sector: 'Banque conventionnelle',
      currentPrice: 510,
      priceObservationDate: new Date().toISOString().split('T')[0],
      estimatedFairValue: 560,
      targetBuyPrice: 476,
      qualityScore: 85,
      buyMonthScore: 75,
      dataReliabilityScore: 95,
      shariahVerdict: 'FAILED',
      shariahStatus: 'Non conforme',
    },
  ];

  const companiesToEvaluate = new Map<string, any>();
  for (const dc of defaultCompanies) {
    companiesToEvaluate.set(dc.ticker.toUpperCase(), dc);
  }

  if (Array.isArray(clientSavedCompanies)) {
    for (const sc of clientSavedCompanies) {
      if (!sc.ticker) continue;
      const t = sc.ticker.toUpperCase();
      companiesToEvaluate.set(t, {
        ticker: t,
        companyName: sc.companyName || t,
        sector: sc.sector || 'Autre',
        currentPrice: Number(sc.currentPrice) || 100,
        priceObservationDate: sc.priceObservationDate || new Date().toISOString().split('T')[0],
        estimatedFairValue: Number(sc.estimatedFairValue) || Number(sc.currentPrice) * 1.1,
        targetBuyPrice: Number(sc.targetBuyPrice) || Number(sc.currentPrice) * 0.9,
        qualityScore: Number(sc.qualityScore) || 50,
        buyMonthScore: Number(sc.buyMonthScore) || 50,
        dataReliabilityScore: Number(sc.dataReliabilityScore) || 75,
        shariahVerdict: sc.shariahVerdict || 'PASSED',
        shariahStatus: sc.shariahStatus || 'Conforme',
      });
    }
  }

  // 4. Évaluer chaque entreprise
  const evaluatedResults: CompanyDecisionResult[] = [];
  const holdingsMap = new Map(portfolio.holdings.map((h) => [h.ticker.toUpperCase(), h]));
  const nowTimestamp = Date.now();

  for (const comp of companiesToEvaluate.values()) {
    const ticker = comp.ticker;
    const holding = holdingsMap.get(ticker);
    const isOwned = Boolean(holding && holding.sharesOwned > 0);
    const sharesOwned = holding ? holding.sharesOwned : 0;
    const holdingMarketVal = holding ? holding.currentMarketValue : 0;
    const holdingWeight = totalPortfolioValue > 0 ? (holdingMarketVal / totalPortfolioValue) * 100 : 0;

    const priceDate = new Date(comp.priceObservationDate);
    const daysSincePrice = Math.round((nowTimestamp - priceDate.getTime()) / (1000 * 60 * 60 * 24));
    const isPriceStale = daysSincePrice > criteria.stalePriceDays;

    const currentPrice = comp.currentPrice;
    const fairValue = comp.estimatedFairValue;
    const targetBuyPrice = comp.targetBuyPrice;
    const discountToFairValue = fairValue > 0 ? ((fairValue - currentPrice) / fairValue) * 100 : 0;

    const reasons: string[] = [];
    const positivePoints: string[] = [];
    const riskWarnings: string[] = [];
    let decision: DecisionType = 'INSUFFICIENT_DATA';
    let decisionLabel = 'Données insuffisantes';
    let decisionBadgeColor = 'bg-slate-100 text-slate-700';
    let headline = '';
    let actionGuidance = '';

    if (comp.qualityScore >= 70) positivePoints.push(`Solidité fondamentale élevée (${comp.qualityScore}/100)`);
    if (discountToFairValue >= 10) positivePoints.push(`Décote intéressante de ${discountToFairValue.toFixed(1)}% sous la juste valeur`);
    if (comp.shariahVerdict === 'PASSED') positivePoints.push('Conformité Shariah validée');

    if (discountToFairValue < -10) riskWarnings.push(`Surcote de ${Math.abs(discountToFairValue).toFixed(1)}% par rapport à la juste valeur`);
    if (comp.qualityScore < 50) riskWarnings.push(`Faiblesse fondamentale (${comp.qualityScore}/100)`);
    if (isPriceStale) riskWarnings.push(`Cours non actualisé depuis ${daysSincePrice} jours`);
    if (holdingWeight >= criteria.maxCompanyAllocationPercent) riskWarnings.push(`Concentration élevée (${holdingWeight.toFixed(1)}% du portefeuille)`);

    // Gating Shariah
    if (comp.shariahVerdict === 'FAILED') {
      decision = 'SHARIAH_NON_COMPLIANT';
      decisionLabel = 'Non conforme Shariah';
      decisionBadgeColor = 'bg-rose-100 text-rose-800';
      headline = 'Exclu de l’univers d’investissement islamique.';
      reasons.push('L’entreprise a échoué aux critères de filtrage éthique et financier Shariah.');
      actionGuidance = isOwned
        ? 'Position existante à réviser sous l’angle de la conformité éthique (aucun renforcement autorisé).'
        : 'Achat interdit sous la méthodologie éthique sélectionnée.';
    } else if (comp.shariahVerdict === 'REVIEW_REQUIRED') {
      decision = 'SHARIAH_REVIEW_REQUIRED';
      decisionLabel = 'Revue Shariah requise';
      decisionBadgeColor = 'bg-amber-100 text-amber-800';
      headline = 'La conformité éthique nécessite confirmation.';
      reasons.push('Des données de filtrage Shariah (dettes/revenus d’intérêts) sont en attente de vérification.');
      actionGuidance = 'Confirmez les informations Shariah avant d’envisager un nouvel investissement.';
    } else if (isPriceStale || comp.dataReliabilityScore < criteria.minDataReliabilityScore) {
      decision = 'INSUFFICIENT_DATA';
      decisionLabel = 'Données à actualiser';
      decisionBadgeColor = 'bg-slate-100 text-slate-800';
      headline = 'Données de cours ou financières insuffisantes pour une décision fiable.';
      reasons.push(`Le cours date de ${daysSincePrice} jours (seuil: ${criteria.stalePriceDays} jours) ou la fiabilité est incomplète.`);
      actionGuidance = 'Mettez à jour le cours de bourse ou complétez le rapport financier.';
    } else {
      if (isOwned) {
        if (comp.qualityScore < 45) {
          decision = 'REVIEW_SELL';
          decisionLabel = 'Revue pour vente / coupure';
          decisionBadgeColor = 'bg-rose-100 text-rose-800';
          headline = 'Détérioration fondamentale sévère de l’entreprise.';
          reasons.push(
            `Le score de qualité est tombé à ${comp.qualityScore}/100, signalant une détérioration matérielle des fondamentaux.`
          );
          actionGuidance = 'Évaluez une vente ou une réduction immédiate pour protéger votre capital investi.';
        } else if (
          holdingWeight > criteria.maxCompanyAllocationPercent ||
          discountToFairValue < -30 ||
          (isApproachingWithdrawalWarning && holdingWeight > criteria.maxCompanyAllocationPercent)
        ) {
          decision = 'REVIEW_REDUCE';
          decisionLabel = 'Revue d’allègement partiel';
          decisionBadgeColor = 'bg-orange-100 text-orange-800';
          headline = 'Position trop concentrée ou surcotée par rapport à sa juste valeur.';
          if (holdingWeight > criteria.maxCompanyAllocationPercent) {
            reasons.push(
              `La position représente ${holdingWeight.toFixed(1)}% du portefeuille (plafond prudent: ${criteria.maxCompanyAllocationPercent}%).`
            );
          }
          if (discountToFairValue < -30) {
            reasons.push(`Le titre cote à +${Math.abs(discountToFairValue).toFixed(1)}% au-dessus de sa juste valeur.`);
          }
          if (isApproachingWithdrawalWarning && holdingWeight > criteria.maxCompanyAllocationPercent) {
            reasons.push(`Approche de l’échéance de retrait (${monthsRemaining} mois restants) nécessitant une sécurisation graduelle.`);
          }
          actionGuidance = 'Envisagez de prendre des bénéfices partiels pour rééquilibrer votre diversification.';
        } else if (
          comp.qualityScore >= criteria.minQualityScore &&
          comp.buyMonthScore >= criteria.minBuyMonthScore &&
          currentPrice <= targetBuyPrice &&
          holdingWeight < criteria.maxCompanyAllocationPercent - 5
        ) {
          decision = 'BUY_MORE_CANDIDATE';
          decisionLabel = 'Opportunité de renforcement';
          decisionBadgeColor = 'bg-emerald-100 text-emerald-800';
          headline = 'Fondamentaux robustes, valorisation attrayante et marge de sécurité respectée.';
          reasons.push(`Score de qualité de ${comp.qualityScore}/100 et score d'achat de ${comp.buyMonthScore}/100.`);
          reasons.push(`Le cours (${currentPrice} MAD) est inférieur au prix cible d’achat (${targetBuyPrice.toFixed(2)} MAD).`);
          actionGuidance = 'Candidat favorable pour acquérir des actions supplémentaires ce mois-ci.';
        } else {
          decision = 'HOLD';
          decisionLabel = 'Conserver la position';
          decisionBadgeColor = 'bg-blue-100 text-blue-800';
          headline = 'Entreprise saine à conserver en portefeuille long terme.';
          reasons.push(`La qualité de l’entreprise (${comp.qualityScore}/100) soutient la thèse d’investissement.`);
          if (currentPrice > targetBuyPrice) {
            reasons.push('Le cours actuel n’offre pas de marge suffisante pour renforcer ce mois-ci, mais justifie pleinement la conservation.');
          }
          actionGuidance = 'Conservez vos actions sans renforcement ce mois-ci.';
        }
      } else {
        const isAttractivelyValued = currentPrice <= targetBuyPrice || discountToFairValue >= 5;
        const isQualitySufficient = comp.qualityScore >= criteria.minQualityScore;
        const isBuyScoreSufficient = comp.buyMonthScore >= criteria.minBuyMonthScore;

        if (isQualitySufficient && isBuyScoreSufficient && isAttractivelyValued) {
          decision = 'BUY_CANDIDATE';
          decisionLabel = 'Candidat à l’achat';
          decisionBadgeColor = 'bg-emerald-100 text-emerald-800';
          headline = 'Entreprise de qualité à prix attractif avec marge de sécurité.';
          reasons.push(`Solidité fondamentale confirmée : Score de qualité ${comp.qualityScore}/100.`);
          reasons.push(`Score d'achat ce mois-ci élevé : ${comp.buyMonthScore}/100.`);
          reasons.push(`Décote de ${discountToFairValue.toFixed(1)}% par rapport à la juste valeur estimée (${fairValue.toFixed(2)} MAD).`);
          actionGuidance = 'Candidat prioritaire pour votre investissement mensuel de 4 000 MAD.';
        } else {
          decision = 'WAIT';
          decisionLabel = 'En attente de repli (Wait)';
          decisionBadgeColor = 'bg-amber-100 text-amber-800';
          headline = 'Entreprise intéressante mais cours trop élevé ou marge de sécurité insuffisante.';
          if (discountToFairValue < 0) {
            reasons.push(`Le titre cote ${Math.abs(discountToFairValue).toFixed(1)}% au-dessus de sa juste valeur intrinsèque.`);
          } else {
            reasons.push(`La décote actuelle (${discountToFairValue.toFixed(1)}%) ne satisfait pas la marge de sécurité souhaitée.`);
          }
          actionGuidance = 'Patientez pour un repli de cours avant d’initier une première position.';
        }
      }
    }

    evaluatedResults.push({
      ticker,
      companyName: comp.companyName,
      sector: comp.sector,
      currentPrice,
      priceObservationDate: comp.priceObservationDate,
      isPriceStale,
      fairValue,
      targetBuyPrice,
      discountToFairValuePercent: discountToFairValue,
      qualityScore: comp.qualityScore,
      buyMonthScore: comp.buyMonthScore,
      dataReliabilityScore: comp.dataReliabilityScore,
      shariahStatus: comp.shariahStatus,
      shariahVerdict: comp.shariahVerdict,
      isOwned,
      sharesOwned,
      holdingWeightPercent: holdingWeight,
      averageCostPrice: holding ? holding.averageCostPrice : 0,
      unrealizedGainMAD: holding ? holding.unrealizedGainMAD : 0,
      unrealizedGainPercent: holding ? holding.unrealizedGainPercent : 0,
      decision,
      decisionLabel,
      decisionBadgeColor,
      headline,
      reasons,
      positivePoints,
      riskWarnings,
      actionGuidance,
    });
  }

  // 5. Classement des candidats à l'achat
  const eligibleBuys = evaluatedResults.filter((r) => r.decision === 'BUY_CANDIDATE' || r.decision === 'BUY_MORE_CANDIDATE');
  const sectorWeights = new Map(portfolio.sectorAllocations.map((s) => [s.sector, s.differencePercent]));

  eligibleBuys.sort((a, b) => {
    const aSectorDiff = sectorWeights.get(a.sector) || 0;
    const bSectorDiff = sectorWeights.get(b.sector) || 0;
    const aUnderweightBonus = aSectorDiff < -3 ? 10 : 0;
    const bUnderweightBonus = bSectorDiff < -3 ? 10 : 0;

    const aTotalScore = a.buyMonthScore + a.qualityScore * 0.4 + a.discountToFairValuePercent * 0.5 + aUnderweightBonus;
    const bTotalScore = b.buyMonthScore + b.qualityScore * 0.4 + b.discountToFairValuePercent * 0.5 + bUnderweightBonus;
    return bTotalScore - aTotalScore;
  });

  eligibleBuys.forEach((item, index) => {
    item.rank = index + 1;
  });

  // 6. Suggestions d'achats mensuels avec respect strict des liquidités réelles
  const suggestedPurchases: MonthlyPurchaseSuggestion[] = [];
  let remainingBudget = availableCash;
  let totalAllocated = 0;

  for (const cand of eligibleBuys) {
    if (remainingBudget <= 0) break;
    const price = cand.currentPrice;
    if (price <= 0 || price > remainingBudget) continue;

    const maxSpendForStock = Math.min(remainingBudget, 4000);
    const shares = Math.floor((maxSpendForStock * 0.95) / price);

    if (shares > 0) {
      const rawCost = shares * price;
      const fees = Math.max(10, rawCost * 0.005);
      const totalOutflow = rawCost + fees;

      if (totalOutflow <= remainingBudget) {
        suggestedPurchases.push({
          ticker: cand.ticker,
          companyName: cand.companyName,
          sector: cand.sector,
          recommendedShares: shares,
          pricePerShare: price,
          totalCost: rawCost,
          estimatedFees: fees,
          totalOutflow,
          whySelected: `Rang #${cand.rank} : Score d’achat ${cand.buyMonthScore}/100 et qualité ${cand.qualityScore}/100 avec décote de ${cand.discountToFairValuePercent.toFixed(1)}%.`,
          diversificationBenefit: `Renforce le secteur « ${cand.sector} » tout en respectant l’équilibre global du portefeuille.`,
          remainingRisks: cand.riskWarnings.length > 0 ? cand.riskWarnings[0] : 'Sensibilité aux conditions macroéconomiques générales.',
        });
        remainingBudget -= totalOutflow;
        totalAllocated += totalOutflow;
      }
    }
  }

  const buyCandidates = evaluatedResults.filter((r) => r.decision === 'BUY_CANDIDATE');
  const buyMoreCandidates = evaluatedResults.filter((r) => r.decision === 'BUY_MORE_CANDIDATE');
  const holdingsReview = evaluatedResults.filter((r) => r.isOwned);
  const waitList = evaluatedResults.filter((r) => r.decision === 'WAIT');
  const blockedOrIneligible = evaluatedResults.filter(
    (r) => r.decision === 'SHARIAH_NON_COMPLIANT' || r.decision === 'SHARIAH_REVIEW_REQUIRED' || r.decision === 'INSUFFICIENT_DATA'
  );

  return {
    evaluationDate: new Date().toISOString().split('T')[0],
    timeHorizon: {
      totalYears: 4,
      startDate,
      targetEndDate,
      monthsRemaining,
      mandatoryWithdrawal: true,
      isApproachingWithdrawalWarning,
      horizonNote,
    },
    portfolioSummary: {
      totalPortfolioValue,
      availableCash,
      stockMarketValue: portfolio.summary.stockMarketValue,
      investedCapital: portfolio.summary.investedCapital,
      unrealizedGainMAD: portfolio.summary.unrealizedGainMAD,
      unrealizedGainPercent: portfolio.summary.unrealizedGainPercent,
    },
    buyCandidates,
    buyMoreCandidates,
    holdingsReview,
    waitList,
    blockedOrIneligible,
    suggestedPurchases,
    suggestedAllocationSummary: {
      totalAllocatedCost: totalAllocated,
      remainingCash: remainingBudget,
      allocatedCount: suggestedPurchases.length,
    },
  };
}
