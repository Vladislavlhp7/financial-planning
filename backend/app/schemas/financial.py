from pydantic import BaseModel, Field


class FinancialItem(BaseModel):
    id: str
    name: str
    amount: float
    frequency: str  # "monthly" | "yearly"


class AssetItem(BaseModel):
    id: str
    name: str
    amount: float
    returnRate: float


class InvestmentItem(BaseModel):
    id: str
    name: str
    amount: float
    frequency: str  # "monthly" | "yearly"
    returnRate: float


class InvestmentBucket(BaseModel):
    id: str
    name: str
    currentAllocationPct: float
    targetAllocationPct: float
    returnRate: float


class ActiveTradingConfig(BaseModel):
    enabled: bool
    amount: float
    frequency: str  # "monthly" | "yearly"
    currentReturnRate: float
    targetReturnRate: float
    riskLevel: int = Field(ge=1, le=10)


class FinancialGoal(BaseModel):
    id: str
    name: str
    targetAmount: float
    targetYear: float  # relative year (e.g. 5, 10, 20)


class ScenarioSettings(BaseModel):
    expenseModifier: float
    incomeModifier: float
    investmentReturnOverride: float
    inflationRate: float
    compoundingFrequency: str  # "annual" | "monthly" | "quarterly"
    timeframeYears: int
    useTargetAllocations: bool
    goals: list[FinancialGoal] = []


class FinancialProfile(BaseModel):
    income: list[FinancialItem]
    expenses: list[FinancialItem]
    assets: list[AssetItem]
    investments: list[InvestmentItem]
    investmentBuckets: list[InvestmentBucket]
    activeTrading: ActiveTradingConfig
    scenarioSettings: ScenarioSettings
