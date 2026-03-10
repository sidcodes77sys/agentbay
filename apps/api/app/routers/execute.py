from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.execution import ExecutionCreate, ExecutionListResponse, ExecutionRead
from app.services.execution_service import ExecutionService

router = APIRouter()


@router.post(
    "/execute/{agent_id}",
    response_model=ExecutionRead,
    status_code=status.HTTP_201_CREATED,
)
def execute_agent(
    agent_id: UUID,
    payload: ExecutionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Execute an agent with the provided input data (authenticated)."""
    service = ExecutionService(db)
    execution = service.execute(
        agent_id=agent_id, user_id=current_user.id, payload=payload
    )
    if execution is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Agent not found"
        )
    return execution


@router.get("/executions", response_model=ExecutionListResponse)
def list_executions(
    agent_id: UUID = Query(None, description="Filter by agent ID"),
    status_filter: str = Query(None, alias="status", description="Filter by status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    page: int = Query(None, ge=1),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get execution history for the current user (authenticated, paginated)."""
    if page is not None:
        skip = (page - 1) * limit
    effective_page = page if page is not None else (skip // limit + 1)

    service = ExecutionService(db)
    items, total = service.list_executions(
        user_id=current_user.id,
        agent_id=agent_id,
        status_filter=status_filter,
        skip=skip,
        limit=limit,
    )
    return ExecutionListResponse(items=items, total=total, page=effective_page, limit=limit)


@router.get("/executions/{execution_id}", response_model=ExecutionRead)
def get_execution(
    execution_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific execution's details (authenticated, only own executions)."""
    service = ExecutionService(db)
    execution = service.get_execution(execution_id=execution_id, user_id=current_user.id)
    if execution is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Execution not found"
        )
    return execution
