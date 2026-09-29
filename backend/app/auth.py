from __future__ import annotations

from datetime import datetime, timezone

import jwt
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from .config import get_settings
from .database import get_db
from .models import AuthSession, User
from .schemas import ChangePasswordRequest, LoginRequest, MessageResponse, RegisterRequest, TokenResponse, UserResponse
from .security import create_access_token, decode_access_token, hash_password, verify_password


router = APIRouter(prefix="/api/auth", tags=["authentication"])
bearer = HTTPBearer(auto_error=False)


def auth_error(detail: str = "登录状态无效或已过期") -> HTTPException:
    return HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=detail, headers={"WWW-Authenticate": "Bearer"})


def get_current_session(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: Session = Depends(get_db),
) -> tuple[User, AuthSession]:
    if credentials is None:
        raise auth_error()
    try:
        payload = decode_access_token(credentials.credentials)
        user_id = int(str(payload["sub"]))
        token_id = str(payload["jti"])
    except (jwt.InvalidTokenError, KeyError, ValueError):
        raise auth_error() from None

    session = db.scalar(select(AuthSession).where(AuthSession.token_id == token_id))
    user = db.get(User, user_id)
    now = datetime.now(timezone.utc)
    if session is None or user is None or not user.is_active or session.revoked_at is not None:
        raise auth_error()
    expires_at = session.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at <= now:
        raise auth_error()
    return user, session


def get_current_user(current: tuple[User, AuthSession] = Depends(get_current_session)) -> User:
    return current[0]


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: Session = Depends(get_db)) -> User:
    existing = db.scalar(select(User).where(User.username == payload.username))
    if existing is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="该账号已注册")
    user = User(
        username=payload.username,
        display_name=(payload.display_name or payload.username).strip(),
        password_hash=hash_password(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    user = db.scalar(select(User).where(User.username == payload.username.strip()))
    if user is None or not user.is_active or not verify_password(payload.password, user.password_hash):
        raise auth_error("账号或密码不正确")
    token, token_id, expires_at = create_access_token(user.id)
    db.add(AuthSession(token_id=token_id, user_id=user.id, expires_at=expires_at))
    db.commit()
    return TokenResponse(
        access_token=token,
        expires_in=get_settings().access_token_minutes * 60,
        user=UserResponse.model_validate(user),
    )


@router.get("/me", response_model=UserResponse)
def me(user: User = Depends(get_current_user)) -> User:
    return user


@router.post("/logout", response_model=MessageResponse)
def logout(current: tuple[User, AuthSession] = Depends(get_current_session), db: Session = Depends(get_db)) -> MessageResponse:
    current[1].revoked_at = datetime.now(timezone.utc)
    db.commit()
    return MessageResponse(message="已退出登录")


@router.post("/change-password", response_model=MessageResponse)
def change_password(
    payload: ChangePasswordRequest,
    current: tuple[User, AuthSession] = Depends(get_current_session),
    db: Session = Depends(get_db),
) -> MessageResponse:
    user, session = current
    if not verify_password(payload.current_password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="当前密码不正确")
    if payload.current_password == payload.new_password:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="新密码不能与当前密码相同")
    user.password_hash = hash_password(payload.new_password)
    now = datetime.now(timezone.utc)
    db.execute(
        update(AuthSession)
        .where(AuthSession.user_id == user.id, AuthSession.id != session.id, AuthSession.revoked_at.is_(None))
        .values(revoked_at=now)
    )
    db.commit()
    return MessageResponse(message="密码已修改，其他登录会话已失效")
