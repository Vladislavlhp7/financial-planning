from pydantic import BaseModel, Field

from app.schemas.financial import FinancialProfile


class MonteCarloRequest(BaseModel):
    profile: FinancialProfile
    runs: int = Field(default=1000, ge=100, le=5000)


class PercentileBand(BaseModel):
    year: int
    p10: float
    p25: float
    p50: float
    p75: float
    p90: float


class MonteCarloResponse(BaseModel):
    bands: list[PercentileBand]
