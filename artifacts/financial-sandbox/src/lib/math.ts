import type { FinancialProfile, InvestmentBucket } from "@workspace/api-client-react";

export interface ProjectedData {
  year: number;
  cash: number;
  investments: number;
  activeTrading: number;
  netWorth: number;
}

export interface BucketProjectedData {
  year: number;
  [bucketName: string]: number;
}

export interface SummaryMetrics {
  monthlyIncome: number;
  monthlyExpenses: number;
  monthlyInvestments: number;
  monthlyActiveTrading: number;
  monthlyNetCashFlow: number;
  annualIncome: number;
  annualExpenses: number;
  annualInvestments: number;
  annualActiveTrading: number;
  annualNetCashFlow: number;
  totalCurrentAssets: number;
  bucketBreakdown: { bucket: InvestmentBucket; annualAmount: number }[];
}

const getAnnualAmount = (item: { amount: number; frequency: "monthly" | "yearly" }) =>
  item.frequency === "monthly" ? item.amount * 12 : item.amount;

export function calculateSummary(profile: FinancialProfile): SummaryMetrics {
  const scenarioSettings = profile.scenarioSettings;
  const investmentBuckets = profile.investmentBuckets ?? [];
  const activeTrading = profile.activeTrading ?? {
    enabled: false, amount: 0, frequency: "monthly" as const,
    currentReturnRate: 0, targetReturnRate: 0, riskLevel: 5,
  };

  const rawAnnualIncome = profile.income.reduce((sum, i) => sum + getAnnualAmount(i), 0);
  const rawAnnualExpenses = profile.expenses.reduce((sum, i) => sum + getAnnualAmount(i), 0);
  const rawAnnualInvestments = profile.investments.reduce((sum, i) => sum + getAnnualAmount(i), 0);

  const annualIncome = rawAnnualIncome * (scenarioSettings.incomeModifier || 1);
  const annualExpenses = rawAnnualExpenses * (scenarioSettings.expenseModifier || 1);
  const annualInvestments = rawAnnualInvestments;

  const annualActiveTrading =
    activeTrading.enabled ? getAnnualAmount(activeTrading as any) : 0;

  const totalCurrentAssets = profile.assets.reduce((sum, i) => sum + i.amount, 0);

  // Build bucket breakdown — allocate investment pool proportionally
  const usePcts = scenarioSettings.useTargetAllocations;
  const totalBucketPct = investmentBuckets.reduce(
    (sum, b) => sum + (usePcts ? b.targetAllocationPct : b.currentAllocationPct),
    0
  ) || 100;

  const bucketBreakdown = investmentBuckets.map((bucket) => {
    const pct = usePcts ? bucket.targetAllocationPct : bucket.currentAllocationPct;
    const annualAmount = annualInvestments * (pct / totalBucketPct);
    return { bucket, annualAmount };
  });

  return {
    annualIncome,
    annualExpenses,
    annualInvestments,
    annualActiveTrading,
    annualNetCashFlow: annualIncome - annualExpenses - annualInvestments - annualActiveTrading,
    monthlyIncome: annualIncome / 12,
    monthlyExpenses: annualExpenses / 12,
    monthlyInvestments: annualInvestments / 12,
    monthlyActiveTrading: annualActiveTrading / 12,
    monthlyNetCashFlow: (annualIncome - annualExpenses - annualInvestments - annualActiveTrading) / 12,
    totalCurrentAssets,
    bucketBreakdown,
  };
}

