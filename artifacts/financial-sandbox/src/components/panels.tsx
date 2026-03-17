import * as React from "react";
import {
  Plus, Edit2, Trash2, TrendingUp, TrendingDown, Landmark, PiggyBank,
  Zap, ChevronDown, ChevronUp, AlertTriangle
} from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import type {
  FinancialItem, AssetItem, InvestmentItem, FinancialProfile, InvestmentBucket, FinancialGoal
} from "@workspace/api-client-react";
import { formatCurrency, formatPercentage } from "@/lib/utils";
import { Button, AccordionItem, CustomSlider, ToggleGroup, Input } from "./ui/core";
import { ItemFormDialog } from "./forms";

interface PanelProps {
  profile: FinancialProfile;
  updateProfile: (updater: (prev: FinancialProfile) => FinancialProfile) => void;
}

type ContributionFrequency = "monthly" | "yearly";
type CompoundingFrequency = "annual" | "quarterly" | "monthly";

const normalizeContributionFrequency = (value: unknown): ContributionFrequency =>
  value === "yearly" ? "yearly" : "monthly";

const normalizeCompoundingFrequency = (value: unknown): CompoundingFrequency =>
  value === "annual" || value === "quarterly" || value === "monthly" ? value : "annual";

// ── Shared item list (income, expenses, assets, plain investments) ───────────

function ItemList({
  type,
  items,
  displayFormat,
  onEdit,
  onDelete,
  onAdd,
}: {
  type: string;
  items: any[];
  displayFormat: (item: any) => string;
  onEdit: (item: any) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
}) {
  return (
    <div className="space-y-3">
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground py-2 text-center border border-dashed border-border rounded-lg">
          No items added yet
        </p>
      ) : (
        items.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between p-3 bg-secondary/30 rounded-xl border border-border/50 hover:bg-secondary/50 transition-colors group"
          >
            <div>
              <p className="font-medium text-sm text-foreground">{item.name}</p>
              <p className="text-xs text-muted-foreground">{displayFormat(item)}</p>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onEdit(item)}>
                <Edit2 className="w-4 h-4 text-muted-foreground hover:text-primary" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 hover:bg-destructive/10"
                onClick={() => onDelete(item.id)}
              >
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </div>
          </div>
        ))
      )}
      <Button variant="outline" className="w-full border-dashed" onClick={onAdd}>
        <Plus className="w-4 h-4 mr-2" /> Add Item
      </Button>
    </div>
  );
}

// ── Investment Buckets ───────────────────────────────────────────────────────

