from datetime import datetime

from pydantic import BaseModel, Field

from app.schemas.financial import FinancialProfile


class ScenarioMeta(BaseModel):
    id: str
    name: str
    description: str
    createdAt: datetime  # maps from DB created_at
    updatedAt: datetime  # maps from DB updated_at


class ScenarioCreate(BaseModel):
    name: str = Field(..., max_length=100)
    description: str = Field(default="", max_length=500)
    data: FinancialProfile
    overwriteExisting: bool = False


class ScenarioFull(ScenarioMeta):
    data: FinancialProfile


class ScenarioResponse(BaseModel):
    id: str
    name: str
    description: str
    overwritten: bool = False
