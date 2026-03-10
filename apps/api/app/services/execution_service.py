import asyncio
import random
import time
from collections import defaultdict
from typing import Any, Dict, List, Optional, Tuple
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.agent import Agent, AgentCategory
from app.models.execution import Execution, ExecutionStatus
from app.schemas.execution import ExecutionCreate

# In-memory rate limiter: user_id -> list of timestamps
_rate_limit_window: Dict[str, List[float]] = defaultdict(list)
_RATE_LIMIT_MAX = 10  # executions per minute
_RATE_LIMIT_WINDOW_SECONDS = 60


def _check_rate_limit(user_id: str) -> bool:
    """Return True if the user is within the rate limit, False if exceeded."""
    now = time.monotonic()
    window = now - _RATE_LIMIT_WINDOW_SECONDS
    timestamps = _rate_limit_window[user_id]
    # Purge old entries
    timestamps[:] = [t for t in timestamps if t > window]
    if len(timestamps) >= _RATE_LIMIT_MAX:
        return False
    timestamps.append(now)
    return True


def _validate_input(
    input_data: Dict[str, Any], config_schema: Optional[Dict[str, Any]]
) -> Tuple[bool, Optional[str]]:
    """Validate input_data against agent's config_schema.

    Returns (is_valid, error_message).
    """
    if not config_schema:
        return True, None

    properties: Dict[str, Any] = config_schema.get("properties", {})
    required: List[str] = config_schema.get("required", [])

    # Check required fields
    for field in required:
        if field not in input_data:
            return False, f"Missing required field: '{field}'"

    # Check types for provided fields
    type_map = {
        "string": str,
        "number": (int, float),
        "integer": int,
        "boolean": bool,
        "array": list,
        "object": dict,
    }
    for key, value in input_data.items():
        if key in properties:
            field_schema = properties[key]
            expected_type = field_schema.get("type")
            if expected_type and expected_type in type_map:
                expected = type_map[expected_type]
                if not isinstance(value, expected):
                    return (
                        False,
                        f"Field '{key}' expected type '{expected_type}', got '{type(value).__name__}'",
                    )
            # Enum validation
            enum_values = field_schema.get("enum")
            if enum_values and value not in enum_values:
                return False, f"Field '{key}' must be one of {enum_values}"

    return True, None


def _mock_output(
    agent: Agent, input_data: Dict[str, Any]
) -> Dict[str, Any]:
    """Generate a category-appropriate mock output for the agent."""
    category = agent.category
    base: Dict[str, Any] = {
        "agent": agent.name,
        "version": agent.version,
        "input_received": input_data,
    }

    if category == AgentCategory.research:
        base["result"] = {
            "summary": f"Research summary for query: {list(input_data.values())[:1]}",
            "sources": [
                "https://example.com/source1",
                "https://example.com/source2",
            ],
            "key_findings": [
                "Finding 1: Mock data generated for demonstration",
                "Finding 2: Real execution will query live data sources",
            ],
            "confidence": 0.87,
        }
    elif category == AgentCategory.writing:
        prompt = next(iter(input_data.values()), "a topic") if input_data else "a topic"
        base["result"] = {
            "content": f"This is a mock-generated piece of writing about {prompt}. "
            "In a live environment, this would produce fully generated text.",
            "word_count": random.randint(150, 400),
            "tone": "professional",
        }
    elif category == AgentCategory.data:
        base["result"] = {
            "rows_processed": random.randint(100, 10000),
            "insights": [
                "Insight 1: Data pattern detected",
                "Insight 2: Anomaly in column X",
            ],
            "output_format": "json",
        }
    elif category == AgentCategory.automation:
        base["result"] = {
            "steps_completed": random.randint(3, 10),
            "status": "success",
            "log": ["Step 1: Initialised", "Step 2: Processed", "Step 3: Done"],
        }
    elif category == AgentCategory.customer_service:
        base["result"] = {
            "response": "Thank you for your inquiry. Our mock agent has processed your request.",
            "sentiment": "positive",
            "escalation_required": False,
        }
    else:
        base["result"] = {
            "message": f"Agent '{agent.name}' executed successfully.",
            "mock": True,
        }

    return base


