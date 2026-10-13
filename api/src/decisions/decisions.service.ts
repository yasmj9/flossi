import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CompaniesService } from '../companies/companies.service';
import { PortfolioService } from '../portfolio/portfolio.service';

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

export interface DecisionSnapshot {
  id: string;
  portfolioId: string;
  evaluationDate: string;
  reportSummary: any;
  createdAt: string;
}

@Injectable()
export class DecisionsService {
  private snapshotsStore: DecisionSnapshot[] = [];

  constructor(
    private readonly db: DatabaseService,
    private readonly companiesService: CompaniesService,
    private readonly portfolioService: PortfolioService
  ) {}

  async evaluateMonthlyDecisions(customCriteria?: Partial<DecisionEvaluationCriteria>, clientSavedCompanies?: any[]): Promise<MonthlyDecisionReport> {
    const criteria: DecisionEvaluationCriteria = {
      minQualityScore: customCriteria?.minQualityScore ?? 60,
      minBuyMonthScore: customCriteria?.minBuyMonthScore ?? 65,
      minDataReliabilityScore: customCriteria?.minDataReliabilityScore ?? 70,
      requiredMarginOfSafetyPercent: customCriteria?.requiredMarginOfSafetyPercent ?? 15,
      maxCompanyAllocationPercent: customCriteria?.maxCompanyAllocationPercent ?? 25,
      maxSectorDeviationPercent: customCriteria?.maxSectorDeviationPercent ?? 15,
      stalePriceDays: customCriteria?.stalePriceDays ?? 90,
    };

    // 1. Charger le portefeuille actuel
    const portfolio = await this.portfolioService.getPortfolioSummary();
    const availableCash = portfolio.summary.availableCash;
    const totalPortfolioValue = portfolio.summary.totalPortfolioValue;

    // 2. Gestion de l'horizon temporel (4 ans)
    const startDate = '2024-01-01';
    const targetEndDate = '2028-01-01';
    const now = new Date();
    const end = new Date(targetEndDate);
    const monthsRemaining = Math.max(0, Math.round((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30.4)));
    const isApproachingWithdrawalWarning = monthsRemaining <= 18;
    const horizonNote = isApproachingWithdrawalWarning
      ? `Alerte horizon : Il reste ${monthsRemaining} mois avant la date cible de retrait (4 ans). Il est recommandé de consolider les plus-values et de limiter les nouvelles prises de risque en actions.`
      : `Horizon long terme actif : ${monthsRemaining} mois restants sur l’objectif de 4 ans. Les fluctuations mensuelles peuvent être exploitées sereinement.`;

    // 3. Charger les entreprises (de la base ou du client)
    const backendCompanies = await this.companiesService.findAllCompanies();
    const companiesToEvaluate: Map<string, any> = new Map();

    // Remplir d'abord avec les entreprises de la base
    for (const c of backendCompanies) {
      const details = await this.companiesService.findCompanyByTicker(c.ticker);
      const latestPriceObj = details.prices.length > 0 ? details.prices[details.prices.length - 1] : null;
      const latestReport = details.reports.length > 0 ? details.reports[0] : null;

      const currentPrice = latestPriceObj ? latestPriceObj.price : 100;
      const priceDate = latestPriceObj ? latestPriceObj.observationDate : new Date().toISOString().split('T')[0];

      // Estimation prudente des scores si non sauvegardés par le client
      const revenue = latestReport?.financialData?.revenue ?? 1000000000;
      const netProfit = latestReport?.financialData?.netProfit ?? 100000000;
      const debt = latestReport?.financialData?.financialDebt ?? 200000000;
      const estimatedQuality = Math.min(95, Math.max(40, Math.round(50 + (netProfit / revenue) * 150 - (debt / revenue) * 30)));
      const fairVal = currentPrice * 1.15; // Valeur raisonnable par défaut

      companiesToEvaluate.set(c.ticker.toUpperCase(), {
        ticker: c.ticker.toUpperCase(),
        companyName: c.name,
        sector: c.sector,
        currentPrice,
        priceObservationDate: priceDate,
        estimatedFairValue: fairVal,
        targetBuyPrice: fairVal * 0.85,
        qualityScore: estimatedQuality,
        buyMonthScore: estimatedQuality >= 60 ? 70 : 45,
        dataReliabilityScore: 80,
        shariahVerdict: c.ticker === 'AKT' || c.ticker === 'LBV' ? 'PASSED' : c.ticker === 'IAM' ? 'PASSED' : 'REVIEW_REQUIRED',
        shariahStatus: 'Conforme',
      });
    }

    // Fusionner les analyses sauvegardées plus riches du client si présentes
    if (clientSavedCompanies && Array.isArray(clientSavedCompanies)) {
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

      // Calcul de fraîcheur des prix
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

      // Points positifs & faiblesses
      if (comp.qualityScore >= 70) positivePoints.push(`Solidité fondamentale élevée (${comp.qualityScore}/100)`);
      if (discountToFairValue >= 10) positivePoints.push(`Décote intéressante de ${discountToFairValue.toFixed(1)}% sous la juste valeur`);
      if (comp.shariahVerdict === 'PASSED') positivePoints.push('Conformité Shariah validée');

      if (discountToFairValue < -10) riskWarnings.push(`Surcote de ${Math.abs(discountToFairValue).toFixed(1)}% par rapport à la juste valeur`);
      if (comp.qualityScore < 50) riskWarnings.push(`Faiblesse fondamentale (${comp.qualityScore}/100)`);
      if (isPriceStale) riskWarnings.push(`Cours non actualisé depuis ${daysSincePrice} jours`);
      if (holdingWeight >= criteria.maxCompanyAllocationPercent) riskWarnings.push(`Concentration élevée (${holdingWeight.toFixed(1)}% du portefeuille)`);

      // GATING SHARIAH
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
        // LOGIQUE SÉPARÉE POUR POSITIONS DÉTENUES vs NON DÉTENUES
        if (isOwned) {
          // --- ANALYSE D'UNE POSITION DÉTENUE ---
          // 1. Cas de dégradation fondamentale majeure -> REVIEW_SELL
          if (comp.qualityScore < 45 || (isApproachingWithdrawalWarning && holdingWeight > 20)) {
            decision = 'REVIEW_SELL';
            decisionLabel = 'Revue pour allègement/vente';
            decisionBadgeColor = 'bg-rose-100 text-rose-800';
            headline = 'Dégradation fondamentale ou approche de l’échéance de retrait.';
            reasons.push(
              comp.qualityScore < 45
                ? `Le score fondamental est tombé à ${comp.qualityScore}/100, signalant une détérioration de la santé financière.`
                : `Approche de l’horizon 4 ans (${monthsRemaining} mois restants) et concentration de ${holdingWeight.toFixed(1)}%.`
            );
            actionGuidance = 'Évaluez une vente ou une réduction pour protéger votre capital investi.';
          }
          // 2. Cas de forte surconcentration ou surcote excessive -> REVIEW_REDUCE
          else if (holdingWeight > criteria.maxCompanyAllocationPercent || discountToFairValue < -30) {
            decision = 'REVIEW_REDUCE';
            decisionLabel = 'Revue d’allègement partiel';
            decisionBadgeColor = 'bg-orange-100 text-orange-800';
            headline = 'Position trop concentrée ou surcotée par rapport à sa juste valeur.';
            reasons.push(
              holdingWeight > criteria.maxCompanyAllocationPercent
                ? `La position représente ${holdingWeight.toFixed(1)}% du portefeuille (plafond prudent: ${criteria.maxCompanyAllocationPercent}%).`
                : `Le titre cote à +${Math.abs(discountToFairValue).toFixed(1)}% au-dessus de sa juste valeur.`
            );
            actionGuidance = 'Envisagez de prendre des bénéfices partiels pour rééquilibrer votre diversification.';
          }
          // 3. Cas attractif pour renforcer -> BUY_MORE_CANDIDATE
          else if (
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
          }
          // 4. Défaut pour position saine -> HOLD
          else {
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
          // --- ANALYSE D'UNE NOUVELLE ACTION (NON DÉTENUE) ---
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

    // 5. CLASSEMENT DES CANDIDATS ÉLIGIBLES À L'ACHAT
    const eligibleBuys = evaluatedResults.filter((r) => r.decision === 'BUY_CANDIDATE' || r.decision === 'BUY_MORE_CANDIDATE');

    // Trouver les secteurs sous-pondérés pour priorisation
    const sectorWeights = new Map(portfolio.sectorAllocations.map((s) => [s.sector, s.differencePercent]));

    eligibleBuys.sort((a, b) => {
      // Bonus pour secteur sous-pondéré
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

    // 6. ALLOCATION DU BUDGET MENSUEL (Sur liquidités réelles, max 4 000 MAD ou disponible)
    const suggestedPurchases: MonthlyPurchaseSuggestion[] = [];
    let remainingBudget = availableCash;
    let totalAllocated = 0;

    for (const cand of eligibleBuys) {
      if (remainingBudget <= 0) break;
      const price = cand.currentPrice;
      if (price <= 0 || price > remainingBudget) continue;

      // Calculer un nombre entier d'actions abordable (en évitant la surconcentration)
      const maxSpendForStock = Math.min(remainingBudget, 4000);
      const shares = Math.floor((maxSpendForStock * 0.95) / price); // laisser de la marge pour les frais

      if (shares > 0) {
        const rawCost = shares * price;
        const fees = Math.max(10, rawCost * 0.005); // 0.5% frais min 10 MAD
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

    // Séparer les résultats par catégorie
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

  async saveSnapshot(reportData: any): Promise<DecisionSnapshot> {
    const snapshot: DecisionSnapshot = {
      id: `snap-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      portfolioId: 'default-portfolio',
      evaluationDate: new Date().toISOString().split('T')[0],
      reportSummary: reportData,
      createdAt: new Date().toISOString(),
    };

    if (this.db.getIsConnected()) {
      try {
        await this.db.query(
          `INSERT INTO decision_snapshots (id, portfolio_id, evaluation_date, decision, reasons, portfolio_allocation_snapshot)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            snapshot.id,
            snapshot.portfolioId,
            snapshot.evaluationDate,
            'MONTHLY_REVIEW',
            JSON.stringify(reportData?.suggestedPurchases || []),
            JSON.stringify(reportData?.portfolioSummary || {}),
          ]
        );
      } catch {
        // En cas d'erreur SQL, continuer avec le store mémoire
      }
    }

    this.snapshotsStore.unshift(snapshot);
    return snapshot;
  }

  async listSnapshots(): Promise<DecisionSnapshot[]> {
    if (this.db.getIsConnected()) {
      try {
        const res = await this.db.query('SELECT * FROM decision_snapshots ORDER BY created_at DESC LIMIT 20');
        if (res.rows.length > 0) {
          return res.rows.map((r: any) => ({
            id: r.id,
            portfolioId: r.portfolio_id,
            evaluationDate: r.evaluation_date,
            reportSummary: r.reasons,
            createdAt: r.created_at,
          }));
        }
      } catch {
        // fallback
      }
    }
    return this.snapshotsStore;
  }
}
