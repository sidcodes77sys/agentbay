from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

import httpx

from app.config import settings
from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.user import (
    GitHubOAuthRequest,
    RefreshRequest,
    TokenResponse,
    UserRead,
    UserRegister,
    UserLogin,
)
from app.services.auth_service import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)

router = APIRouter()


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(payload: UserRegister, db: Session = Depends(get_db)):
    """Register a new user with email, username, and password."""
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )
    if db.query(User).filter(User.username == payload.username).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username already taken",
        )
    user = User(
        email=payload.email,
        username=payload.username,
        hashed_password=hash_password(payload.password),
        display_name=payload.display_name,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return TokenResponse(
        access_token=create_access_token(str(user.id)),
        refresh_token=create_refresh_token(str(user.id)),
    )


@router.post("/login", response_model=TokenResponse)
def login(payload: UserLogin, db: Session = Depends(get_db)):
    """Login with email and password, returns JWT tokens."""
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not user.hashed_password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    if not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    return TokenResponse(
        access_token=create_access_token(str(user.id)),
        refresh_token=create_refresh_token(str(user.id)),
    )


@router.post("/refresh", response_model=TokenResponse)
def refresh(payload: RefreshRequest, db: Session = Depends(get_db)):
    """Exchange a refresh token for a new access + refresh token pair."""
    token_payload = decode_token(payload.refresh_token)
    if token_payload is None or token_payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )
    user_id = token_payload.get("sub")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    return TokenResponse(
        access_token=create_access_token(str(user.id)),
        refresh_token=create_refresh_token(str(user.id)),
    )


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout():
    """Logout — client should discard stored tokens."""
    return None


@router.get("/me", response_model=UserRead)
def me(current_user: User = Depends(get_current_user)):
    """Get the currently authenticated user's profile."""
    return current_user


@router.post("/github", response_model=TokenResponse)
def github_oauth(payload: GitHubOAuthRequest, db: Session = Depends(get_db)):
    """Exchange a GitHub OAuth code for JWT tokens."""
    if not settings.github_client_id or not settings.github_client_secret:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="GitHub OAuth is not configured",
        )
    # Exchange code for access token
    with httpx.Client() as client:
        token_resp = client.post(
            "https://github.com/login/oauth/access_token",
            json={
                "client_id": settings.github_client_id,
                "client_secret": settings.github_client_secret,
                "code": payload.code,
            },
            headers={"Accept": "application/json"},
            timeout=10,
        )
    if token_resp.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to exchange GitHub code",
        )
    github_token = token_resp.json().get("access_token")
    if not github_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No access token returned from GitHub",
        )
    # Fetch GitHub user info
    with httpx.Client() as client:
        user_resp = client.get(
            "https://api.github.com/user",
            headers={"Authorization": f"Bearer {github_token}"},
            timeout=10,
        )
        email_resp = client.get(
            "https://api.github.com/user/emails",
            headers={"Authorization": f"Bearer {github_token}"},
            timeout=10,
        )
    if user_resp.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to fetch GitHub user info",
        )
    gh_user = user_resp.json()
    # Determine primary email
    primary_email = gh_user.get("email")
    if not primary_email and email_resp.status_code == 200:
        emails = email_resp.json()
        for e in emails:
            if e.get("primary") and e.get("verified"):
                primary_email = e["email"]
                break
    if not primary_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not retrieve email from GitHub",
        )
    # Find or create user
    user = db.query(User).filter(User.email == primary_email).first()
    if not user:
        gh_login = gh_user.get("login", "").replace(" ", "_") or f"gh_{gh_user['id']}"
        # Ensure username uniqueness
        username = gh_login
        suffix = 1
        while db.query(User).filter(User.username == username).first():
            username = f"{gh_login}_{suffix}"
            suffix += 1
        user = User(
            email=primary_email,
            username=username,
            display_name=gh_user.get("name") or gh_login,
            avatar_url=gh_user.get("avatar_url"),
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    return TokenResponse(
        access_token=create_access_token(str(user.id)),
        refresh_token=create_refresh_token(str(user.id)),
    )
