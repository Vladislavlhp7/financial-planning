from pydantic import BaseModel, ConfigDict, Field, model_validator


class FinancialItem(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    name: str
    amount: float
    frequency: str  # "monthly" | "yearly"


class AssetItem(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    name: str
    amount: float
    returnRate: float


class InvestmentItem(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    name: str
    amount: float
    frequency: str  # "monthly" | "yearly"
    returnRate: float


class InvestmentBucket(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    name: str
    currentAllocationPct: float
    targetAllocationPct: float
    returnRate: float


class ActiveTradingConfig(BaseModel):
    model_config = ConfigDict(extra="ignore")

    enabled: bool
    amount: float
    frequency: str  # "monthly" | "yearly"
    currentReturnRate: float
    targetReturnRate: float
    riskLevel: int = Field(ge=1, le=10)


class FinancialGoal(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    name: str
    targetAmount: float
    targetYear: float  # relative year (e.g. 5, 10, 20)


class ScenarioSettings(BaseModel):
    model_config = ConfigDict(extra="ignore")

    expenseModifier: float
    incomeModifier: float
    investmentReturnOverride: float
    inflationRate: float
    compoundingFrequency: str  # "annual" | "monthly" | "quarterly"
    timeframeYears: int
    useTargetAllocations: bool
    goals: list[FinancialGoal] = Field(default_factory=list)


class FinancialProfile(BaseModel):
    model_config = ConfigDict(extra="ignore")

    income: list[FinancialItem] = Field(default_factory=list)
    expenses: list[FinancialItem] = Field(default_factory=list)
    assets: list[AssetItem] = Field(default_factory=list)
    investments: list[InvestmentItem] = Field(default_factory=list)
    investmentBuckets: list[InvestmentBucket] = Field(default_factory=list)
    activeTrading: ActiveTradingConfig
    scenarioSettings: ScenarioSettings

    @model_validator(mode="before")
    @classmethod
    def normalize_legacy_payload(cls, data):
        if not isinstance(data, dict):
            return data

        normalized = dict(data)

        for key in ("income", "expenses", "assets", "investments", "investmentBuckets"):
            if normalized.get(key) is None:
                normalized[key] = []

        active_trading = normalized.get("activeTrading")
        if not isinstance(active_trading, dict):
            active_trading = {}
        active_trading_defaults = {
            "enabled": False,
            "amount": 0,
            "frequency": "monthly",
            "currentReturnRate": 0,
            "targetReturnRate": 0,
            "riskLevel": 5,
        }
        for key, value in active_trading_defaults.items():
            if active_trading.get(key) is None:
                active_trading[key] = value
        normalized["activeTrading"] = active_trading

        scenario_settings = normalized.get("scenarioSettings")
        if not isinstance(scenario_settings, dict):
            scenario_settings = {}
        scenario_settings_defaults = {
            "expenseModifier": 1,
            "incomeModifier": 1,
            "investmentReturnOverride": -1,
            "inflationRate": 0.02,
            "compoundingFrequency": "monthly",
            "timeframeYears": 10,
            "useTargetAllocations": False,
            "goals": [],
        }
        for key, value in scenario_settings_defaults.items():
            if scenario_settings.get(key) is None:
                scenario_settings[key] = value
        normalized["scenarioSettings"] = scenario_settings

        return normalized
