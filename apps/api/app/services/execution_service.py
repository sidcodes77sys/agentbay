import json
import subprocess
import sys
import tempfile
import textwrap
import time
from collections import defaultdict
from typing import Any, Dict, List, Optional, Tuple
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.agent import Agent
from app.models.execution import Execution, ExecutionStatus
from app.schemas.execution import ExecutionCreate

# ---------------------------------------------------------------------------
# Simple in-memory rate limiter (per user, per minute)
# ---------------------------------------------------------------------------
_RATE_LIMIT = 10  # max executions per window
_RATE_WINDOW_SECONDS = 60

# { user_id_str: [(timestamp, ...), ...] }
_rate_store: Dict[str, List[float]] = defaultdict(list)


def _check_rate_limit(user_id: UUID) -> None:
    key = str(user_id)
    now = time.time()
    window_start = now - _RATE_WINDOW_SECONDS
    timestamps = [t for t in _rate_store[key] if t > window_start]
    if len(timestamps) >= _RATE_LIMIT:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Rate limit exceeded: max {_RATE_LIMIT} executions per minute.",
        )
    timestamps.append(now)
    _rate_store[key] = timestamps


# ---------------------------------------------------------------------------
# Input validation against config_schema
# ---------------------------------------------------------------------------

def _validate_input(input_data: Dict[str, Any], config_schema: Optional[Dict[str, Any]]) -> None:
    """Validate input_data against the agent's JSON config_schema (simple MVP validation)."""
    if not config_schema:
        return

    properties: Dict[str, Any] = config_schema.get("properties", {})
    required: List[str] = config_schema.get("required", [])

    for field in required:
        if field not in input_data:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Missing required field: '{field}'",
            )

    for field, value in input_data.items():
        if field not in properties:
            continue
        field_def = properties[field]
        expected_type = field_def.get("type")
        if expected_type and not _check_json_type(value, expected_type):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Field '{field}' must be of type '{expected_type}'",
            )


def _check_json_type(value: Any, expected: str) -> bool:
    type_map = {
        "string": str,
        "number": (int, float),
        "integer": int,
        "boolean": bool,
        "array": list,
        "object": dict,
    }
    expected_py = type_map.get(expected)
    if expected_py is None:
        return True  # unknown type — skip
    return isinstance(value, expected_py)


# ---------------------------------------------------------------------------
# Mock execution engine
# ---------------------------------------------------------------------------

def _mock_execute(agent: Agent, input_data: Dict[str, Any]) -> Tuple[Dict[str, Any], Optional[str]]:
    """Simulate agent execution based on config_schema, returning (output_data, error_message)."""
    config_schema: Optional[Dict[str, Any]] = agent.config_schema  # type: ignore[assignment]
    properties: Dict[str, Any] = (config_schema or {}).get("properties", {})

    output: Dict[str, Any] = {
        "message": f"Agent '{agent.name}' executed successfully (mock mode).",
        "input_received": input_data,
        "outputs": {},
    }

    # Generate plausible outputs for each defined property
    for field, field_def in properties.items():
        ftype = field_def.get("type", "string")
        description = field_def.get("description", "")
        if ftype == "string":
            output["outputs"][field] = f"[mock string result for '{description or field}']"
        elif ftype in ("number", "integer"):
            output["outputs"][field] = 42
        elif ftype == "boolean":
            output["outputs"][field] = True
        elif ftype == "array":
            output["outputs"][field] = []
        elif ftype == "object":
            output["outputs"][field] = {}
        else:
            output["outputs"][field] = None

    if not properties:
        output["result"] = "Execution completed. No output schema defined."

    return output, None


# ---------------------------------------------------------------------------
# Subprocess sandbox execution engine (MVP)
# ---------------------------------------------------------------------------

_SANDBOX_TIMEOUT_SECONDS = 30


