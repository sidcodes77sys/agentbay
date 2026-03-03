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
