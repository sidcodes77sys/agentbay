from abc import ABC, abstractmethod
from typing import Any, Dict

from agentbay_sdk.types import AgentMetadata, ExecutionInput, ExecutionOutput


class Agent(ABC):
    """Base class for all AgentBay agents.

    Subclass this and implement the ``execute`` method to build your agent.

    Example::

        from agentbay_sdk import Agent

        class MyAgent(Agent):
            name = "my-agent"
            description = "Does something useful"
            category = "research"
            pricing_type = "per_use"
            price_per_use = 0.05

            def execute(self, input_data: ExecutionInput) -> ExecutionOutput:
                topic = input_data.get("topic", "")
                return {"result": f"Researched: {topic}"}
    """

    # Override these class-level attributes in your subclass
    name: str = ""
    description: str = ""
    category: str = "other"
    version: str = "1.0.0"
    pricing_type: str = "free"
    price_per_use: float = 0.0
    monthly_price: float = 0.0
    tags: list = []

    @abstractmethod
    def execute(self, input_data: ExecutionInput) -> ExecutionOutput:
        """Run the agent with the provided input and return output.

        Args:
            input_data: Dictionary of input parameters as defined by your config_schema.

        Returns:
            Dictionary of output data.
        """

    def get_metadata(self) -> AgentMetadata:
        """Return the agent's metadata for registration."""
        return AgentMetadata(
            name=self.name,
            description=self.description,
            category=self.category,
            version=self.version,
            pricing_type=self.pricing_type,
            price_per_use=self.price_per_use,
            monthly_price=self.monthly_price,
            tags=list(self.tags),
        )

    def __call__(self, input_data: Dict[str, Any]) -> ExecutionOutput:
        return self.execute(input_data)
