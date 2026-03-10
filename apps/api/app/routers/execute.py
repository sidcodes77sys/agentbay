from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.execution import ExecutionCreate, ExecutionList, ExecutionRead
from app.services.execution_service import ExecutionService

router = APIRouter()


@router.post(
    "/execute/{agent_id}",
    response_model=ExecutionRead,
    status_code=status.HTTP_201_CREATED,
)
async def execute_agent(
    agent_id: UUID,
    payload: ExecutionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Execute an agent with the provided input data (authenticated)."""
    service = ExecutionService(db)
    execution = await service.execute(
        agent_id=agent_id, user_id=current_user.id, payload=payload
    )
    if execution is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Agent not found"
        )
    return _enrich(execution)


@router.get("/executions", response_model=ExecutionList)
def list_executions(
    agent_id: Optional[UUID] = Query(None, description="Filter by agent ID"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    page: Optional[int] = Query(None, ge=1),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get the current user's execution history (paginated)."""
    if page is not None:
        skip = (page - 1) * limit
    service = ExecutionService(db)
    items, total = service.list_executions(
        user_id=current_user.id, agent_id=agent_id, skip=skip, limit=limit
    )
    effective_page = page if page is not None else (skip // limit + 1)
    return ExecutionList(
        items=[_enrich(e) for e in items],
        total=total,
        page=effective_page,
        limit=limit,
    )


@router.get("/executions/{execution_id}", response_model=ExecutionRead)
def get_execution(
    execution_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific execution by ID (only the owner can access it)."""
    service = ExecutionService(db)
    execution = service.get_execution(
        execution_id=execution_id, user_id=current_user.id
    )
    if execution is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Execution not found"
        )
    return _enrich(execution)


@router.get("/agents/{agent_id}/executions", response_model=ExecutionList)
def list_agent_executions(
    agent_id: UUID,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    page: Optional[int] = Query(None, ge=1),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get execution history for a specific agent (current user only)."""
    if page is not None:
        skip = (page - 1) * limit
    service = ExecutionService(db)
    items, total = service.list_executions(
        user_id=current_user.id, agent_id=agent_id, skip=skip, limit=limit
    )
    effective_page = page if page is not None else (skip // limit + 1)
    return ExecutionList(
        items=[_enrich(e) for e in items],
        total=total,
        page=effective_page,
        limit=limit,
    )


def _enrich(execution) -> dict:
    """Attach agent_name to execution for convenience."""
    data = {
        "id": execution.id,
        "agent_id": execution.agent_id,
        "user_id": execution.user_id,
        "input_data": execution.input_data,
        "output_data": execution.output_data,
        "status": execution.status,
        "duration_ms": execution.duration_ms,
        "created_at": execution.created_at,
        "agent_name": execution.agent.name if execution.agent else None,
    }
    return data
