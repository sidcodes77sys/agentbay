# AgentBay 🤖

> The App Store for AI Agents

AgentBay is a platform where developers can publish, discover, and deploy AI agents. Think of it as an app store, but for autonomous AI agents that can research, write, automate tasks, analyze data, and more.

## Architecture Overview

```
agentbay/
├── apps/
│   ├── web/          # Next.js 14 frontend
│   └── api/          # FastAPI backend
├── packages/
│   ├── agent-sdk/    # Python SDK for building agents
│   └── shared/       # Shared TypeScript types
└── docker/           # Docker Compose setup
```

## Tech Stack

| Layer     | Technology                                          |
|-----------|-----------------------------------------------------|
| Frontend  | Next.js 14 (App Router) + Tailwind CSS + TypeScript |
| Backend   | Python + FastAPI + SQLAlchemy + Pydantic            |
| Database  | PostgreSQL                                          |
| Auth      | NextAuth.js                                         |
| Monorepo  | pnpm workspaces + Turborepo                         |

## Getting Started

### Prerequisites

- Node.js >= 18
- pnpm >= 8
- Python >= 3.11
- Docker & Docker Compose

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/sidcodes77sys/agentbay.git
   cd agentbay
   ```

2. **Install Node.js dependencies**
   ```bash
   pnpm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   cp apps/api/.env.example apps/api/.env
   ```

4. **Start with Docker Compose** (recommended)
   ```bash
   cd docker
   docker compose up -d
   ```

5. **Or run locally**

   Start the database:
   ```bash
   docker compose -f docker/docker-compose.yml up -d postgres
   ```

   Start the API:
   ```bash
   cd apps/api
   pip install -r requirements.txt
   uvicorn app.main:app --reload --port 8000
   ```

   Start the frontend:
   ```bash
   cd apps/web
   pnpm dev
   ```

6. **Open your browser**
   - Frontend: http://localhost:3000
   - API docs: http://localhost:8000/docs

## Project Structure

### `apps/web` — Next.js Frontend
The main web application with:
- **Landing page** — Hero, featured agents, how it works, developer CTA
- **Agent browse** — Search and filter agents by category
- **Agent detail** — Full agent page with pricing and execution
- **Developer dashboard** — Manage published agents

### `apps/api` — FastAPI Backend
REST API with:
- `/api/agents` — Agent CRUD and search
- `/api/users` — User registration and profiles
- `/api/execute` — Agent execution engine

### `packages/agent-sdk` — Python SDK
SDK for developers to build and publish agents:
```python
from agentbay_sdk import Agent

class MyAgent(Agent):
    name = "my-agent"
    description = "Does something cool"

    def execute(self, input_data):
        return {"result": "Hello from MyAgent!"}
```

### `packages/shared` — Shared TypeScript Types
Type definitions shared between frontend and any TypeScript consumers.

## Contributing

Contributions are welcome! Please read our contributing guidelines (coming soon) before submitting a PR.

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## License

MIT
