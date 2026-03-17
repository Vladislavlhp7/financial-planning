from fastapi import APIRouter

from app.schemas.simulate import MonteCarloRequest, MonteCarloResponse
from app.services.montecarlo import run_monte_carlo

router = APIRouter()


@router.post("/montecarlo", response_model=MonteCarloResponse)
async def montecarlo_simulate(req: MonteCarloRequest) -> MonteCarloResponse:
    bands = run_monte_carlo(req.profile, runs=req.runs)
    return MonteCarloResponse(bands=bands)
