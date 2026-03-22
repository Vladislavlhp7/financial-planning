"""Build balance-sheet sections and CSV export from a financial profile."""
import csv
import io
from datetime import datetime, timezone

from app.schemas.balance_sheet import BalanceSheetResponse, BalanceSheetRow, BalanceSheetSection
from app.schemas.financial import FinancialProfile
from app.services.number_utils import finite_float, strip_nonfinite
from app.services.profile_summary import compute_profile_summary, get_annual_amount


def _iso_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def build_balance_sheet_response(profile: FinancialProfile) -> BalanceSheetResponse:
    generated = _iso_now()
    data = profile.model_dump()
    summary = compute_profile_summary(data)
    ss = data.get("scenarioSettings") or {}
    if not isinstance(ss, dict):
        ss = {}
    income_mod = finite_float(ss.get("incomeModifier", 1) or 1, default=1.0) or 1.0
    expense_mod = finite_float(ss.get("expenseModifier", 1) or 1, default=1.0) or 1.0
    use_target = ss.get("useTargetAllocations", False)
    at = data.get("activeTrading") or {}

    sections: list[BalanceSheetSection] = []

    sections.append(
        BalanceSheetSection(
            id="meta",
            title="Report",
            rows=[
                BalanceSheetRow(
                    rowType="line",
                    name="Generated at (UTC)",
                    note=generated,
                    unit="text",
                ),
            ],
        )
    )

    asset_rows: list[BalanceSheetRow] = [
        BalanceSheetRow(rowType="header", name="Assets"),
    ]
    for a in data.get("assets") or []:
        if not isinstance(a, dict):
            continue
        asset_rows.append(
            BalanceSheetRow(
                rowType="line",
                id=str(a.get("id", "")),
                name=str(a.get("name", "")),
                amount=finite_float(a.get("amount", 0) or 0),
                returnRate=finite_float(a.get("returnRate", 0) or 0),
                unit="currency",
                note="balance",
            )
        )
    asset_rows.append(
        BalanceSheetRow(
            rowType="subtotal",
            name="Total assets",
            amount=summary["totalCurrentAssets"],
            unit="currency",
        )
    )
    sections.append(BalanceSheetSection(id="assets", title="Assets", rows=asset_rows))

    inv_rows: list[BalanceSheetRow] = [
        BalanceSheetRow(rowType="header", name="Investment contributions"),
    ]
    for inv in data.get("investments") or []:
        if not isinstance(inv, dict):
            continue
        freq = str(inv.get("frequency", "monthly"))
        raw_amt = finite_float(inv.get("amount", 0) or 0)
        ann = get_annual_amount(inv)
        inv_rows.append(
            BalanceSheetRow(
                rowType="line",
                id=str(inv.get("id", "")),
                name=str(inv.get("name", "")),
                amount=raw_amt,
                amountAnnualized=ann,
                frequency=freq,
                returnRate=finite_float(inv.get("returnRate", 0) or 0),
                unit="currency",
                note="contribution",
            )
        )
    inv_rows.append(
        BalanceSheetRow(
            rowType="subtotal",
            name="Total annual investment contributions",
            amountAnnualized=summary["annualInvestments"],
            unit="currency",
        )
    )
    sections.append(
        BalanceSheetSection(id="investments", title="Investment contributions", rows=inv_rows)
    )

    inc_rows: list[BalanceSheetRow] = [
        BalanceSheetRow(rowType="header", name="Income"),
    ]
    for item in data.get("income") or []:
        if not isinstance(item, dict):
            continue
        raw_ann = get_annual_amount(item)
        inc_rows.append(
            BalanceSheetRow(
                rowType="line",
                id=str(item.get("id", "")),
                name=str(item.get("name", "")),
                amount=finite_float(item.get("amount", 0) or 0),
                amountAnnualized=raw_ann,
                amountScenarioAnnualized=finite_float(raw_ann * income_mod),
                frequency=str(item.get("frequency", "monthly")),
                unit="currency",
            )
        )
    inc_rows.append(
        BalanceSheetRow(
            rowType="subtotal",
            name="Total income (annual)",
            amountAnnualized=summary["rawAnnualIncome"],
            amountScenarioAnnualized=summary["annualIncome"],
            unit="currency",
            note=f"scenario income modifier ×{income_mod}",
        )
    )
    sections.append(BalanceSheetSection(id="income", title="Income", rows=inc_rows))

    exp_rows: list[BalanceSheetRow] = [
        BalanceSheetRow(rowType="header", name="Expenses"),
    ]
    for item in data.get("expenses") or []:
        if not isinstance(item, dict):
            continue
        raw_ann = get_annual_amount(item)
        exp_rows.append(
            BalanceSheetRow(
                rowType="line",
                id=str(item.get("id", "")),
                name=str(item.get("name", "")),
                amount=finite_float(item.get("amount", 0) or 0),
                amountAnnualized=raw_ann,
                amountScenarioAnnualized=finite_float(raw_ann * expense_mod),
                frequency=str(item.get("frequency", "monthly")),
                unit="currency",
            )
        )
    exp_rows.append(
        BalanceSheetRow(
            rowType="subtotal",
            name="Total expenses (annual)",
            amountAnnualized=summary["rawAnnualExpenses"],
            amountScenarioAnnualized=summary["annualExpenses"],
            unit="currency",
            note=f"scenario expense modifier ×{expense_mod}",
        )
    )
    sections.append(BalanceSheetSection(id="expenses", title="Expenses", rows=exp_rows))

    bucket_rows: list[BalanceSheetRow] = [
        BalanceSheetRow(rowType="header", name="Investment bucket allocation"),
        BalanceSheetRow(
            rowType="line",
            name="Allocation basis",
            note="target" if use_target else "current",
            unit="text",
        ),
    ]
    bd = summary.get("bucketBreakdown") or []
    for item in bd:
        if not isinstance(item, dict):
            continue
        b = item.get("bucket")
        if not isinstance(b, dict):
            continue
        annual_amt = finite_float(item.get("annualAmount", 0))
        bucket_rows.append(
            BalanceSheetRow(
                rowType="line",
                id=str(b.get("id", "")),
                name=str(b.get("name", "")),
                amountAnnualized=annual_amt,
                returnRate=finite_float(b.get("returnRate", 0) or 0),
                pctCurrent=finite_float(b.get("currentAllocationPct", 0) or 0),
                pctTarget=finite_float(b.get("targetAllocationPct", 0) or 0),
                unit="currency",
                note="estimated annual to bucket from contribution pool",
            )
        )
    sections.append(
        BalanceSheetSection(id="investment_buckets", title="Investment buckets", rows=bucket_rows)
    )

    at_rows: list[BalanceSheetRow] = [
        BalanceSheetRow(rowType="header", name="Active trading"),
        BalanceSheetRow(
            rowType="line",
            name="Enabled",
            note="yes" if at.get("enabled") else "no",
            unit="text",
        ),
    ]
    if at.get("enabled"):
        at_rows.append(
            BalanceSheetRow(
                rowType="line",
                name="Contribution",
                amount=finite_float(at.get("amount", 0) or 0),
                amountAnnualized=get_annual_amount(at),
                frequency=str(at.get("frequency", "monthly")),
                returnRate=finite_float(at.get("currentReturnRate", 0) or 0),
                unit="currency",
                note="current return rate (decimal)",
            )
        )
        at_rows.append(
            BalanceSheetRow(
                rowType="line",
                name="Target return rate",
                returnRate=finite_float(at.get("targetReturnRate", 0) or 0),
                unit="rate",
                note="decimal",
            )
        )
        at_rows.append(
            BalanceSheetRow(
                rowType="line",
                name="Risk level",
                note=str(at.get("riskLevel", "")),
                unit="text",
            )
        )
    sections.append(BalanceSheetSection(id="active_trading", title="Active trading", rows=at_rows))

    goal_rows: list[BalanceSheetRow] = [BalanceSheetRow(rowType="header", name="Goals")]
    goals = ss.get("goals") or []
    if not goals:
        goal_rows.append(
            BalanceSheetRow(rowType="line", name="—", note="No goals defined", unit="text")
        )
    else:
        for g in goals:
            if not isinstance(g, dict):
                continue
            goal_rows.append(
                BalanceSheetRow(
                    rowType="line",
                    id=str(g.get("id", "")),
                    name=str(g.get("name", "")),
                    amount=finite_float(g.get("targetAmount", 0) or 0),
                    note=f"target year offset {g.get('targetYear', '')}",
                    unit="currency",
                )
            )
    sections.append(BalanceSheetSection(id="goals", title="Goals", rows=goal_rows))

    total_rows: list[BalanceSheetRow] = [
        BalanceSheetRow(rowType="header", name="Totals"),
        BalanceSheetRow(
            rowType="line",
            name="Total assets",
            amount=summary["totalCurrentAssets"],
            unit="currency",
        ),
        BalanceSheetRow(
            rowType="line",
            name="Annual net cash flow (after investments & active trading)",
            amountAnnualized=summary["annualNetCashFlow"],
            unit="currency",
        ),
        BalanceSheetRow(
            rowType="line",
            name="Annual investment contributions",
            amountAnnualized=summary["annualInvestments"],
            unit="currency",
        ),
        BalanceSheetRow(
            rowType="line",
            name="Annual active trading contribution",
            amountAnnualized=summary["annualActiveTrading"],
            unit="currency",
        ),
    ]
    sections.append(BalanceSheetSection(id="totals", title="Totals", rows=total_rows))

    raw_response = BalanceSheetResponse(generatedAt=generated, sections=sections)
    safe = strip_nonfinite(raw_response.model_dump())
    return BalanceSheetResponse.model_validate(safe)


