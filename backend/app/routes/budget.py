from fastapi import APIRouter, Depends, Response
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.constants import DEFAULT_PROFILE_DATA, DEFAULT_USER_ID
from app.db.models import FinancialProfile as FinancialProfileModel
from app.db.session import get_db
from app.schemas.balance_sheet import BalanceSheetResponse
from app.schemas.financial import FinancialProfile
from app.services.balance_sheet import (
    balance_sheet_csv_filename,
    balance_sheet_to_csv,
    build_balance_sheet_response,
)

router = APIRouter()


def _migrate_legacy(data: dict) -> dict:
    """Migrate existing profiles that don't have investmentBuckets/activeTrading."""
    if "investmentBuckets" not in data:
        data["investmentBuckets"] = DEFAULT_PROFILE_DATA["investmentBuckets"]
    if "activeTrading" not in data:
        data["activeTrading"] = DEFAULT_PROFILE_DATA["activeTrading"]
    if "scenarioSettings" in data:
        ss = data["scenarioSettings"]
        if "useTargetAllocations" not in ss:
            ss["useTargetAllocations"] = False
        if "goals" not in ss:
            ss["goals"] = []
    return data


async def get_or_create_profile(db: AsyncSession) -> dict:
    result = await db.execute(
        select(FinancialProfileModel).where(FinancialProfileModel.user_id == DEFAULT_USER_ID).limit(1)
    )
    row = result.scalar_one_or_none()
    if row:
        data = dict(row.data)
        data = _migrate_legacy(data)
        return data
    # Insert default
    stmt = insert(FinancialProfileModel).values(
        user_id=DEFAULT_USER_ID,
        data=DEFAULT_PROFILE_DATA,
    )
    await db.execute(stmt)
    return DEFAULT_PROFILE_DATA


async def save_profile(db: AsyncSession, data: dict) -> None:
    stmt = insert(FinancialProfileModel).values(
        user_id=DEFAULT_USER_ID,
        data=data,
    ).on_conflict_do_update(
        index_elements=["user_id"],
        set_={"data": data},
    )
    await db.execute(stmt)


@router.get("/budget", response_model=FinancialProfile)
async def get_budget(db: AsyncSession = Depends(get_db)) -> dict:
    data = await get_or_create_profile(db)
    return data


@router.put("/budget", response_model=FinancialProfile)
async def update_budget(profile: FinancialProfile, db: AsyncSession = Depends(get_db)) -> FinancialProfile:
    data = profile.model_dump()
    await save_profile(db, data)
    return profile


@router.post("/budget/reset", response_model=FinancialProfile)
async def reset_budget(db: AsyncSession = Depends(get_db)) -> dict:
    await save_profile(db, DEFAULT_PROFILE_DATA)
    return DEFAULT_PROFILE_DATA


@router.get("/budget/balance-sheet", response_model=BalanceSheetResponse)
async def get_balance_sheet(db: AsyncSession = Depends(get_db)) -> BalanceSheetResponse:
    data = await get_or_create_profile(db)
    profile = FinancialProfile.model_validate(data)
    return build_balance_sheet_response(profile)


@router.post("/budget/balance-sheet", response_model=BalanceSheetResponse)
async def post_balance_sheet(profile: FinancialProfile) -> BalanceSheetResponse:
    return build_balance_sheet_response(profile)


@router.post("/budget/balance-sheet/export.csv")
async def post_balance_sheet_csv(profile: FinancialProfile) -> Response:
    sheet = build_balance_sheet_response(profile)
    csv_body = balance_sheet_to_csv(sheet)
    filename = balance_sheet_csv_filename()
    return Response(
        content=csv_body.encode("utf-8"),
        media_type="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
        },
    )
