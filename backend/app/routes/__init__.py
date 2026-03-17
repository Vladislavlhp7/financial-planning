from fastapi import APIRouter

from app.routes import budget, health, scenarios, simulate

router = APIRouter()
router.include_router(health.router, tags=["health"])
router.include_router(budget.router, tags=["financial"])
router.include_router(scenarios.router, prefix="/scenarios", tags=["scenarios"])
router.include_router(simulate.router, prefix="/simulate", tags=["simulate"])
