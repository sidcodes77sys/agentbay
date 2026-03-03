from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.execution import ExecutionCreate, ExecutionRead
from app.services.execution_service import ExecutionService

router = APIRouter()


@router.post("/execute/{agent_id}", response_model=ExecutionRead, status_code=status.HTTP_201_CREATED)
def execute_agent(
    agent_id: UUID,
    payload: ExecutionCreate,
    db: Session = Depends(get_db),
    # TODO: replace with real auth dependency
    user_id: UUID = Query(..., description="User ID (temporary)"),
):
    """Execute an agent with the provided input data."""
    service = ExecutionService(db)
    execution = service.execute(agent_id=agent_id, user_id=user_id, payload=payload)
    if execution is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Agent not found"
        )
    return execution


@router.get("/executions", response_model=List[ExecutionRead])
def list_executions(
    user_id: UUID = Query(..., description="Filter by user ID"),
    agent_id: UUID = Query(None, description="Filter by agent ID"),
    db: Session = Depends(get_db),
):
    """Get execution history."""
    service = ExecutionService(db)
    return service.list_executions(user_id=user_id, agent_id=agent_id)
