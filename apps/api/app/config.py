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

    # JWT
    secret_key: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7

    # GitHub OAuth
    github_client_id: str = ""
    github_client_secret: str = ""

    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()
