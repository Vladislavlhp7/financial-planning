"""Shared profile aggregates (mirrors frontend calculateSummary)."""

from app.services.number_utils import finite_float


def get_annual_amount(item: dict) -> float:
    if not isinstance(item, dict):
        return 0.0
    freq = item.get("frequency", "monthly")
    amount = finite_float(item.get("amount", 0) or 0)
    raw = amount * 12 if freq == "monthly" else amount
    return finite_float(raw)


def compute_profile_summary(profile: dict) -> dict:
    ss = profile.get("scenarioSettings", {}) or {}
    if not isinstance(ss, dict):
        ss = {}
    buckets = profile.get("investmentBuckets") or []
    if not isinstance(buckets, list):
        buckets = []
    at = profile.get("activeTrading") or {}
    if not isinstance(at, dict):
        at = {}

    raw_income = sum(
        get_annual_amount(i) for i in (profile.get("income") or []) if isinstance(i, dict)
    )
    raw_expenses = sum(
        get_annual_amount(i) for i in (profile.get("expenses") or []) if isinstance(i, dict)
    )
    raw_inv = sum(
        get_annual_amount(i) for i in (profile.get("investments") or []) if isinstance(i, dict)
    )

    income_mod = finite_float(ss.get("incomeModifier", 1) or 1, default=1.0) or 1.0
    expense_mod = finite_float(ss.get("expenseModifier", 1) or 1, default=1.0) or 1.0

    annual_income = finite_float(raw_income * income_mod)
    annual_expenses = finite_float(raw_expenses * expense_mod)
    annual_investments = finite_float(raw_inv)
    annual_active = get_annual_amount(at) if at.get("enabled") else 0.0
    annual_net_cash = finite_float(annual_income - annual_expenses - annual_investments - annual_active)
    total_assets = sum(
        finite_float(a.get("amount", 0) or 0)
        for a in (profile.get("assets") or [])
        if isinstance(a, dict)
    )
    total_assets = finite_float(total_assets)

    use_target = bool(ss.get("useTargetAllocations", False))
    pct_key = "targetAllocationPct" if use_target else "currentAllocationPct"
    total_pct = sum(
        finite_float(b.get(pct_key, 0) or 0)
        for b in buckets
        if isinstance(b, dict)
    )
    if total_pct <= 0:
        total_pct = 100.0

    bucket_breakdown = []
    for b in buckets:
        if not isinstance(b, dict):
            continue
        pct = finite_float(b.get(pct_key, 0) or 0)
        annual_amt = finite_float(annual_investments * (pct / total_pct))
        bucket_breakdown.append({"bucket": b, "annualAmount": annual_amt})

    return {
        "annualIncome": annual_income,
        "annualExpenses": annual_expenses,
        "annualInvestments": annual_investments,
        "annualActiveTrading": finite_float(annual_active),
        "annualNetCashFlow": annual_net_cash,
        "totalCurrentAssets": total_assets,
        "bucketBreakdown": bucket_breakdown,
        "rawAnnualIncome": finite_float(raw_income),
        "rawAnnualExpenses": finite_float(raw_expenses),
    }
