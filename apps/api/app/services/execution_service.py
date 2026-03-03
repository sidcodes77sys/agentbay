import time
from typing import List, Optional
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.agent import Agent
from app.models.execution import Execution, ExecutionStatus
from app.schemas.execution import ExecutionCreate


class ExecutionService:
    def __init__(self, db: Session):
        self.db = db

    def execute(
        self,
        agent_id: UUID,
        user_id: UUID,
        payload: ExecutionCreate,
    ) -> Optional[Execution]:
        agent = self.db.query(Agent).filter(Agent.id == agent_id).first()
        if not agent:
            return None

        execution = Execution(
            agent_id=agent_id,
            user_id=user_id,
            input_data=payload.input_data,
            status=ExecutionStatus.pending,
        )
        self.db.add(execution)
        self.db.commit()
        self.db.refresh(execution)

        # Simulate execution (placeholder — real execution engine in future PR)
        start = time.time()
        try:
            execution.status = ExecutionStatus.running
            self.db.commit()

            # Placeholder output
            execution.output_data = {
                "message": f"Agent '{agent.name}' executed successfully.",
                "input_received": payload.input_data,
            }
            execution.status = ExecutionStatus.completed
            execution.duration_ms = int((time.time() - start) * 1000)

            # Increment execution counter
            agent.total_executions = (agent.total_executions or 0) + 1

            self.db.commit()
            self.db.refresh(execution)
        except Exception:
            execution.status = ExecutionStatus.failed
            self.db.commit()

        return execution

    def list_executions(
        self,
        user_id: Optional[UUID] = None,
        agent_id: Optional[UUID] = None,
    ) -> List[Execution]:
        query = self.db.query(Execution)
        if user_id:
            query = query.filter(Execution.user_id == user_id)
        if agent_id:
            query = query.filter(Execution.agent_id == agent_id)
        return query.order_by(Execution.created_at.desc()).limit(100).all()
