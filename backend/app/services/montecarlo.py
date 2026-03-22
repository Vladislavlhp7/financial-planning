"""Monte Carlo simulation for wealth projections."""
import numpy as np
from app.schemas.financial import FinancialProfile
from app.services.profile_summary import compute_profile_summary, get_annual_amount


def run_monte_carlo(profile: FinancialProfile, runs: int = 1000) -> list[dict]:
    """Run Monte Carlo simulations and return percentile bands per year."""
    data = profile.model_dump()
    ss = data.get("scenarioSettings", {})
    assets = data.get("assets", [])
    buckets = data.get("investmentBuckets", [])
    investments = data.get("investments", [])
    at = data.get("activeTrading", {})

    years_to_project = ss.get("timeframeYears", 10)
    inflation = ss.get("inflationRate", 0)
    override = ss.get("investmentReturnOverride", -1)
    use_target = ss.get("useTargetAllocations", False)

    def get_rate(base: float) -> float:
        nominal = override if override >= 0 else base
        return max(-0.99, nominal - inflation)

    summary = compute_profile_summary(data)
    annual_net_cash = summary["annualNetCashFlow"]
    total_assets = summary["totalCurrentAssets"]
    bucket_breakdown = summary["bucketBreakdown"]

    trading_return = (
        at.get("targetReturnRate", 0) if use_target else at.get("currentReturnRate", 0)
    )
    trading_enabled = at.get("enabled", False)
    trading_annual = get_annual_amount(at) if trading_enabled else 0

    key_years = [y for y in [0, 1, 2, 3, 5, 7, 10, 15, 20, 25, 30] if y <= years_to_project]
    if years_to_project not in key_years:
        key_years.append(years_to_project)
    key_years.sort()

    max_year = max(key_years)
    if max_year == 0:
        return [{"year": 0, "p10": total_assets, "p25": total_assets, "p50": total_assets, "p75": total_assets, "p90": total_assets}]

    # --- Existing assets ---
    assets_components = []
    for a in assets:
        base_r = a.get("returnRate", 0)
        r = get_rate(base_r)
        vol = max(0.01, abs(base_r) * 0.6)
        amount = a.get("amount", 0)
        yearly_returns = np.random.normal(r, vol, (runs, max_year))
        growth = np.cumprod(1 + yearly_returns, axis=1)
        assets_components.append(amount * growth)
    assets_matrix = (
        np.sum(assets_components, axis=0)
        if assets_components
        else np.zeros((runs, max_year))
    )

    # --- Bucket investments (annuity with random returns) ---
    def annuity_path(annual_pmt: float, base_r: float, vol: float, years: int) -> np.ndarray:
        r = get_rate(base_r)
        yearly_returns = np.random.normal(r, max(0.01, vol), (runs, years))
        balance = np.zeros((runs, years + 1))
        for t in range(1, years + 1):
            balance[:, t] = balance[:, t - 1] * (1 + yearly_returns[:, t - 1]) + annual_pmt
        return balance[:, 1:]  # (runs, years)

    buckets_matrix = np.zeros((runs, max_year))
    if bucket_breakdown:
        for item in bucket_breakdown:
            b = item["bucket"]
            annual_amt = item["annualAmount"]
            base_r = b.get("returnRate", 0)
            vol = abs(base_r) * 0.6
            buckets_matrix += annuity_path(annual_amt, base_r, vol, max_year)
    else:
        for inv in investments:
            annual_amt = get_annual_amount(inv)
            base_r = inv.get("returnRate", 0)
            vol = abs(base_r) * 0.6
            buckets_matrix += annuity_path(annual_amt, base_r, vol, max_year)

    # --- Active trading ---
    if trading_enabled:
        vol = (at.get("riskLevel", 5) / 10) * abs(trading_return)
        trading_matrix = annuity_path(trading_annual, trading_return, vol, max_year)
    else:
        trading_matrix = np.zeros((runs, max_year))

    # --- Cash (deterministic) ---
    cash_per_year = np.maximum(0, annual_net_cash) * np.arange(1, max_year + 1)
    cash_matrix = np.broadcast_to(cash_per_year, (runs, max_year))

    # --- Net worth ---
    net_worth = assets_matrix + buckets_matrix + trading_matrix + cash_matrix

    # --- Extract percentiles at key years ---
    bands = []
    for year in key_years:
        if year == 0:
            vals = np.full(runs, total_assets)
        else:
            idx = year - 1
            vals = net_worth[:, idx]
        p10, p25, p50, p75, p90 = np.percentile(vals, [10, 25, 50, 75, 90])
        bands.append({
            "year": year,
            "p10": float(p10),
            "p25": float(p25),
            "p50": float(p50),
            "p75": float(p75),
            "p90": float(p90),
        })
    return bands
