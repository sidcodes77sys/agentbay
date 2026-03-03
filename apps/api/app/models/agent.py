import uuid
import enum

from sqlalchemy import (
    Column,
    String,
    Boolean,
    DateTime,
    Float,
    Integer,
    Enum as SAEnum,
    ForeignKey,
    Numeric,
    JSON,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class AgentCategory(str, enum.Enum):
    research = "research"
    writing = "writing"
    data = "data"
    automation = "automation"
    customer_service = "customer_service"
    other = "other"


class PricingType(str, enum.Enum):
    free = "free"
    per_use = "per_use"
    subscription = "subscription"


class Agent(Base):
    __tablename__ = "agents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    slug = Column(String, unique=True, nullable=False, index=True)
    description = Column(String, nullable=False)
    long_description = Column(String, nullable=True)
    category = Column(SAEnum(AgentCategory), nullable=False, default=AgentCategory.other)
    author_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    version = Column(String, nullable=False, default="1.0.0")
    pricing_type = Column(SAEnum(PricingType), nullable=False, default=PricingType.free)
    price_per_use = Column(Numeric(10, 4), nullable=True)
    monthly_price = Column(Numeric(10, 2), nullable=True)
    rating = Column(Float, nullable=False, default=0.0)
    total_executions = Column(Integer, nullable=False, default=0)
    is_published = Column(Boolean, nullable=False, default=False)
    tags = Column(JSON, nullable=False, default=list)
    config_schema = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    author = relationship("User", back_populates="agents")
    executions = relationship("Execution", back_populates="agent", lazy="dynamic")
