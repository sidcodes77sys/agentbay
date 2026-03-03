from typing import List
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Database
    database_url: str = "postgresql://agentbay:agentbay@localhost:5432/agentbay"

    # App
    app_name: str = "AgentBay API"
    debug: bool = False

    # CORS
    cors_origins: List[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]

    # Auth (for validating tokens from NextAuth if needed)
    nextauth_secret: str = ""

    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()
