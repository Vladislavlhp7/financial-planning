import * as React from "react";
import {
  postBalanceSheet,
  postBalanceSheetExportCsv,
  type BalanceSheetResponse,
  type BalanceSheetRow,
  type FinancialProfile,
} from "@workspace/api-client-react";
import { Card } from "@/components/ui/core";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AssetMixPieChart } from "@/components/charts";
import { formatCurrency, formatPercentage } from "@/lib/utils";
import { Download, FileSpreadsheet, Loader2 } from "lucide-react";

function formatCell(row: BalanceSheetRow, key: "amount" | "amountAnnualized" | "amountScenarioAnnualized" | "returnRate"): string {
  const v =
    key === "amount"
      ? row.amount
      : key === "amountAnnualized"
        ? row.amountAnnualized
        : key === "amountScenarioAnnualized"
          ? row.amountScenarioAnnualized
          : row.returnRate;
  if (v == null) return "—";
  if (key === "returnRate" || row.unit === "rate") return formatPercentage(v);
  if (row.unit === "percent" || row.pctCurrent != null) return `${Number(v).toFixed(1)}%`;
  if (row.unit === "text") return "—";
  return formatCurrency(Number(v), true);
}

function BalanceRows({ rows }: { rows: BalanceSheetRow[] }) {
  return (
    <>
      {rows.map((row, idx) => {
        if (row.rowType === "header") {
          return (
            <TableRow key={`h-${idx}`} className="bg-secondary/40 hover:bg-secondary/40">
              <TableCell colSpan={9} className="font-semibold text-foreground py-2">
                {row.name}
              </TableCell>
            </TableRow>
          );
        }
        const strong = row.rowType === "subtotal";
        return (
          <TableRow key={`r-${idx}-${row.id}-${row.name}`} className={strong ? "bg-secondary/20" : undefined}>
            <TableCell className={strong ? "font-semibold" : ""}>{row.name}</TableCell>
            <TableCell className="tabular-nums text-right">{formatCell(row, "amount")}</TableCell>
            <TableCell className="tabular-nums text-right">{formatCell(row, "amountAnnualized")}</TableCell>
            <TableCell className="tabular-nums text-right">{formatCell(row, "amountScenarioAnnualized")}</TableCell>
            <TableCell className="text-muted-foreground text-xs">{row.frequency || "—"}</TableCell>
            <TableCell className="tabular-nums text-right">{formatCell(row, "returnRate")}</TableCell>
            <TableCell className="tabular-nums text-right">
              {row.pctCurrent != null ? `${row.pctCurrent.toFixed(1)}%` : "—"}
            </TableCell>
            <TableCell className="tabular-nums text-right">
              {row.pctTarget != null ? `${row.pctTarget.toFixed(1)}%` : "—"}
            </TableCell>
            <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate" title={row.note}>
              {row.note || "—"}
            </TableCell>
          </TableRow>
        );
      })}
    </>
  );
}

export function BalanceSheetPanel({ profile }: { profile: FinancialProfile }) {
  const [sheet, setSheet] = React.useState<BalanceSheetResponse | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [exporting, setExporting] = React.useState(false);

  const profileKey = React.useMemo(() => JSON.stringify(profile), [profile]);
  const profileRef = React.useRef(profile);
  profileRef.current = profile;

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    const handle = window.setTimeout(() => {
      postBalanceSheet(profileRef.current)
        .then((res) => {
          if (!cancelled) {
            setSheet(res);
            setLoadError(null);
          }
        })
        .catch((e: unknown) => {
          if (!cancelled) {
            setSheet(null);
            setLoadError(e instanceof Error ? e.message : "Failed to load balance sheet");
          }
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 400);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [profileKey]);

  const onExportCsv = React.useCallback(async () => {
    setExporting(true);
    try {
      const blob = await postBalanceSheetExportCsv(profile);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `balance-sheet-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }, [profile]);

  return (
    <Card className="p-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
            <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-lg font-display font-semibold">Balance sheet</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Snapshot of assets, cash flows, buckets, and totals — matches CSV export.
            </p>
            {sheet?.generatedAt && (
              <p className="text-xs text-muted-foreground mt-1 tabular-nums">Generated {sheet.generatedAt}</p>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => void onExportCsv()}
          disabled={exporting}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/35 hover:bg-emerald-500/25 transition-colors disabled:opacity-50 shrink-0"
        >
          {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          Export CSV
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-1">
          <h4 className="text-sm font-medium text-muted-foreground mb-3">Asset mix</h4>
          <AssetMixPieChart assets={profile.assets} />
        </div>
        <div className="lg:col-span-2 min-h-[200px] flex items-center justify-center border border-dashed border-border/60 rounded-xl bg-secondary/20">
          {loading && (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Loader2 className="w-5 h-5 animate-spin" />
              Updating sheet…
            </div>
          )}
          {!loading && loadError && <p className="text-sm text-rose-400 px-4 text-center">{loadError}</p>}
          {!loading && !loadError && sheet && (
            <div className="w-full p-4 text-center">
              <p className="text-2xl font-display font-bold text-foreground">
                {formatCurrency(
                  sheet.sections.find((s) => s.id === "totals")?.rows.find((r) => r.name === "Total assets")?.amount ?? 0,
                  true
                )}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Total assets</p>
              <p className="text-lg font-semibold text-foreground mt-4 tabular-nums">
                {formatCurrency(
                  sheet.sections.find((s) => s.id === "totals")?.rows.find((r) => r.name.includes("Annual net cash"))
                    ?.amountAnnualized ?? 0,
                  true
                )}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Annual net cash flow</p>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Name</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Annual</TableHead>
              <TableHead className="text-right">Scenario adj.</TableHead>
              <TableHead>Freq</TableHead>
              <TableHead className="text-right">Return</TableHead>
              <TableHead className="text-right">% cur</TableHead>
              <TableHead className="text-right">% tgt</TableHead>
              <TableHead>Note</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground py-10">
                  Loading…
                </TableCell>
              </TableRow>
            )}
            {!loading && loadError && (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-rose-400 py-10">
                  {loadError}
                </TableCell>
              </TableRow>
            )}
            {!loading &&
              !loadError &&
              sheet?.sections.map((sec) => (
                <React.Fragment key={sec.id}>
                  <TableRow className="bg-primary/10 hover:bg-primary/10">
                    <TableCell colSpan={9} className="font-display font-semibold text-primary py-2">
                      {sec.title}
                    </TableCell>
                  </TableRow>
                  <BalanceRows rows={sec.rows} />
                </React.Fragment>
              ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
