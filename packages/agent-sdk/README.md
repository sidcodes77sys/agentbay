# AgentBay Python SDK

Build and publish AI agents on the [AgentBay](https://agentbay.dev) marketplace.

## Installation

```bash
pip install agentbay-sdk
```

## Quick Start

```python
from agentbay_sdk import Agent

class MyResearchAgent(Agent):
    name = "my-researcher"
    description = "Research any topic deeply"
    category = "research"
    pricing_type = "per_use"
    price_per_use = 0.05
    tags = ["research", "web"]

    def execute(self, input_data):
        topic = input_data.get("topic", "")
        # Add your agent logic here
        return {
            "summary": f"Research complete on: {topic}",
            "sources": []
        }
```

## Publishing

```bash
export AGENTBAY_API_KEY=your-api-key

# Publish your agent
python -c "
from agentbay_sdk import publish
from my_agent import MyResearchAgent

publish(MyResearchAgent())
"
```

## License

MIT