export function generateProjections(
  profile: FinancialProfile,
  summary: SummaryMetrics
): ProjectedData[] {
  const scenarioSettings = profile.scenarioSettings;
  const assets = profile.assets;
  const investmentBuckets = profile.investmentBuckets ?? [];
  const activeTrading = profile.activeTrading ?? {
    enabled: false, amount: 0, frequency: "monthly" as const,
    currentReturnRate: 0, targetReturnRate: 0, riskLevel: 5,
  };
  const yearsToProject = scenarioSettings.timeframeYears || 10;

  const nMap: Record<string, number> = { annual: 1, monthly: 12, quarterly: 4 };
  const n = nMap[scenarioSettings.compoundingFrequency] || 12;
  const inflation = scenarioSettings.inflationRate || 0;

  const getReturnRate = (baseRate: number) => {
    const override = scenarioSettings.investmentReturnOverride;
    const nominal = override !== -1 ? override : baseRate;
    return Math.max(-0.99, nominal - inflation);
  };

  // For active trading, use target rate when useTargetAllocations is on
  const tradingReturnRate = scenarioSettings.useTargetAllocations
    ? activeTrading.targetReturnRate
    : activeTrading.currentReturnRate;

  const projections: ProjectedData[] = [];
  const keyYears = [0, 1, 2, 3, 5, 7, 10, 15, 20, 25, 30].filter((y) => y <= yearsToProject);
  if (!keyYears.includes(yearsToProject)) keyYears.push(yearsToProject);

  const fvAnnuity = (pmt: number, r: number, nPeriods: number, periodsPerYear: number) => {
    const rPerPeriod = r / periodsPerYear;
    if (Math.abs(rPerPeriod) < 1e-10) return pmt * nPeriods;
    return pmt * ((Math.pow(1 + rPerPeriod, nPeriods) - 1) / rPerPeriod);
  };

  keyYears.forEach((year) => {
    if (year === 0) {
      projections.push({
        year: 0,
        cash: 0,
        investments: summary.totalCurrentAssets,
        activeTrading: 0,
        netWorth: summary.totalCurrentAssets,
      });
      return;
    }

    // Cash: cumulative uninvested net cash flow
    const projectedCash = Math.max(0, summary.annualNetCashFlow * year);

    // Existing Assets (lump-sum compound growth)
    let projectedAssets = 0;
    assets.forEach((asset) => {
      const r = getReturnRate(asset.returnRate);
      projectedAssets += asset.amount * Math.pow(1 + r / n, n * year);
    });

    // Rolling Investments split across buckets
    let projectedBuckets = 0;
    if (investmentBuckets.length > 0) {
      summary.bucketBreakdown.forEach(({ bucket, annualAmount }) => {
        const r = getReturnRate(bucket.returnRate);
        const pmt = annualAmount / n;
        projectedBuckets += fvAnnuity(pmt, r, n * year, n);
      });
    } else {
      // Fallback: use old-style investments without buckets
      profile.investments.forEach((inv) => {
        const r = getReturnRate(inv.returnRate);
        const annualContrib = getAnnualAmount(inv);
        const pmt = annualContrib / n;
        projectedBuckets += fvAnnuity(pmt, r, n * year, n);
      });
    }

    // Active Trading
    let projectedActiveTrading = 0;
    if (activeTrading.enabled) {
      const r = Math.max(-0.99, tradingReturnRate - inflation);
      const annualContrib = getAnnualAmount(activeTrading as any);
      const pmt = annualContrib / n;
      projectedActiveTrading += fvAnnuity(pmt, r, n * year, n);
    }

    const totalInvestments = projectedAssets + projectedBuckets;

    projections.push({
      year,
      cash: projectedCash,
      investments: totalInvestments,
      activeTrading: projectedActiveTrading,
      netWorth: projectedCash + totalInvestments + projectedActiveTrading,
    });
  });

  return projections;
}

/** Generate per-bucket projected value over time for the stacked bucket growth chart */
export function generateBucketProjections(
  profile: FinancialProfile,
  summary: SummaryMetrics
): BucketProjectedData[] {
  const { scenarioSettings } = profile;
  const yearsToProject = scenarioSettings.timeframeYears || 10;
  const nMap: Record<string, number> = { annual: 1, monthly: 12, quarterly: 4 };
  const n = nMap[scenarioSettings.compoundingFrequency] || 12;
  const inflation = scenarioSettings.inflationRate || 0;

  const keyYears = [0, 1, 2, 3, 5, 7, 10, 15, 20, 25, 30].filter((y) => y <= yearsToProject);
  if (!keyYears.includes(yearsToProject)) keyYears.push(yearsToProject);

  const getRate = (base: number) => {
    const o = scenarioSettings.investmentReturnOverride;
    return Math.max(-0.99, (o !== -1 ? o : base) - inflation);
  };

  const fvAnnuity = (pmt: number, r: number, nPeriods: number) => {
    const rp = r / n;
    if (Math.abs(rp) < 1e-10) return pmt * nPeriods;
    return pmt * ((Math.pow(1 + rp, nPeriods) - 1) / rp);
  };

  return keyYears.map((year) => {
    const row: BucketProjectedData = { year };
    if (year === 0) {
      summary.bucketBreakdown.forEach(({ bucket }) => { row[bucket.name] = 0; });
      return row;
    }
    summary.bucketBreakdown.forEach(({ bucket, annualAmount }) => {
      const r = getRate(bucket.returnRate);
      const pmt = annualAmount / n;
      row[bucket.name] = fvAnnuity(pmt, r, n * year);
    });
    return row;
  });
}

