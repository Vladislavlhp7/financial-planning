from pydantic import BaseModel, Field


class BalanceSheetRow(BaseModel):
    rowType: str = Field(description="header | line | subtotal")
    id: str = ""
    name: str
    amount: float | None = None
    amountAnnualized: float | None = None
    amountScenarioAnnualized: float | None = None
    unit: str = "currency"
    frequency: str = ""
    returnRate: float | None = None
    pctCurrent: float | None = None
    pctTarget: float | None = None
    note: str = ""


class BalanceSheetSection(BaseModel):
    id: str
    title: str
    rows: list[BalanceSheetRow]


class BalanceSheetResponse(BaseModel):
    generatedAt: str
    sections: list[BalanceSheetSection]
