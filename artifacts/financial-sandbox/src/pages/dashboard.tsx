import * as React from "react";
import { formatCurrency, formatPercentage } from "@/lib/utils";
import {
  calculateSummary, generateProjections, generateBucketProjections, getIncomeAllocation,
  calculateFIRE, evaluateGoals,
} from "@/lib/math";
import { useBudgetState } from "@/hooks/use-budget-state";
import { Card, ToggleGroup } from "@/components/ui/core";
import { DataInputsPanel, ScenarioPanel, AdvancedSettingsPanel } from "@/components/panels";
import {
  ProjectionAreaChart, BreakdownDonutChart, BucketAllocationBar,
  IncomeAllocationChart, BucketGrowthChart,
  MonteCarloChart, ExpenseDistributionChart,
} from "@/components/charts";
import { useMonteCarlo } from "@/hooks/use-montecarlo";
import { ScenarioManager } from "@/components/scenario-manager";
import { ScenarioCompare } from "@/components/scenario-compare";
import { Loader2, Save, LayoutDashboard, Settings2, SlidersHorizontal, Zap, BarChart3, Target, GitCompare } from "lucide-react";
import type { FinancialProfile } from "@workspace/api-client-react";

export function Dashboard() {
  const { profile, updateProfile, isLoading, isSaving } = useBudgetState();
  const [viewMode, setViewMode] = React.useState<"monthly" | "yearly">("monthly");
  const [activeTab, setActiveTab] = React.useState<"data" | "scenarios" | "advanced">("data");
  const [activeConfigName, setActiveConfigName] = React.useState("Working Profile");
  const [hasUnsavedConfigChanges, setHasUnsavedConfigChanges] = React.useState(false);
  const activeConfigBaselineRef = React.useRef<string | null>(null);
  const serializeProfile = React.useCallback((nextProfile: FinancialProfile) => JSON.stringify(nextProfile), []);
  const [showMonteCarlo, setShowMonteCarlo] = React.useState(false);
  const [showCompare, setShowCompare] = React.useState(false);
  const { bands: monteCarloBands, isLoading: monteCarloLoading } = useMonteCarlo(
    profile,
    showMonteCarlo,
    1000
  );

  const handleLoadScenario = React.useCallback(
    (loaded: FinancialProfile) => {
      updateProfile(() => loaded);
    },
    [updateProfile]
  );

  const handleActiveScenarioChange = React.useCallback(
    (scenario: { name: string; profile: FinancialProfile }) => {
      setActiveConfigName(scenario.name);
      activeConfigBaselineRef.current = serializeProfile(scenario.profile);
      setHasUnsavedConfigChanges(false);
    },
    [serializeProfile]
  );

  React.useEffect(() => {
    const serializedProfile = serializeProfile(profile);
    if (activeConfigBaselineRef.current === null) {
      activeConfigBaselineRef.current = serializedProfile;
      setHasUnsavedConfigChanges(false);
      return;
    }
    setHasUnsavedConfigChanges(serializedProfile !== activeConfigBaselineRef.current);
  }, [profile, serializeProfile]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  const summary = calculateSummary(profile);
  const projections = generateProjections(profile, summary);
  const bucketProjections = generateBucketProjections(profile, summary);
  const incomeAllocation = getIncomeAllocation(summary);
  const at = profile.activeTrading ?? { enabled: false, amount: 0, frequency: "monthly" as const, currentReturnRate: 0, targetReturnRate: 0, riskLevel: 5 };
  const buckets = profile.investmentBuckets ?? [];
  const useTarget = profile.scenarioSettings?.useTargetAllocations ?? false;
  const finalProjection = projections[projections.length - 1];
  const fireMetrics = calculateFIRE(summary, projections);
  const goals = profile.scenarioSettings?.goals ?? [];
  const goalEvaluations = evaluateGoals(goals, projections);

  return (
    <div className="min-h-screen bg-background text-foreground pb-20 relative">
      {/* Background glow */}
      <div
        className="absolute top-0 left-0 w-full h-[500px] pointer-events-none opacity-20 bg-cover bg-center"
        style={{ backgroundImage: `url(${import.meta.env.BASE_URL}images/bg-glow.png)` }}
      />

      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-primary to-indigo-400 flex items-center justify-center shadow-lg shadow-primary/20">
              <span className="text-white font-display font-bold">F</span>
            </div>
            <h1 className="text-xl font-display font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">
              Sandbox Analyzer
            </h1>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <ToggleGroup
              options={[
                { label: "/ Month", value: "monthly" },
                { label: "/ Year",  value: "yearly" },
              ]}
              value={viewMode}
              onChange={(v) => setViewMode(v as any)}
            />
            <div className="hidden lg:flex items-center gap-1.5 text-xs font-medium bg-secondary/50 text-muted-foreground px-3 py-1.5 rounded-full max-w-[280px]">
              <span className="text-foreground/80">Current:</span>
              <span className="truncate text-foreground">{activeConfigName}</span>
              {hasUnsavedConfigChanges && (
                <span className="shrink-0 text-amber-400">• Unsaved changes</span>
              )}
            </div>
            <ScenarioManager
              profile={profile}
              onLoad={handleLoadScenario}
              onActiveScenarioChange={handleActiveScenarioChange}
            />
            <button
              onClick={() => setShowCompare(true)}
              className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground bg-secondary/50 hover:bg-secondary px-3 py-1.5 rounded-full transition-colors"
            >
              <GitCompare className="w-4 h-4" />
              <span className="hidden sm:inline">Compare</span>
            </button>
            <ScenarioCompare
              isOpen={showCompare}
              onClose={() => setShowCompare(false)}
              currentProfile={profile}
            />
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-secondary/50 px-3 py-1.5 rounded-full">
              {isSaving
                ? <><Loader2 className="w-3 h-3 animate-spin" /> Saving</>
                : <><Save className="w-3 h-3" /> Saved</>}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">

        {/* ── Left Sidebar ─────────────────────────────────────── */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <Card className="flex flex-col h-[calc(100vh-8rem)] sticky top-24 border-border/40 bg-card/60 backdrop-blur-xl">
            {/* Tabs */}
            <div className="flex border-b border-border/50 p-2 gap-1">
              {(
                [
                  { id: "data",      icon: <LayoutDashboard className="w-4 h-4" />, label: "Baseline" },
                  { id: "scenarios", icon: <SlidersHorizontal className="w-4 h-4" />, label: "What-If" },
                  { id: "advanced",  icon: <Settings2 className="w-4 h-4" />, label: "Math" },
                ] as const
              ).map(({ id, icon, label }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                    activeTab === id
                      ? "bg-secondary text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {icon} {label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              {activeTab === "data"      && <DataInputsPanel      profile={profile} updateProfile={updateProfile} />}
              {activeTab === "scenarios" && <ScenarioPanel         profile={profile} updateProfile={updateProfile} />}
              {activeTab === "advanced"  && <AdvancedSettingsPanel profile={profile} updateProfile={updateProfile} />}
            </div>
          </Card>
        </div>

        {/* ── Right Content ─────────────────────────────────────── */}
        <div className="lg:col-span-8 flex flex-col gap-6">

          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card className="p-5 bg-gradient-to-br from-emerald-500/10 to-transparent border-emerald-500/20">
              <p className="text-xs font-medium text-emerald-400/80 mb-2">Net Cash Flow</p>
              <p className="text-2xl sm:text-3xl font-display font-bold text-foreground">
                {formatCurrency(viewMode === "monthly" ? summary.monthlyNetCashFlow : summary.annualNetCashFlow, true)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">/{viewMode === "monthly" ? "month" : "year"}</p>
            </Card>
            <Card className="p-5">
              <p className="text-xs font-medium text-muted-foreground mb-2">Total Income</p>
              <p className="text-2xl sm:text-3xl font-display font-bold text-foreground">
                {formatCurrency(viewMode === "monthly" ? summary.monthlyIncome : summary.annualIncome, true)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">/{viewMode === "monthly" ? "month" : "year"}</p>
            </Card>
            <Card className="p-5">
              <p className="text-xs font-medium text-muted-foreground mb-2">Total Expenses</p>
              <p className="text-2xl sm:text-3xl font-display font-bold text-foreground">
                {formatCurrency(viewMode === "monthly" ? summary.monthlyExpenses : summary.annualExpenses, true)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">/{viewMode === "monthly" ? "month" : "year"}</p>
            </Card>
            <Card className="p-5 bg-gradient-to-br from-indigo-500/10 to-transparent border-indigo-500/20">
              <p className="text-xs font-medium text-indigo-400/80 mb-2">Assets Base</p>
              <p className="text-2xl sm:text-3xl font-display font-bold text-foreground">
                {formatCurrency(summary.totalCurrentAssets, true)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">current value</p>
            </Card>
          </div>

          {/* ── Main Projection Chart ─────────────────────── */}
          <Card className="p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
              <div>
                <h3 className="text-lg font-display font-semibold">Wealth Projection</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Over {profile.scenarioSettings.timeframeYears} years
                  {useTarget && (
                    <span className="ml-2 text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                      Target Allocations
                    </span>
                  )}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Final Net Worth</p>
                <p className="text-2xl font-display font-bold text-primary">
                  {formatCurrency(finalProjection?.netWorth || 0, true)}
                </p>
              </div>
            </div>
            <ProjectionAreaChart
              data={projections}
              fireNumber={fireMetrics.fireNumber}
              goals={goals}
            />
          </Card>

          {/* Monte Carlo Simulation */}
          <Card className="p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
              <div>
                <h3 className="text-lg font-display font-semibold">Monte Carlo Simulation</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Probability bands from 1,000 randomized projections
                </p>
              </div>
              <button
                onClick={() => setShowMonteCarlo(!showMonteCarlo)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  showMonteCarlo
                    ? "bg-violet-500/20 text-violet-400 border border-violet-500/40"
                    : "bg-secondary/50 text-muted-foreground hover:text-foreground border border-border/50"
                }`}
              >
                {showMonteCarlo ? "Hide" : "Show"} Simulation
              </button>
            </div>
            {showMonteCarlo && (
              <MonteCarloChart bands={monteCarloBands} isLoading={monteCarloLoading} />
            )}
          </Card>

          {/* ── Cash Flow Breakdown + Bucket Allocation ───── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="text-lg font-display font-semibold mb-1">Cash Flow Breakdown</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Proportional {viewMode} income allocation
              </p>
              <BreakdownDonutChart summary={summary} viewMode={viewMode} />
            </Card>

            <Card className="p-6 flex flex-col gap-4">
              <div>
                <h3 className="text-lg font-display font-semibold">Investment Buckets</h3>
                <p className="text-sm text-muted-foreground">
                  {useTarget ? "Target" : "Current"} portfolio pockets
                </p>
              </div>

              {buckets.length > 0 ? (
                <BucketAllocationBar
                  buckets={buckets}
                  useTarget={useTarget}
                />
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4 border border-dashed border-border rounded-xl">
                  No buckets defined — add some in the Baseline tab
                </p>
              )}

              <div className="mt-auto pt-3 border-t border-border/50 text-xs flex justify-between text-muted-foreground">
                <span>Monthly pool</span>
                <span className="font-semibold text-foreground">
                  {formatCurrency(summary.monthlyInvestments)}
                </span>
              </div>
            </Card>
          </div>

          {/* ── Analytics Section ─────────────────────────── */}
          <div className="flex items-center gap-3 pt-2">
            <BarChart3 className="w-5 h-5 text-muted-foreground" />
            <h2 className="text-lg font-display font-semibold text-foreground">Analytics</h2>
            <div className="flex-1 h-px bg-border/50" />
          </div>

          {/* Goals Status Card */}
          {goalEvaluations.filter((e) => e.goal.targetAmount > 0).length > 0 && (
            <Card className="p-6">
              <h3 className="text-base font-display font-semibold mb-4">Goals Status</h3>
              <div className="space-y-3">
                {goalEvaluations
                  .filter((e) => e.goal.targetAmount > 0)
                  .map(({ goal, projectedAmount, onTrack, surplusOrDeficit }) => (
                  <div
                    key={goal.id}
                    className="flex items-center justify-between p-3 bg-secondary/30 rounded-xl border border-border/50"
                  >
                    <div>
                      <p className="font-medium text-sm text-foreground">{goal.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Target {formatCurrency(goal.targetAmount, true)} by year {goal.targetYear}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-foreground">
                        {formatCurrency(projectedAmount, true)} projected
                      </p>
                      <p
                        className={`text-xs font-medium ${
                          onTrack ? "text-emerald-400" : "text-rose-400"
                        }`}
                      >
                        {onTrack
                          ? `+${formatCurrency(surplusOrDeficit, true)}`
                          : formatCurrency(surplusOrDeficit, true)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Financial Independence Card */}
          <Card className="p-6 bg-gradient-to-br from-violet-500/10 to-transparent border-violet-500/20">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-violet-500/15 border border-violet-500/30 flex items-center justify-center">
                  <Target className="w-5 h-5 text-violet-400" />
                </div>
                <div>
                  <h3 className="text-base font-display font-semibold">Financial Independence</h3>
                  <p className="text-xs text-muted-foreground">4% safe withdrawal target</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground mb-0.5">FIRE Number</p>
                <p className="text-xl font-display font-bold text-violet-400">
                  {formatCurrency(fireMetrics.fireNumber, true)}
                </p>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-semibold text-foreground">
                    {(fireMetrics.fireProgress * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="h-2 rounded-full bg-secondary overflow-hidden">
                  <div
                    className="h-full rounded-full bg-violet-500/80 transition-all"
                    style={{ width: `${Math.min(100, fireMetrics.fireProgress * 100)}%` }}
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-3 text-sm">
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground">Years to FI:</span>
                  <span className="font-semibold text-foreground">
                    {fireMetrics.yearsToFIRE === null
                      ? `>${profile.scenarioSettings.timeframeYears} yrs`
                      : fireMetrics.yearsToFIRE <= 0
                        ? "Already FIRE'd"
                        : `${fireMetrics.yearsToFIRE.toFixed(1)} yrs`}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground">Savings rate:</span>
                  <span className="font-semibold text-emerald-400">
                    {formatPercentage(fireMetrics.savingsRate)}
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {/* Income Allocation + Investment Efficiency */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="text-base font-display font-semibold mb-1">Where Your Income Goes</h3>
              <p className="text-sm text-muted-foreground mb-5">
                Annual breakdown of each £ earned
              </p>
              {incomeAllocation.length > 0 ? (
                <IncomeAllocationChart allocation={incomeAllocation} />
              ) : (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  Add income and expenses to see allocation
                </p>
              )}
            </Card>

            <Card className="p-6">
              <h3 className="text-base font-display font-semibold mb-1">Expense Distribution</h3>
              <p className="text-sm text-muted-foreground mb-5">
                {viewMode === "monthly" ? "Monthly" : "Annual"} spend split across expense categories
              </p>
              {profile.expenses.length > 0 ? (
                <ExpenseDistributionChart expenses={profile.expenses} viewMode={viewMode} />
              ) : (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  Add expenses to see distribution
                </p>
              )}
            </Card>
          </div>

          {/* Bucket Growth Chart — only when buckets exist */}
          {buckets.length > 0 && (
            <Card className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-base font-display font-semibold">Passive Investment Growth by Bucket</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Projected contribution of each allocation pocket over time
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-muted-foreground mb-0.5">Combined at yr {profile.scenarioSettings?.timeframeYears ?? 10}</p>
                  <p className="text-xl font-display font-bold text-indigo-400">
                    {formatCurrency(
                      Object.entries(bucketProjections[bucketProjections.length - 1] ?? {})
                        .filter(([k]) => k !== "year")
                        .reduce((s, [, v]) => s + (v as number), 0),
                      true
                    )}
                  </p>
                </div>
              </div>
              <BucketGrowthChart
                data={bucketProjections}
                buckets={buckets}
              />
            </Card>
          )}

          {/* ── Active Trading Card ───────────────────────── */}
          {at.enabled && (
            <Card className="p-6 border-amber-500/25 bg-amber-500/5">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
                    <Zap className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-display font-semibold">Active Trading Pocket</h3>
                    <p className="text-xs text-muted-foreground">Speculative allocation — projected separately</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground mb-0.5">
                    Yr {Math.min(10, profile.scenarioSettings.timeframeYears)} projected
                  </p>
                  <p className="text-xl font-display font-bold text-amber-400">
                    {formatCurrency(
                      (projections.find(
                        (p) => p.year === Math.min(10, profile.scenarioSettings.timeframeYears)
                      ) ?? projections[projections.length - 1])?.activeTrading || 0,
                      true
                    )}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                {[
                  {
                    label: "Monthly",
                    value: formatCurrency(at.frequency === "monthly" ? at.amount : at.amount / 12),
                    className: "text-foreground",
                  },
                  {
                    label: "Now Return",
                    value: `${at.currentReturnRate >= 0 ? "+" : ""}${formatPercentage(at.currentReturnRate)}/yr`,
                    className: at.currentReturnRate >= 0 ? "text-emerald-400" : "text-rose-400",
                  },
                  {
                    label: "Target Return",
                    value: `${at.targetReturnRate >= 0 ? "+" : ""}${formatPercentage(at.targetReturnRate)}/yr`,
                    className: "text-indigo-400",
                  },
                  {
                    label: "Risk Level",
                    value: `${at.riskLevel}/10`,
                    className: at.riskLevel >= 8 ? "text-rose-400" : at.riskLevel >= 5 ? "text-amber-400" : "text-emerald-400",
                  },
                ].map(({ label, value, className }) => (
                  <div key={label} className="bg-secondary/40 rounded-xl p-3">
                    <p className="text-xs text-muted-foreground mb-1">{label}</p>
                    <p className={`font-semibold text-sm ${className}`}>{value}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}

        </div>
      </main>
    </div>
  );
}