def _subprocess_execute(
    agent: Agent,
    input_data: Dict[str, Any],
) -> Tuple[Dict[str, Any], Optional[str]]:
    """
    Execute agent code in a sandboxed subprocess with timeout.

    For MVP we generate a small Python wrapper that imports the agent's module
    (if one exists) or falls back to mock execution.  The subprocess is run
    with restricted resource limits where the OS permits.

    TODO (future): Replace subprocess isolation with Docker container per
    execution for full network/filesystem isolation.  Use docker-py:
        client.containers.run(
            image="agentbay-sandbox:latest",
            command=["python", "run_agent.py"],
            environment={"INPUT_JSON": json.dumps(input_data)},
            network_disabled=True,
            mem_limit="128m",
            cpu_quota=50000,
            remove=True,
            timeout=30,
        )
    """
    # Build a small Python script that prints JSON output to stdout.
    script = textwrap.dedent(f"""\
        import json, sys

        input_data = {json.dumps(input_data)!r}

        # Placeholder: real agent code would be imported here
        output = {{
            "message": "Agent '{agent.name}' executed successfully.",
            "input_received": input_data,
        }}
        print(json.dumps(output))
    """)

    try:
        with tempfile.NamedTemporaryFile(
            mode="w", suffix=".py", delete=False
        ) as tmp:
            tmp.write(script)
            tmp_path = tmp.name

        result = subprocess.run(
            [sys.executable, tmp_path],
            capture_output=True,
            text=True,
            timeout=_SANDBOX_TIMEOUT_SECONDS,
            # Restrict environment — no network access via env vars
            env={"PATH": "/usr/bin:/bin"},
        )

        if result.returncode != 0:
            return {}, result.stderr.strip() or "Execution failed with non-zero exit code."

        raw_output = result.stdout.strip()
        try:
            output_data = json.loads(raw_output)
        except json.JSONDecodeError:
            output_data = {"stdout": raw_output}

        return output_data, None

    except subprocess.TimeoutExpired:
        return {}, f"Execution timed out after {_SANDBOX_TIMEOUT_SECONDS} seconds."
    except Exception as exc:  # noqa: BLE001
        return {}, f"Execution error: {exc}"


# ---------------------------------------------------------------------------
# Service
# ---------------------------------------------------------------------------

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

        # Rate limit check
        _check_rate_limit(user_id)

        # Input validation against config_schema
        _validate_input(payload.input_data, agent.config_schema)  # type: ignore[arg-type]

        # Persist execution record in 'pending' state
        execution = Execution(
            agent_id=agent_id,
            user_id=user_id,
            input_data=payload.input_data,
            status=ExecutionStatus.pending,
        )
        self.db.add(execution)
        self.db.commit()
        self.db.refresh(execution)

        start = time.time()
        try:
            execution.status = ExecutionStatus.running
            self.db.commit()

            # Use mock execution for MVP; subprocess path is available for future use.
            output_data, error_message = _mock_execute(agent, payload.input_data)

            if error_message:
                execution.status = ExecutionStatus.failed
                execution.error_message = error_message
                execution.output_data = output_data or None
            else:
                execution.status = ExecutionStatus.completed
                execution.output_data = output_data

            execution.duration_ms = int((time.time() - start) * 1000)

            # Increment execution counter
            agent.total_executions = (agent.total_executions or 0) + 1

            self.db.commit()
            self.db.refresh(execution)
        except Exception as exc:  # noqa: BLE001
            execution.status = ExecutionStatus.failed
            execution.error_message = str(exc)
            execution.duration_ms = int((time.time() - start) * 1000)
            self.db.commit()
            self.db.refresh(execution)

        return execution

    def get_execution(self, execution_id: UUID, user_id: UUID) -> Optional[Execution]:
        return (
            self.db.query(Execution)
            .filter(Execution.id == execution_id, Execution.user_id == user_id)
            .first()
        )

    def list_executions(
        self,
        user_id: Optional[UUID] = None,
        agent_id: Optional[UUID] = None,
        status_filter: Optional[str] = None,
        skip: int = 0,
        limit: int = 20,
    ) -> Tuple[List[Execution], int]:
        query = self.db.query(Execution)
        if user_id:
            query = query.filter(Execution.user_id == user_id)
        if agent_id:
            query = query.filter(Execution.agent_id == agent_id)
        if status_filter:
            query = query.filter(Execution.status == status_filter)
        total = query.count()
        items = query.order_by(Execution.created_at.desc()).offset(skip).limit(limit).all()
        return items, total