/** Income allocation breakdown — where each £ of income goes */
export interface IncomeAllocation {
  label: string;
  value: number;
  pct: number;
  color: string;
}

export function getIncomeAllocation(summary: SummaryMetrics): IncomeAllocation[] {
  const total = summary.annualIncome;
  if (total <= 0) return [];

  const items = [
    { label: "Expenses",        value: summary.annualExpenses,      color: "hsl(348 83% 47%)" },
    { label: "Passive Invest.", value: summary.annualInvestments,   color: "hsl(230 84% 65%)" },
    { label: "Active Trading",  value: summary.annualActiveTrading, color: "hsl(38 92% 55%)"  },
    { label: "Free Cash",       value: Math.max(0, summary.annualNetCashFlow), color: "hsl(160 84% 39%)" },
  ];

  return items.map((i) => ({ ...i, pct: (i.value / total) * 100 })).filter((i) => i.value > 0);
}

/** FIRE (Financial Independence, Retire Early) metrics */
export interface FIREMetrics {
  fireNumber: number;
  yearsToFIRE: number | null;
  fireProgress: number;
  savingsRate: number;
}

export function calculateFIRE(
  summary: SummaryMetrics,
  projections: ProjectedData[],
  withdrawalRate = 0.04
): FIREMetrics {
  const fireNumber = summary.annualExpenses / withdrawalRate;
  const fireProgress = fireNumber > 0 ? Math.min(1, summary.totalCurrentAssets / fireNumber) : 0;
  const savingsRate =
    summary.annualIncome > 0
      ? (summary.annualInvestments + summary.annualActiveTrading) / summary.annualIncome
      : 0;

  let yearsToFIRE: number | null = null;
  for (let i = 0; i < projections.length; i++) {
    if (projections[i].netWorth >= fireNumber) {
      if (i === 0) {
        yearsToFIRE = 0;
      } else {
        const prev = projections[i - 1];
        const curr = projections[i];
        const frac = (fireNumber - prev.netWorth) / (curr.netWorth - prev.netWorth);
        yearsToFIRE = prev.year + frac * (curr.year - prev.year);
      }
      break;
    }
  }

  return { fireNumber, yearsToFIRE, fireProgress, savingsRate };
}

/** Goal evaluation result */
export interface GoalEvaluation {
  goal: { id: string; name: string; targetAmount: number; targetYear: number };
  projectedAmount: number;
  onTrack: boolean;
  surplusOrDeficit: number;
}

export function evaluateGoals(
  goals: { id: string; name: string; targetAmount: number; targetYear: number }[],
  projections: ProjectedData[]
): GoalEvaluation[] {
  if (!goals?.length || !projections.length) return [];

  return goals.map((goal) => {
    const targetYear = goal.targetYear;
    let projectedAmount = 0;

    if (targetYear <= 0) {
      projectedAmount = projections[0]?.netWorth ?? 0;
    } else {
      const prev = projections.filter((p) => p.year <= targetYear).pop();
      const next = projections.find((p) => p.year >= targetYear);
      if (prev && next) {
        if (prev.year === next.year) {
          projectedAmount = prev.netWorth;
        } else {
          const frac = (targetYear - prev.year) / (next.year - prev.year);
          projectedAmount = prev.netWorth + frac * (next.netWorth - prev.netWorth);
        }
      } else if (prev) {
        projectedAmount = prev.netWorth;
      } else if (next) {
        projectedAmount = next.netWorth;
      }
    }

    const surplusOrDeficit = projectedAmount - goal.targetAmount;
    const onTrack = surplusOrDeficit >= 0;

    return { goal, projectedAmount, onTrack, surplusOrDeficit };
  });
}
