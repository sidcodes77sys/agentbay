import re
from typing import Dict, List, Optional, Tuple
from uuid import UUID

from sqlalchemy import cast, func, or_
from sqlalchemy.orm import Session
from sqlalchemy.types import Text

from app.models.agent import Agent, AgentCategory, PricingType
from app.schemas.agent import AgentCreate, AgentUpdate


def _slugify(text: str) -> str:
    """Convert a string to a URL-friendly slug."""
    slug = text.lower().strip()
    slug = re.sub(r"[^\w\s-]", "", slug)
    slug = re.sub(r"[\s_]+", "-", slug)
    slug = re.sub(r"-+", "-", slug)
    slug = slug.strip("-")
    return slug


class AgentService:
    def __init__(self, db: Session):
        self.db = db

    def _unique_slug(self, base_slug: str) -> str:
        """Ensure slug is unique, appending a counter if needed."""
        slug = base_slug
        counter = 1
        while self.db.query(Agent).filter(Agent.slug == slug).first():
            slug = f"{base_slug}-{counter}"
            counter += 1
        return slug

    def list_agents(
        self,
        q: Optional[str] = None,
        search: Optional[str] = None,
        category: Optional[str] = None,
        pricing_type: Optional[str] = None,
        tags: Optional[str] = None,
        author_id: Optional[UUID] = None,
        sort_by: Optional[str] = None,
        skip: int = 0,
        limit: int = 20,
        page: Optional[int] = None,
    ) -> Tuple[List[Agent], int]:
        query = self.db.query(Agent).filter(Agent.is_published == True)  # noqa: E712

        # Support both `q` and legacy `search` parameter
        search_term_str = q or search
        if search_term_str:
            search_term = f"%{search_term_str}%"
            query = query.filter(
                or_(
                    Agent.name.ilike(search_term),
                    Agent.description.ilike(search_term),
                    cast(Agent.tags, Text).ilike(search_term),
                )
            )

        if category and category in [c.value for c in AgentCategory]:
            query = query.filter(Agent.category == category)

        if pricing_type and pricing_type in [p.value for p in PricingType]:
            query = query.filter(Agent.pricing_type == pricing_type)

        if tags:
            for tag in [t.strip() for t in tags.split(",") if t.strip()]:
                query = query.filter(cast(Agent.tags, Text).ilike(f"%{tag}%"))

        if author_id is not None:
            query = query.filter(Agent.author_id == author_id)

        # Sorting
        sort_map = {
            "newest": Agent.created_at.desc(),
            "most_used": Agent.total_executions.desc(),
            "top_rated": Agent.rating.desc(),
            "name": Agent.name.asc(),
        }
        order_clause = sort_map.get(sort_by or "", Agent.created_at.desc())
        query = query.order_by(order_clause)

        total = query.count()

        # Support both page-based and skip-based pagination
        if page is not None:
            offset = (page - 1) * limit
        else:
            offset = skip

        items = query.offset(offset).limit(limit).all()
        return items, total

    def get_category_stats(self) -> Dict[str, int]:
        """Return count of published agents per category."""
        rows = (
            self.db.query(Agent.category, func.count(Agent.id).label("count"))
            .filter(Agent.is_published == True)  # noqa: E712
            .group_by(Agent.category)
            .all()
        )
        return {row.category.value if hasattr(row.category, "value") else str(row.category): row.count for row in rows}

    def list_user_agents(self, author_id: UUID) -> List[Agent]:
        return self.db.query(Agent).filter(Agent.author_id == author_id).all()

    def get_agent(self, agent_id: UUID) -> Optional[Agent]:
        return self.db.query(Agent).filter(Agent.id == agent_id).first()

    def get_agent_by_slug(self, slug: str) -> Optional[Agent]:
        return self.db.query(Agent).filter(Agent.slug == slug).first()

    def create_agent(self, payload: AgentCreate, author_id: UUID) -> Agent:
        data = payload.model_dump()
        raw_slug = data.pop("slug") or _slugify(payload.name)
        base_slug = _slugify(raw_slug)
        data["slug"] = self._unique_slug(base_slug)
        agent = Agent(**data, author_id=author_id)
        self.db.add(agent)
        self.db.commit()
        self.db.refresh(agent)
        return agent

    def update_agent(self, agent_id: UUID, payload: AgentUpdate) -> Optional[Agent]:
        agent = self.get_agent(agent_id)
        if not agent:
            return None
        for field, value in payload.model_dump(exclude_unset=True).items():
            setattr(agent, field, value)
        self.db.commit()
        self.db.refresh(agent)
        return agent

    def delete_agent(self, agent_id: UUID) -> bool:
        agent = self.get_agent(agent_id)
        if not agent:
            return False
        self.db.delete(agent)
        self.db.commit()
        return True
