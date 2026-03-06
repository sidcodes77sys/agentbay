import re
from typing import List, Optional, Tuple
from uuid import UUID

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.models.agent import Agent, AgentCategory
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
        search: Optional[str] = None,
        category: Optional[str] = None,
        page: int = 1,
        limit: int = 20,
    ) -> Tuple[List[Agent], int]:
        query = self.db.query(Agent).filter(Agent.is_published == True)  # noqa: E712

        if search:
            search_term = f"%{search}%"
            query = query.filter(
                or_(
                    Agent.name.ilike(search_term),
                    Agent.description.ilike(search_term),
                )
            )

        if category and category in [c.value for c in AgentCategory]:
            query = query.filter(Agent.category == category)

        total = query.count()
        items = query.offset((page - 1) * limit).limit(limit).all()
        return items, total

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