function BucketEditor({
  buckets,
  onChange,
}: {
  buckets: InvestmentBucket[];
  onChange: (buckets: InvestmentBucket[]) => void;
}) {
  const [editingId, setEditingId] = React.useState<string | null>(null);

  const totalNow = buckets.reduce((s, b) => s + b.currentAllocationPct, 0);
  const totalTarget = buckets.reduce((s, b) => s + b.targetAllocationPct, 0);

  const update = (id: string, patch: Partial<InvestmentBucket>) => {
    onChange(buckets.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  };

  const addBucket = () => {
    const remaining = Math.max(0, 100 - totalNow);
    onChange([
      ...buckets,
      {
        id: uuidv4(),
        name: "New Bucket",
        currentAllocationPct: remaining,
        targetAllocationPct: remaining,
        returnRate: 0.07,
      },
    ]);
  };

  const deleteBucket = (id: string) => onChange(buckets.filter((b) => b.id !== id));

  const riskColor = (r: number) =>
    r >= 0.14 ? "text-rose-400" : r >= 0.09 ? "text-amber-400" : "text-emerald-400";

  return (
    <div className="space-y-3">
      {/* Allocation summary bar */}
      <div className="mb-1">
        <div className="flex justify-between text-xs text-muted-foreground mb-1">
          <span>Current allocation total</span>
          <span className={totalNow === 100 ? "text-emerald-400" : "text-amber-400 font-semibold"}>
            {totalNow}%
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-secondary overflow-hidden flex">
          {buckets.map((b) => (
            <div
              key={b.id}
              style={{ width: `${b.currentAllocationPct}%` }}
              className="h-full transition-all"
              title={b.name}
            />
          ))}
          {/* Color segments via inline style hue rotation trick */}
        </div>
        {totalNow !== 100 && (
          <p className="flex items-center gap-1 text-xs text-amber-400 mt-1">
            <AlertTriangle className="w-3 h-3" /> Allocations should total 100% (currently {totalNow}%)
          </p>
        )}
      </div>

      {buckets.map((bucket, idx) => {
        const isEditing = editingId === bucket.id;
        const hue = [230, 160, 280, 25, 195][idx % 5];

        return (
          <div
            key={bucket.id}
            className="rounded-xl border border-border/50 bg-secondary/20 overflow-hidden"
            style={{ borderLeft: `3px solid hsl(${hue} 70% 55%)` }}
          >
            {/* Header row */}
            <div className="flex items-center justify-between px-3 py-2.5">
              {isEditing ? (
                <Input
                  className="h-7 text-sm font-medium bg-transparent border-none px-0 focus-visible:ring-0"
                  value={bucket.name}
                  onChange={(e) => update(bucket.id, { name: e.target.value })}
                  onBlur={() => setEditingId(null)}
                  autoFocus
                />
              ) : (
                <button
                  className="text-sm font-medium text-foreground text-left hover:text-primary transition-colors truncate mr-2"
                  onClick={() => setEditingId(bucket.id)}
                  title="Click to rename"
                >
                  {bucket.name}
                </button>
              )}
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-xs font-mono font-semibold ${riskColor(bucket.returnRate)}`}>
                  {formatPercentage(bucket.returnRate)}/yr
                </span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 hover:bg-destructive/10"
                  onClick={() => deleteBucket(bucket.id)}
                >
                  <Trash2 className="w-3.5 h-3.5 text-destructive" />
                </Button>
              </div>
            </div>

            {/* Sliders */}
            <div className="px-3 pb-3 space-y-3">
              {/* Current allocation */}
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-xs text-muted-foreground">Now</span>
                  <span className="text-xs font-semibold" style={{ color: `hsl(${hue} 70% 60%)` }}>
                    {bucket.currentAllocationPct}%
                  </span>
                </div>
                <CustomSlider
                  min={0}
                  max={100}
                  step={1}
                  value={bucket.currentAllocationPct}
                  onChange={(v) => update(bucket.id, { currentAllocationPct: v })}
                />
              </div>

              {/* Target allocation */}
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-xs text-muted-foreground">Target</span>
                  <span className="text-xs font-semibold text-indigo-400">
                    {bucket.targetAllocationPct}%
                  </span>
                </div>
                <CustomSlider
                  min={0}
                  max={100}
                  step={1}
                  value={bucket.targetAllocationPct}
                  onChange={(v) => update(bucket.id, { targetAllocationPct: v })}
                />
              </div>

              {/* Return rate */}
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-xs text-muted-foreground">Expected Return</span>
                  <span className={`text-xs font-semibold ${riskColor(bucket.returnRate)}`}>
                    {formatPercentage(bucket.returnRate)}/yr
                  </span>
                </div>
                <CustomSlider
                  min={-0.2}
                  max={0.4}
                  step={0.005}
                  value={bucket.returnRate}
                  onChange={(v) => update(bucket.id, { returnRate: v })}
                />
              </div>
            </div>
          </div>
        );
      })}

      <Button variant="outline" className="w-full border-dashed text-sm" onClick={addBucket}>
        <Plus className="w-4 h-4 mr-2" /> Add Bucket
      </Button>

      {totalTarget !== 100 && (
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <AlertTriangle className="w-3 h-3 text-amber-400" />
          Target total: {totalTarget}% (should be 100%)
        </p>
      )}
    </div>
  );
}

// ── Active Trading Panel ─────────────────────────────────────────────────────

export function ActiveTradingPanel({ profile, updateProfile }: PanelProps) {
  const at = {
    enabled: false,
    amount: 0,
    currentReturnRate: 0,
    targetReturnRate: 0,
    riskLevel: 5,
    ...(profile.activeTrading ?? {}),
    frequency: normalizeContributionFrequency(profile.activeTrading?.frequency),
  };

  const update = (patch: Partial<typeof at>) => {
    updateProfile((prev) => ({ ...prev, activeTrading: { ...prev.activeTrading, ...patch } }));
  };

  const riskLabels: Record<number, string> = {
    1: "Very Low", 2: "Low", 3: "Moderate-Low", 4: "Moderate",
    5: "Medium", 6: "Medium-High", 7: "High", 8: "Very High",
    9: "Extreme", 10: "Reckless",
  };

  const riskColor =
    at.riskLevel >= 8 ? "text-rose-400" :
    at.riskLevel >= 5 ? "text-amber-400" :
    "text-emerald-400";

  return (
    <div className="space-y-4">
      {/* Enable toggle */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">Active Trading</p>
          <p className="text-xs text-muted-foreground">Separate speculative pocket</p>
        </div>
        <button
          onClick={() => update({ enabled: !at.enabled })}
          className={`w-12 h-6 rounded-full transition-colors relative ${at.enabled ? "bg-amber-500" : "bg-secondary"}`}
        >
          <span
            className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${at.enabled ? "translate-x-7" : "translate-x-1"}`}
          />
        </button>
      </div>

      {at.enabled && (
        <>
          {/* Contribution */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Contribution Amount ($)
            </label>
            <Input
              type="number"
              min="0"
              step="10"
              value={at.amount}
              onChange={(e) => update({ amount: parseFloat(e.target.value) || 0 })}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Frequency</label>
            <ToggleGroup
              options={[{ label: "Monthly", value: "monthly" }, { label: "Annually", value: "yearly" }]}
              value={at.frequency}
              onChange={(v) => update({ frequency: normalizeContributionFrequency(v) })}
            />
          </div>

          {/* Current return rate */}
          <div>
            <div className="flex justify-between mb-1">
              <label className="text-xs font-medium text-muted-foreground">Current Return Rate</label>
              <span className={`text-xs font-semibold ${at.currentReturnRate >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {at.currentReturnRate >= 0 ? "+" : ""}{formatPercentage(at.currentReturnRate)}/yr
              </span>
            </div>
            <CustomSlider
              min={-0.5}
              max={1.0}
              step={0.01}
              value={at.currentReturnRate}
              onChange={(v) => update({ currentReturnRate: v })}
            />
          </div>

          {/* Target return rate */}
          <div>
            <div className="flex justify-between mb-1">
              <label className="text-xs font-medium text-muted-foreground">Target Return Rate</label>
              <span className={`text-xs font-semibold ${at.targetReturnRate >= 0 ? "text-indigo-400" : "text-rose-400"}`}>
                {at.targetReturnRate >= 0 ? "+" : ""}{formatPercentage(at.targetReturnRate)}/yr
              </span>
            </div>
            <CustomSlider
              min={-0.5}
              max={1.0}
              step={0.01}
              value={at.targetReturnRate}
              onChange={(v) => update({ targetReturnRate: v })}
            />
          </div>

          {/* Risk level */}
          <div>
            <div className="flex justify-between mb-1">
              <label className="text-xs font-medium text-muted-foreground">Risk Level</label>
              <span className={`text-xs font-semibold ${riskColor}`}>
                {at.riskLevel}/10 — {riskLabels[at.riskLevel]}
              </span>
            </div>
            <CustomSlider
              min={1}
              max={10}
              step={1}
              value={at.riskLevel}
              onChange={(v) => update({ riskLevel: v })}
            />
          </div>

          {/* Summary row */}
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Monthly commitment</span>
              <span className="font-semibold text-foreground">
                {formatCurrency(at.frequency === "monthly" ? at.amount : at.amount / 12)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Current projected return</span>
              <span className={`font-semibold ${at.currentReturnRate >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {at.currentReturnRate >= 0 ? "+" : ""}{formatPercentage(at.currentReturnRate)}/yr
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Target projected return</span>
              <span className="font-semibold text-indigo-400">
                {at.targetReturnRate >= 0 ? "+" : ""}{formatPercentage(at.targetReturnRate)}/yr
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Main DataInputsPanel ─────────────────────────────────────────────────────

export function DataInputsPanel({ profile, updateProfile }: PanelProps) {
  const [dialogConfig, setDialogConfig] = React.useState<{
    isOpen: boolean;
    type: any;
    data?: any;
  }>({ isOpen: false, type: "income" });

  const handleSave = (type: keyof FinancialProfile, item: any) => {
    updateProfile((prev) => {
      const arr = prev[type] as any[];
      const exists = arr.find((i) => i.id === item.id);
      return {
        ...prev,
        [type]: exists ? arr.map((i) => (i.id === item.id ? item : i)) : [...arr, item],
      };
    });
  };

  const handleDelete = (type: keyof FinancialProfile, id: string) => {
    updateProfile((prev) => ({
      ...prev,
      [type]: (prev[type] as any[]).filter((i) => i.id !== id),
    }));
  };

  const openDialog = (type: any, data?: any) =>
    setDialogConfig({ isOpen: true, type, data });

  return (
    <div className="space-y-1">
      <AccordionItem
        title={<span className="flex items-center gap-2"><TrendingUp className="w-5 h-5 text-emerald-500" /> Income</span>}
        defaultOpen
      >
        <ItemList
          type="income"
          items={profile.income}
          displayFormat={(i: FinancialItem) => `${formatCurrency(i.amount)} / ${i.frequency}`}
          onEdit={(item) => openDialog("income", item)}
          onDelete={(id) => handleDelete("income", id)}
          onAdd={() => openDialog("income")}
        />
      </AccordionItem>

      <AccordionItem
        title={<span className="flex items-center gap-2"><TrendingDown className="w-5 h-5 text-rose-500" /> Expenses</span>}
      >
        <ItemList
          type="expenses"
          items={profile.expenses}
          displayFormat={(i: FinancialItem) => `${formatCurrency(i.amount)} / ${i.frequency}`}
          onEdit={(item) => openDialog("expenses", item)}
          onDelete={(id) => handleDelete("expenses", id)}
          onAdd={() => openDialog("expenses")}
        />
      </AccordionItem>

      <AccordionItem
        title={<span className="flex items-center gap-2"><Landmark className="w-5 h-5 text-indigo-400" /> Existing Assets</span>}
      >
        <ItemList
          type="assets"
          items={profile.assets}
          displayFormat={(i: AssetItem) => `${formatCurrency(i.amount)} @ ${formatPercentage(i.returnRate)}/yr`}
          onEdit={(item) => openDialog("assets", item)}
          onDelete={(id) => handleDelete("assets", id)}
          onAdd={() => openDialog("assets")}
        />
      </AccordionItem>

      <AccordionItem
        title={<span className="flex items-center gap-2"><PiggyBank className="w-5 h-5 text-sky-400" /> Rolling Investments</span>}
      >
        {/* Contribution sources */}
        <div className="mb-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Contribution Pool
          </p>
          <ItemList
            type="investments"
            items={profile.investments}
            displayFormat={(i: InvestmentItem) =>
              `${formatCurrency(i.amount)} / ${i.frequency}`
            }
            onEdit={(item) => openDialog("investments", item)}
            onDelete={(id) => handleDelete("investments", id)}
            onAdd={() => openDialog("investments")}
          />
        </div>

        {/* Bucket allocation */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Allocation Buckets
          </p>
          <BucketEditor
            buckets={profile.investmentBuckets}
            onChange={(buckets) =>
              updateProfile((prev) => ({ ...prev, investmentBuckets: buckets }))
            }
          />
        </div>
      </AccordionItem>

      {/* Active Trading accordion */}
      <AccordionItem
        title={
          <span className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-400" /> Active Trading
            {profile.activeTrading.enabled && (
              <span className="ml-auto text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">
                Live
              </span>
            )}
          </span>
        }
      >
        <ActiveTradingPanel profile={profile} updateProfile={updateProfile} />
      </AccordionItem>

      <ItemFormDialog
        isOpen={dialogConfig.isOpen}
        onClose={() => setDialogConfig({ ...dialogConfig, isOpen: false })}
        type={dialogConfig.type}
        initialData={dialogConfig.data}
        onSave={(item) => handleSave(dialogConfig.type as keyof FinancialProfile, item)}
      />
    </div>
  );
}

// ── Scenario Panel ───────────────────────────────────────────────────────────

export function ScenarioPanel({ profile, updateProfile }: PanelProps) {
  const s = profile.scenarioSettings;
  const updateSettings = (updates: Partial<typeof s>) => {
    updateProfile((prev) => ({
      ...prev,
      scenarioSettings: { ...prev.scenarioSettings, ...updates },
    }));
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex justify-between mb-2">
          <label className="text-sm font-medium text-muted-foreground">Income Modifier</label>
          <span className="text-sm font-display text-emerald-400">
            {(s.incomeModifier * 100).toFixed(0)}%
          </span>
        </div>
        <CustomSlider
          min={0.5} max={2.0} step={0.05}
          value={s.incomeModifier}
          onChange={(v) => updateSettings({ incomeModifier: v })}
        />
      </div>

      <div>
        <div className="flex justify-between mb-2">
          <label className="text-sm font-medium text-muted-foreground">Expense Modifier</label>
          <span className="text-sm font-display text-rose-400">
            {(s.expenseModifier * 100).toFixed(0)}%
          </span>
        </div>
        <CustomSlider
          min={0.5} max={2.0} step={0.05}
          value={s.expenseModifier}
          onChange={(v) => updateSettings({ expenseModifier: v })}
        />
      </div>

      <div>
        <div className="flex justify-between mb-2">
          <label className="text-sm font-medium text-muted-foreground">Global Investment Return</label>
          <span className="text-sm font-display text-indigo-400">
            {s.investmentReturnOverride === -1
              ? "Use Individual"
              : formatPercentage(s.investmentReturnOverride)}
          </span>
        </div>
        <CustomSlider
          min={-0.01} max={0.3} step={0.005}
          value={s.investmentReturnOverride}
          onChange={(v) => updateSettings({ investmentReturnOverride: v < 0 ? -1 : v })}
        />
      </div>

      {/* Target allocation toggle */}
      <div className="flex items-center justify-between pt-2 border-t border-border/50">
        <div>
          <p className="text-sm font-medium text-foreground">Use Target Allocations</p>
          <p className="text-xs text-muted-foreground">
            Project using your target bucket splits &amp; trading return
          </p>
        </div>
        <button
          onClick={() => updateSettings({ useTargetAllocations: !s.useTargetAllocations })}
          className={`w-12 h-6 rounded-full transition-colors relative ${s.useTargetAllocations ? "bg-primary" : "bg-secondary"}`}
        >
          <span
            className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${s.useTargetAllocations ? "translate-x-7" : "translate-x-1"}`}
          />
        </button>
      </div>

      <div className="pt-2 border-t border-border/50">
        <label className="block text-sm font-medium text-muted-foreground mb-3">
          Projection Timeframe:{" "}
          <span className="text-foreground">{s.timeframeYears} Years</span>
        </label>
        <CustomSlider
          min={1} max={30} step={1}
          value={s.timeframeYears}
          onChange={(v) => updateSettings({ timeframeYears: v })}
        />
      </div>

      {/* Goals */}
      <div className="pt-2 border-t border-border/50">
        <p className="text-sm font-medium text-muted-foreground mb-2">Goals</p>
        <p className="text-xs text-muted-foreground mb-3">
          Target amount by year (relative to today)
        </p>
        <div className="space-y-3">
          {(s.goals ?? []).map((g) => (
            <div
              key={g.id}
              className="flex items-center gap-2 p-3 bg-secondary/30 rounded-xl border border-border/50"
            >
              <Input
                className="flex-1 min-w-0 text-sm"
                placeholder="Name"
                value={g.name}
                onChange={(e) =>
                  updateSettings({
                    goals: (s.goals ?? []).map((x) =>
                      x.id === g.id ? { ...x, name: e.target.value } : x
                    ),
                  })
                }
              />
              <Input
                type="number"
                className="w-24 text-sm"
                placeholder="Amount"
                value={g.targetAmount || ""}
                onChange={(e) =>
                  updateSettings({
                    goals: (s.goals ?? []).map((x) =>
                      x.id === g.id ? { ...x, targetAmount: parseFloat(e.target.value) || 0 } : x
                    ),
                  })
                }
              />
              <Input
                type="number"
                className="w-16 text-sm"
                placeholder="Yr"
                value={g.targetYear || ""}
                onChange={(e) =>
                  updateSettings({
                    goals: (s.goals ?? []).map((x) =>
                      x.id === g.id ? { ...x, targetYear: parseFloat(e.target.value) || 0 } : x
                    ),
                  })
                }
              />
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 shrink-0 hover:bg-destructive/10"
                onClick={() =>
                  updateSettings({
                    goals: (s.goals ?? []).filter((x) => x.id !== g.id),
                  })
                }
              >
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            className="w-full border-dashed text-sm"
            onClick={() =>
              updateSettings({
                goals: [
                  ...(s.goals ?? []),
                  {
                    id: uuidv4(),
                    name: "",
                    targetAmount: 0,
                    targetYear: 5,
                  } as FinancialGoal,
                ],
              })
            }
          >
            <Plus className="w-4 h-4 mr-2" /> Add Goal
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Advanced Settings Panel ──────────────────────────────────────────────────

export function AdvancedSettingsPanel({ profile, updateProfile }: PanelProps) {
  const s = profile.scenarioSettings;
  const updateSettings = (updates: Partial<typeof s>) => {
    updateProfile((prev) => ({
      ...prev,
      scenarioSettings: { ...prev.scenarioSettings, ...updates },
    }));
  };

  return (
    <div className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-muted-foreground mb-2">
          Compounding Frequency
        </label>
        <ToggleGroup
          options={[
            { label: "Annual", value: "annual" },
            { label: "Quarterly", value: "quarterly" },
            { label: "Monthly", value: "monthly" },
          ]}
          value={s.compoundingFrequency}
          onChange={(v) => updateSettings({ compoundingFrequency: normalizeCompoundingFrequency(v) })}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-muted-foreground mb-2">
          Inflation Rate (%)
        </label>
        <Input
          type="number"
          step="0.1"
          value={(s.inflationRate * 100).toFixed(1)}
          onChange={(e) =>
            updateSettings({ inflationRate: parseFloat(e.target.value) / 100 })
          }
        />
        <p className="text-xs text-muted-foreground mt-2">
          Reduces real investment return and purchasing power.
        </p>
      </div>
    </div>
  );
}