_CSV_FIELDS = [
    "section_id",
    "section_title",
    "row_type",
    "id",
    "name",
    "amount",
    "amount_annualized",
    "amount_scenario_annualized",
    "unit",
    "frequency",
    "return_rate",
    "pct_current",
    "pct_target",
    "note",
]


def balance_sheet_to_csv(response: BalanceSheetResponse) -> str:
    buf = io.StringIO()
    writer = csv.DictWriter(buf, fieldnames=_CSV_FIELDS, extrasaction="ignore")
    writer.writeheader()
    for sec in response.sections:
        for row in sec.rows:
            writer.writerow(
                {
                    "section_id": sec.id,
                    "section_title": sec.title,
                    "row_type": row.rowType,
                    "id": row.id,
                    "name": row.name,
                    "amount": row.amount if row.amount is not None else "",
                    "amount_annualized": row.amountAnnualized if row.amountAnnualized is not None else "",
                    "amount_scenario_annualized": (
                        row.amountScenarioAnnualized
                        if row.amountScenarioAnnualized is not None
                        else ""
                    ),
                    "unit": row.unit,
                    "frequency": row.frequency,
                    "return_rate": row.returnRate if row.returnRate is not None else "",
                    "pct_current": row.pctCurrent if row.pctCurrent is not None else "",
                    "pct_target": row.pctTarget if row.pctTarget is not None else "",
                    "note": row.note,
                }
            )
    return buf.getvalue()


def balance_sheet_csv_filename() -> str:
    day = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    return f"balance-sheet-{day}.csv"
