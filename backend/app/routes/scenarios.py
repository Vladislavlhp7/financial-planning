import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import delete, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import FinancialScenario
from app.db.session import get_db
from app.schemas.financial import FinancialProfile
from app.schemas.scenarios import ScenarioCreate, ScenarioFull, ScenarioMeta, ScenarioResponse

router = APIRouter()


@router.get("", response_model=list[ScenarioMeta])
async def list_scenarios(db: AsyncSession = Depends(get_db)) -> list:
    result = await db.execute(
        select(
            FinancialScenario.id,
            FinancialScenario.name,
            FinancialScenario.description,
            FinancialScenario.created_at,
            FinancialScenario.updated_at,
        ).order_by(FinancialScenario.updated_at)
    )
    rows = result.all()
    return [
        ScenarioMeta(
            id=r.id,
            name=r.name,
            description=r.description,
            createdAt=r.created_at,
            updatedAt=r.updated_at,
        )
        for r in rows
    ]


@router.get("/{scenario_id}", response_model=ScenarioFull)
async def get_scenario(scenario_id: str, db: AsyncSession = Depends(get_db)) -> ScenarioFull:
    result = await db.execute(
        select(FinancialScenario).where(FinancialScenario.id == scenario_id).limit(1)
    )
    row = result.scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Scenario not found")
    return ScenarioFull(
        id=row.id,
        name=row.name,
        description=row.description,
        createdAt=row.created_at,
        updatedAt=row.updated_at,
        data=row.data,
    )


@router.post("", response_model=ScenarioResponse, status_code=201)
async def create_scenario(body: ScenarioCreate, db: AsyncSession = Depends(get_db)) -> ScenarioResponse:
    scenario_id = str(uuid.uuid4())
    stmt = FinancialScenario.__table__.insert().values(
        id=scenario_id,
        name=body.name[:100].strip(),
        description=body.description[:500] if body.description else "",
        data=body.data.model_dump(),
    )
    await db.execute(stmt)
    return ScenarioResponse(id=scenario_id, name=body.name, description=body.description)


@router.put("/{scenario_id}", response_model=ScenarioResponse)
async def update_scenario(
    scenario_id: str,
    body: ScenarioCreate,
    db: AsyncSession = Depends(get_db),
) -> ScenarioResponse:
    result = await db.execute(
        select(FinancialScenario).where(FinancialScenario.id == scenario_id).limit(1)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Scenario not found")
    stmt = (
        update(FinancialScenario)
        .where(FinancialScenario.id == scenario_id)
        .values(
            name=body.name[:100].strip(),
            description=body.description[:500] if body.description else "",
            data=body.data.model_dump(),
        )
    )
    await db.execute(stmt)
    return ScenarioResponse(id=scenario_id, name=body.name, description=body.description)


@router.delete("/{scenario_id}")
async def delete_scenario(scenario_id: str, db: AsyncSession = Depends(get_db)) -> dict:
    stmt = delete(FinancialScenario).where(FinancialScenario.id == scenario_id)
    result = await db.execute(stmt)
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Scenario not found")
    return {"deleted": scenario_id}