async def _run_in_subprocess(
    agent: Agent, input_data: Dict[str, Any], timeout: float = 30.0
) -> Tuple[Dict[str, Any], float]:
    """
    Simulate sandboxed execution using asyncio subprocess with a timeout.

    For the MVP, we use a Python echo subprocess instead of real agent code.
    Returns (output_data, duration_ms).
    """
    import json
    import sys

    # Build mock output as JSON and pass it through a subprocess for isolation
    mock_output = _mock_output(agent, input_data)

    # Simulated 1-3 second processing delay
    delay = random.uniform(1.0, 3.0)

    script = (
        f"import time, json, sys; "
        f"time.sleep({delay:.2f}); "
        f"print(json.dumps({json.dumps(mock_output)}))"
    )

    start = time.monotonic()
    proc = await asyncio.create_subprocess_exec(
        sys.executable,
        "-c",
        script,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    try:
        stdout, stderr = await asyncio.wait_for(
            proc.communicate(), timeout=timeout
        )
    except asyncio.TimeoutError:
        proc.kill()
        await proc.communicate()
        raise TimeoutError(f"Agent execution timed out after {timeout:.0f}s")

    duration_ms = (time.monotonic() - start) * 1000

    if proc.returncode != 0:
        error_detail = stderr.decode("utf-8", errors="replace").strip()
        raise RuntimeError(f"Subprocess failed: {error_detail}")

    result = json.loads(stdout.decode("utf-8", errors="replace").strip())
    return result, duration_ms


class ExecutionService:
    def __init__(self, db: Session):
        self.db = db

    async def execute(
        self,
        agent_id: UUID,
        user_id: UUID,
        payload: ExecutionCreate,
    ) -> Optional[Execution]:
        agent = self.db.query(Agent).filter(Agent.id == agent_id).first()
        if not agent:
            return None

        # Rate limiting
        if not _check_rate_limit(str(user_id)):
            execution = Execution(
                agent_id=agent_id,
                user_id=user_id,
                input_data=payload.input_data,
                status=ExecutionStatus.failed,
                output_data={"error": "Rate limit exceeded. Maximum 10 executions per minute."},
                duration_ms=0,
            )
            self.db.add(execution)
            self.db.commit()
            self.db.refresh(execution)
            return execution

        # Input validation
        is_valid, validation_error = _validate_input(
            payload.input_data, agent.config_schema
        )
        if not is_valid:
            execution = Execution(
                agent_id=agent_id,
                user_id=user_id,
                input_data=payload.input_data,
                status=ExecutionStatus.failed,
                output_data={"error": f"Input validation failed: {validation_error}"},
                duration_ms=0,
            )
            self.db.add(execution)
            self.db.commit()
            self.db.refresh(execution)
            return execution

        execution = Execution(
            agent_id=agent_id,
            user_id=user_id,
            input_data=payload.input_data,
            status=ExecutionStatus.pending,
        )
        self.db.add(execution)
        self.db.commit()
        self.db.refresh(execution)

        execution.status = ExecutionStatus.running
        self.db.commit()

        try:
            output_data, duration_ms = await _run_in_subprocess(agent, payload.input_data)
            execution.output_data = output_data
            execution.status = ExecutionStatus.completed
            execution.duration_ms = int(duration_ms)
        except TimeoutError as exc:
            execution.output_data = {"error": str(exc)}
            execution.status = ExecutionStatus.failed
            execution.duration_ms = 30000
        except Exception as exc:
            execution.output_data = {"error": f"Execution error: {str(exc)}"}
            execution.status = ExecutionStatus.failed

        # Increment execution counter
        agent.total_executions = (agent.total_executions or 0) + 1

        self.db.commit()
        self.db.refresh(execution)
        return execution

    def get_execution(
        self, execution_id: UUID, user_id: UUID
    ) -> Optional[Execution]:
        return (
            self.db.query(Execution)
            .filter(
                Execution.id == execution_id,
                Execution.user_id == user_id,
            )
            .first()
        )

    def list_executions(
        self,
        user_id: Optional[UUID] = None,
        agent_id: Optional[UUID] = None,
        skip: int = 0,
        limit: int = 20,
    ) -> Tuple[List[Execution], int]:
        query = self.db.query(Execution)
        if user_id:
            query = query.filter(Execution.user_id == user_id)
        if agent_id:
            query = query.filter(Execution.agent_id == agent_id)
        total = query.count()
        items = (
            query.order_by(Execution.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )
        return items, total
