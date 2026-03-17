DEFAULT_USER_ID = "default"

DEFAULT_PROFILE_DATA = {
    "income": [
        {"id": "inc-1", "name": "Primary Salary", "amount": 6000, "frequency": "monthly"},
        {"id": "inc-2", "name": "Side Hustle", "amount": 500, "frequency": "monthly"},
    ],
    "expenses": [
        {"id": "exp-1", "name": "Rent / Mortgage", "amount": 1800, "frequency": "monthly"},
        {"id": "exp-2", "name": "Groceries", "amount": 400, "frequency": "monthly"},
        {"id": "exp-3", "name": "Utilities", "amount": 150, "frequency": "monthly"},
        {"id": "exp-4", "name": "Travel & Leisure", "amount": 3000, "frequency": "yearly"},
        {"id": "exp-5", "name": "Subscriptions", "amount": 80, "frequency": "monthly"},
    ],
    "assets": [
        {"id": "ast-1", "name": "Emergency Fund (Cash)", "amount": 15000, "returnRate": 0.04},
        {"id": "ast-2", "name": "Brokerage Portfolio", "amount": 45000, "returnRate": 0.08},
        {"id": "ast-3", "name": "401k / Pension", "amount": 80000, "returnRate": 0.07},
    ],
    "investments": [
        {"id": "inv-1", "name": "Monthly Contributions", "amount": 1000, "frequency": "monthly", "returnRate": 0.08},
    ],
    "investmentBuckets": [
        {"id": "bkt-1", "name": "Long-term ETFs", "currentAllocationPct": 60, "targetAllocationPct": 65, "returnRate": 0.08},
        {"id": "bkt-2", "name": "Mid-term Equity", "currentAllocationPct": 30, "targetAllocationPct": 25, "returnRate": 0.10},
        {"id": "bkt-3", "name": "Risky / Alts", "currentAllocationPct": 10, "targetAllocationPct": 10, "returnRate": 0.15},
    ],
    "activeTrading": {
        "enabled": True,
        "amount": 200,
        "frequency": "monthly",
        "currentReturnRate": 0.12,
        "targetReturnRate": 0.20,
        "riskLevel": 7,
    },
    "scenarioSettings": {
        "expenseModifier": 1.0,
        "incomeModifier": 1.0,
        "investmentReturnOverride": -1,
        "inflationRate": 0.02,
        "compoundingFrequency": "monthly",
        "timeframeYears": 10,
        "useTargetAllocations": False,
        "goals": [],
    },
}
