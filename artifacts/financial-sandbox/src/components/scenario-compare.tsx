import * as React from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, GitCompare, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { calculateSummary, generateProjections } from "@/lib/math";
import { ComparisonProjectionChart } from "@/components/charts";
import { Button } from "@/components/ui/core";
import { useScenarios } from "@/hooks/use-scenarios";
import type { FinancialProfile } from "@workspace/api-client-react";
import type { ProjectedData } from "@/lib/math";

const OPT_CURRENT = "__current__";

interface ScenarioCompareProps {
  isOpen: boolean;
  onClose: () => void;
  currentProfile: FinancialProfile;
}

export function ScenarioCompare({ isOpen, onClose, currentProfile }: ScenarioCompareProps) {
  const { scenarios, fetchScenarios, loadScenario } = useScenarios();
  const [leftId, setLeftId] = React.useState<string>(OPT_CURRENT);
  const [rightId, setRightId] = React.useState<string>(OPT_CURRENT);
  const [leftProfile, setLeftProfile] = React.useState<FinancialProfile | null>(null);
  const [rightProfile, setRightProfile] = React.useState<FinancialProfile | null>(null);
  const [loadingLeft, setLoadingLeft] = React.useState(false);
  const [loadingRight, setLoadingRight] = React.useState(false);

  React.useEffect(() => {
    if (isOpen) {
      fetchScenarios();
    }
  }, [isOpen, fetchScenarios]);

  React.useEffect(() => {
    if (leftId === OPT_CURRENT) {
      setLeftProfile(currentProfile);
      setLoadingLeft(false);
      return;
    }
    setLoadingLeft(true);
    loadScenario(leftId).then((p) => {
      setLeftProfile(p ?? null);
      setLoadingLeft(false);
    });
  }, [leftId, currentProfile, loadScenario]);

  React.useEffect(() => {
    if (rightId === OPT_CURRENT) {
      setRightProfile(currentProfile);
      setLoadingRight(false);
      return;
    }
    setLoadingRight(true);
    loadScenario(rightId).then((p) => {
      setRightProfile(p ?? null);
      setLoadingRight(false);
    });
  }, [rightId, currentProfile, loadScenario]);

  const leftSummary = leftProfile ? calculateSummary(leftProfile) : null;
  const rightSummary = rightProfile ? calculateSummary(rightProfile) : null;
  const leftProjections = leftProfile && leftSummary ? generateProjections(leftProfile, leftSummary) : [];
  const rightProjections = rightProfile && rightSummary ? generateProjections(rightProfile, rightSummary) : [];

  const getProjAtYear = (proj: ProjectedData[], year: number): number => {
    const exact = proj.find((p) => p.year === year);
    if (exact) return exact.netWorth;
    const prev = proj.filter((p) => p.year < year).pop();
    const next = proj.find((p) => p.year >= year);
    if (prev && next) {
      if (prev.year === next.year) return prev.netWorth;
      const frac = (year - prev.year) / (next.year - prev.year);
      return prev.netWorth + frac * (next.netWorth - prev.netWorth);
    }
    return prev?.netWorth ?? next?.netWorth ?? 0;
  };

  const finalYear = Math.max(
    leftProjections[leftProjections.length - 1]?.year ?? 0,
    rightProjections[rightProjections.length - 1]?.year ?? 0
  );

  if (!isOpen) return null;

  const options = [
    { value: OPT_CURRENT, label: "Current" },
    ...scenarios.map((s) => ({ value: s.id, label: s.name })),
  ];

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-xl"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.98 }}
        className="fixed inset-0 z-[70] flex items-center justify-center p-6 pointer-events-none"
      >
        <div
          className="pointer-events-auto w-full max-w-4xl max-h-[90vh] flex flex-col bg-card/98 backdrop-blur-2xl border border-border/70 rounded-2xl shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="shrink-0 px-6 py-5 border-b border-border/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GitCompare className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-display font-semibold">Compare Scenarios</h2>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Selectors */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-2">
                  Scenario A
                </label>
                <select
                  value={leftId}
                  onChange={(e) => setLeftId(e.target.value)}
                  className="w-full rounded-xl border border-border bg-input/50 px-3 py-2.5 text-sm text-foreground"
                >
                  {options.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                {loadingLeft && (
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" /> Loading...
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-2">
                  Scenario B
                </label>
                <select
                  value={rightId}
                  onChange={(e) => setRightId(e.target.value)}
                  className="w-full rounded-xl border border-border bg-input/50 px-3 py-2.5 text-sm text-foreground"
                >
                  {options.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                {loadingRight && (
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" /> Loading...
                  </p>
                )}
              </div>
            </div>

            {/* Chart */}
            {leftProjections.length > 0 || rightProjections.length > 0 ? (
              <ComparisonProjectionChart
                leftData={leftProjections}
                rightData={rightProjections}
                leftLabel={leftId === OPT_CURRENT ? "Current" : scenarios.find((s) => s.id === leftId)?.name ?? "A"}
                rightLabel={rightId === OPT_CURRENT ? "Current" : scenarios.find((s) => s.id === rightId)?.name ?? "B"}
              />
            ) : (
              <div className="h-[320px] flex items-center justify-center border border-dashed border-border rounded-xl">
                <p className="text-sm text-muted-foreground">Select scenarios to compare</p>
              </div>
            )}

            {/* Delta table */}
            {leftSummary && rightSummary && (
              <div className="border border-border/50 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-secondary/50 border-b border-border/50">
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Metric</th>
                      <th className="text-right px-4 py-3 font-medium">A</th>
                      <th className="text-right px-4 py-3 font-medium">B</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">Diff</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-border/30">
                      <td className="px-4 py-2.5 text-muted-foreground">Annual Income</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{formatCurrency(leftSummary.annualIncome, true)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{formatCurrency(rightSummary.annualIncome, true)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                        {formatCurrency(rightSummary.annualIncome - leftSummary.annualIncome, true)}
                      </td>
                    </tr>
                    <tr className="border-b border-border/30">
                      <td className="px-4 py-2.5 text-muted-foreground">Annual Expenses</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{formatCurrency(leftSummary.annualExpenses, true)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{formatCurrency(rightSummary.annualExpenses, true)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                        {formatCurrency(rightSummary.annualExpenses - leftSummary.annualExpenses, true)}
                      </td>
                    </tr>
                    <tr className="border-b border-border/30">
                      <td className="px-4 py-2.5 text-muted-foreground">Net Cash Flow</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{formatCurrency(leftSummary.annualNetCashFlow, true)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{formatCurrency(rightSummary.annualNetCashFlow, true)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                        {formatCurrency(rightSummary.annualNetCashFlow - leftSummary.annualNetCashFlow, true)}
                      </td>
                    </tr>
                    <tr className="border-b border-border/30">
                      <td className="px-4 py-2.5 text-muted-foreground">Yr 5 Net Worth</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{formatCurrency(getProjAtYear(leftProjections, 5), true)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{formatCurrency(getProjAtYear(rightProjections, 5), true)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                        {formatCurrency(getProjAtYear(rightProjections, 5) - getProjAtYear(leftProjections, 5), true)}
                      </td>
                    </tr>
                    <tr className="border-b border-border/30">
                      <td className="px-4 py-2.5 text-muted-foreground">Yr 10 Net Worth</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{formatCurrency(getProjAtYear(leftProjections, 10), true)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{formatCurrency(getProjAtYear(rightProjections, 10), true)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                        {formatCurrency(getProjAtYear(rightProjections, 10) - getProjAtYear(leftProjections, 10), true)}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2.5 text-muted-foreground">Final Net Worth</td>
                      <td className="px-4 py-2.5 text-right tabular-nums font-semibold">{formatCurrency(getProjAtYear(leftProjections, finalYear), true)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums font-semibold">{formatCurrency(getProjAtYear(rightProjections, finalYear), true)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-muted-foreground">
                        {formatCurrency(getProjAtYear(rightProjections, finalYear) - getProjAtYear(leftProjections, finalYear), true)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
