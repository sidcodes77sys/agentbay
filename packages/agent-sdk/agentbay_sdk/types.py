from dataclasses import dataclass, field
from typing import Any, Dict, List

# Type aliases
ExecutionInput = Dict[str, Any]
ExecutionOutput = Dict[str, Any]


@dataclass
class AgentMetadata:
    """Metadata describing an agent for registration on AgentBay."""

    name: str
    description: str
    category: str = "other"
    version: str = "1.0.0"
    pricing_type: str = "free"
    price_per_use: float = 0.0
    monthly_price: float = 0.0
    tags: List[str] = field(default_factory=list)
