from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr

from app.models.user import UserRole


class UserCreate(BaseModel):
    email: EmailStr
    username: str
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None


class UserUpdate(BaseModel):
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None


class UserRead(BaseModel):
    id: UUID
    email: str
    username: str
    display_name: Optional[str]
    avatar_url: Optional[str]
    role: UserRole
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Auth schemas
class UserRegister(BaseModel):
    email: EmailStr
    username: str
    password: str
    display_name: Optional[str] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


class GitHubOAuthRequest(BaseModel):
    code: str
