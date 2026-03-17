from sqlalchemy import Column, DateTime, Text, func
from sqlalchemy.dialects.postgresql import JSONB

from app.database import Base


class FinancialProfile(Base):
    __tablename__ = "financial_profiles"

    user_id = Column(Text, primary_key=True)
    data = Column(JSONB, nullable=False)
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())


class FinancialScenario(Base):
    __tablename__ = "financial_scenarios"

    id = Column(Text, primary_key=True)
    name = Column(Text, nullable=False)
    description = Column(Text, nullable=False, server_default="")
    data = Column(JSONB, nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())
