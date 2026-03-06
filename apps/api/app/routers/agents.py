from typing import Dict, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.agent import AgentCreate, AgentListResponse, AgentRead, AgentUpdate, CategoryStatsResponse
from app.services.agent_service import AgentService

router = APIRouter()


@router.get("/categories/stats", response_model=CategoryStatsResponse)
def get_category_stats(db: Session = Depends(get_db)):
    """Return the count of published agents per category."""
    service = AgentService(db)
    return CategoryStatsResponse(stats=service.get_category_stats())


@router.get("", response_model=AgentListResponse)
def list_agents(
    q: Optional[str] = Query(None, description="Full-text search across name, description, and tags"),
    search: Optional[str] = Query(None, description="Search query (legacy, use q instead)"),
    category: Optional[str] = Query(None, description="Filter by category"),
    pricing_type: Optional[str] = Query(None, description="Filter by pricing type (free, per_use, subscription)"),
    tags: Optional[str] = Query(None, description="Comma-separated list of tags to filter by"),
    author_id: Optional[UUID] = Query(None, description="Filter by author UUID"),
    sort_by: Optional[str] = Query(None, description="Sort by: newest, most_used, top_rated, name"),
    skip: int = Query(0, ge=0, description="Number of items to skip"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    page: Optional[int] = Query(None, ge=1, description="Page number (overrides skip when provided)"),
    db: Session = Depends(get_db),
):
    """List all published agents with optional search, filtering, sorting, and pagination."""
    service = AgentService(db)
    items, total = service.list_agents(
        q=q,
        search=search,
        category=category,
        pricing_type=pricing_type,
        tags=tags,
        author_id=author_id,
        sort_by=sort_by,
        skip=skip,
        limit=limit,
        page=page,
    )
    effective_page = page if page is not None else (skip // limit + 1)
    return AgentListResponse(items=items, total=total, page=effective_page, limit=limit)


@router.get("/me", response_model=List[AgentRead])
def get_my_agents(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all agents belonging to the current authenticated user."""
    service = AgentService(db)
    return service.list_user_agents(current_user.id)


@router.get("/slug/{slug}", response_model=AgentRead)
def get_agent_by_slug(slug: str, db: Session = Depends(get_db)):
    """Get a single agent by slug."""
    service = AgentService(db)
    agent = service.get_agent_by_slug(slug)
    if not agent:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agent not found")
    return agent


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
    current_user: User = Depends(get_current_user),
):
    """Publish a new agent (requires authentication)."""
    service = AgentService(db)
    return service.create_agent(payload, author_id=current_user.id)


@router.put("/{agent_id}", response_model=AgentRead)
def update_agent(
    agent_id: UUID,
    payload: AgentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update an existing agent (requires authentication)."""
    service = AgentService(db)
    agent = service.get_agent(agent_id)
    if not agent:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agent not found")
    if agent.author_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    updated = service.update_agent(agent_id, payload)
    return updated


@router.delete("/{agent_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_agent(
    agent_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete an agent (requires authentication)."""
    service = AgentService(db)
    agent = service.get_agent(agent_id)
    if not agent:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agent not found")
    if agent.author_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    service.delete_agent(agent_id)
