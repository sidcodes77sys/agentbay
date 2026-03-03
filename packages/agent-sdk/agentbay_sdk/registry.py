import os
from typing import TYPE_CHECKING

import requests

if TYPE_CHECKING:
    from agentbay_sdk.agent import Agent

AGENTBAY_API_URL = os.environ.get("AGENTBAY_API_URL", "https://api.agentbay.dev")


def publish(agent_instance: "Agent", api_key: str = "") -> dict:
    """Publish an agent to the AgentBay marketplace.

    Args:
        agent_instance: An instantiated Agent subclass.
        api_key: Your AgentBay API key. Falls back to AGENTBAY_API_KEY env var.

    Returns:
        The created/updated agent record from the API.

    Raises:
        ValueError: If no API key is provided.
        requests.HTTPError: If the API request fails.
    """
    key = api_key or os.environ.get("AGENTBAY_API_KEY", "")
    if not key:
        raise ValueError(
            "No API key provided. Set AGENTBAY_API_KEY environment variable or pass api_key."
        )

    metadata = agent_instance.get_metadata()
    payload = {
        "name": metadata.name,
        "slug": metadata.name.lower().replace(" ", "-"),
        "description": metadata.description,
        "category": metadata.category,
        "version": metadata.version,
        "pricing_type": metadata.pricing_type,
        "price_per_use": metadata.price_per_use,
        "monthly_price": metadata.monthly_price,
        "tags": metadata.tags,
    }

    response = requests.post(
        f"{AGENTBAY_API_URL}/api/agents",
        json=payload,
        headers={"Authorization": f"Bearer {key}"},
        timeout=30,
    )
    response.raise_for_status()
    return response.json()
