from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel

from app.models.execution import ExecutionStatus


class ExecutionCreate(BaseModel):
    input_data: Dict[str, Any] = {}


class ExecutionRead(BaseModel):
    id: UUID
    agent_id: UUID
    user_id: UUID
    input_data: Dict[str, Any]
    output_data: Optional[Dict[str, Any]]
    status: ExecutionStatus
    error_message: Optional[str]
    duration_ms: Optional[int]
    created_at: datetime

    class Config:
        from_attributes = True


class ExecutionListResponse(BaseModel):
    items: List[ExecutionRead]
    total: int
    page: int
    limit: int
