from typing import List, Optional, Tuple
from uuid import UUID

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.models.agent import Agent, AgentCategory
from app.schemas.agent import AgentCreate, AgentUpdate


class AgentService:
    def __init__(self, db: Session):
        self.db = db

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

    def get_agent(self, agent_id: UUID) -> Optional[Agent]:
        return self.db.query(Agent).filter(Agent.id == agent_id).first()

    def create_agent(self, payload: AgentCreate, author_id: UUID) -> Agent:
        agent = Agent(**payload.model_dump(), author_id=author_id)
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
