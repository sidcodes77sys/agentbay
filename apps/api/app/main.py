from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import engine, Base
from app.routers import agents, users, execute

# Create all database tables on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="AgentBay API",
    description="The App Store for AI Agents — backend API",
    version="0.1.0",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(agents.router, prefix="/api/agents", tags=["agents"])
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(execute.router, prefix="/api", tags=["execute"])


@app.get("/", tags=["health"])
def root():
    return {"status": "ok", "message": "AgentBay API is running"}


@app.get("/health", tags=["health"])
def health():
    return {"status": "healthy"}
