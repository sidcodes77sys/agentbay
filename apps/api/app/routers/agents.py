from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.agent import AgentCreate, AgentListResponse, AgentRead, AgentUpdate
from app.services.agent_service import AgentService

router = APIRouter()


@router.get("", response_model=AgentListResponse)
def list_agents(
    search: Optional[str] = Query(None, description="Search query"),
    category: Optional[str] = Query(None, description="Filter by category"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    db: Session = Depends(get_db),
):
    """List all published agents with optional search and filtering."""
    service = AgentService(db)
    items, total = service.list_agents(
        search=search, category=category, page=page, limit=limit
    )
    return AgentListResponse(items=items, total=total, page=page, limit=limit)


@router.get("/{agent_id}", response_model=AgentRead)
def get_agent(agent_id: UUID, db: Session = Depends(get_db)):
    """Get a single agent by ID."""
    service = AgentService(db)
    agent = service.get_agent(agent_id)
    if not agent:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agent not found")
    return agent


@router.post("", response_model=AgentRead, status_code=status.HTTP_201_CREATED)
def create_agent(
    payload: AgentCreate,
    db: Session = Depends(get_db),
    # TODO: replace with real auth dependency
    author_id: UUID = Query(..., description="Author user ID (temporary)"),
):
    """Publish a new agent."""
    service = AgentService(db)
    return service.create_agent(payload, author_id=author_id)


@router.put("/{agent_id}", response_model=AgentRead)
def update_agent(
    agent_id: UUID,
    payload: AgentUpdate,
    db: Session = Depends(get_db),
):
    """Update an existing agent."""
    service = AgentService(db)
    agent = service.update_agent(agent_id, payload)
    if not agent:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agent not found")
    return agent


@router.delete("/{agent_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_agent(agent_id: UUID, db: Session = Depends(get_db)):
    """Delete an agent."""
    service = AgentService(db)
    deleted = service.delete_agent(agent_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agent not found")
