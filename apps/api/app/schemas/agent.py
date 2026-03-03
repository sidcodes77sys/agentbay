from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel

from app.models.agent import AgentCategory, PricingType
from app.schemas.user import UserRead


class AgentCreate(BaseModel):
    name: str
    slug: str
    description: str
    long_description: Optional[str] = None
    category: AgentCategory = AgentCategory.other
    version: str = "1.0.0"
    pricing_type: PricingType = PricingType.free
    price_per_use: Optional[float] = None
    monthly_price: Optional[float] = None
    tags: List[str] = []
    config_schema: Optional[Dict[str, Any]] = None


class AgentUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    long_description: Optional[str] = None
    category: Optional[AgentCategory] = None
    version: Optional[str] = None
    pricing_type: Optional[PricingType] = None
    price_per_use: Optional[float] = None
    monthly_price: Optional[float] = None
    is_published: Optional[bool] = None
    tags: Optional[List[str]] = None
    config_schema: Optional[Dict[str, Any]] = None


class AgentRead(BaseModel):
    id: UUID
    name: str
    slug: str
    description: str
    long_description: Optional[str]
    category: AgentCategory
    author: UserRead
    version: str
    pricing_type: PricingType
    price_per_use: Optional[float]
    monthly_price: Optional[float]
    rating: float
    total_executions: int
    is_published: bool
    tags: List[str]
    config_schema: Optional[Dict[str, Any]]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class AgentListResponse(BaseModel):
    items: List[AgentRead]
    total: int
    page: int
    limit: int
