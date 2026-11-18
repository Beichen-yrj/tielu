from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .auth import get_current_user
from .config import get_settings
from .database import get_db
from .models import PlatformSetting, User
from .schemas import (
    AdminPasswordReset,
    AdminUserCreate,
    AdminUserResponse,
    AdminUserUpdate,
    AiGlobalConfigResponse,
    AiGlobalConfigUpdate,
)
from .security import hash_password

router = APIRouter(prefix="/api/admin", tags=["admin"])


def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="仅超级管理员可访问平台管理")
    return user


def _user_response(user: User) -> AdminUserResponse:
    return AdminUserResponse.model_validate(user)


@router.get("/users", response_model=list[AdminUserResponse])
def list_users(_: User = Depends(require_admin), db: Session = Depends(get_db)) -> list[AdminUserResponse]:
    return [_user_response(user) for user in db.scalars(select(User).order_by(User.created_at.desc())).all()]


@router.post("/users", response_model=AdminUserResponse, status_code=status.HTTP_201_CREATED)
def create_user(payload: AdminUserCreate, _: User = Depends(require_admin), db: Session = Depends(get_db)) -> AdminUserResponse:
    user = User(username=payload.username, display_name=payload.display_name.strip(), password_hash=hash_password(payload.password), role=payload.role, is_active=True)
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="该账号已存在") from None
    db.refresh(user)
    return _user_response(user)


@router.patch("/users/{user_id}", response_model=AdminUserResponse)
def update_user(user_id: int, payload: AdminUserUpdate, admin: User = Depends(require_admin), db: Session = Depends(get_db)) -> AdminUserResponse:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="账号不存在")
    if user.id == admin.id and payload.is_active is False:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="不能停用当前登录的超级管理员账号")
    if user.id == admin.id and payload.role not in {None, "admin"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="不能降低当前登录超级管理员的权限，请由其他超级管理员操作")
    if payload.display_name is not None:
        user.display_name = payload.display_name.strip()
    role_changed = payload.role is not None and payload.role != user.role
    if payload.role is not None:
        user.role = payload.role
    if payload.is_active is not None:
        user.is_active = payload.is_active
    if not user.is_active or role_changed:
        now = datetime.now(timezone.utc)
        for session in user.sessions:
            if session.revoked_at is None:
                session.revoked_at = now
    db.commit()
    db.refresh(user)
    return _user_response(user)


@router.post("/users/{user_id}/reset-password", response_model=dict[str, str])
def reset_password(user_id: int, payload: AdminPasswordReset, _: User = Depends(require_admin), db: Session = Depends(get_db)) -> dict[str, str]:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="账号不存在")
    user.password_hash = hash_password(payload.new_password)
    now = datetime.now(timezone.utc)
    for session in user.sessions:
        if session.revoked_at is None:
            session.revoked_at = now
    db.commit()
    return {"message": "密码已重置，原有登录会话已失效"}


def _setting(db: Session, key: str) -> PlatformSetting | None:
    return db.get(PlatformSetting, key)


def _ai_config(db: Session, settings=None) -> tuple[str, str, str, str, datetime | None]:
    settings = settings or get_settings()
    key_setting = _setting(db, "ai.api_key")
    base_setting = _setting(db, "ai.base_url")
    model_setting = _setting(db, "ai.model")
    # An explicitly cleared database key disables AI even when an old env key exists.
    api_key = key_setting.value if key_setting is not None else getattr(settings, "deepseek_api_key", "")
    base_url = base_setting.value if base_setting and base_setting.value else getattr(settings, "deepseek_base_url", "https://api.deepseek.com")
    model = model_setting.value if model_setting and model_setting.value else getattr(settings, "deepseek_model", "deepseek-chat")
    timestamps = [item.updated_at for item in (key_setting, base_setting, model_setting) if item and getattr(item, "updated_at", None)]
    updated = max(
        timestamps,
        key=lambda value: (value if value.tzinfo else value.replace(tzinfo=timezone.utc)).timestamp(),
        default=None,
    )
    source = "平台全局配置" if any(item is not None for item in (key_setting, base_setting, model_setting)) else "后端环境变量"
    return api_key, base_url, model, source, updated


def _mask(value: str) -> str:
    if not value:
        return "未配置"
    if len(value) <= 8:
        return "••••••••"
    return f"{value[:4]}••••{value[-4:]}"


@router.get("/ai-config", response_model=AiGlobalConfigResponse)
def get_ai_config(_: User = Depends(require_admin), db: Session = Depends(get_db)) -> AiGlobalConfigResponse:
    api_key, base_url, model, source, updated = _ai_config(db)
    return AiGlobalConfigResponse(configured=bool(api_key), api_key_masked=_mask(api_key), base_url=base_url, model=model, source=source, updated_at=updated)


@router.put("/ai-config", response_model=AiGlobalConfigResponse)
def update_ai_config(payload: AiGlobalConfigUpdate, admin: User = Depends(require_admin), db: Session = Depends(get_db)) -> AiGlobalConfigResponse:
    api_key, base_url, model, _, _ = _ai_config(db)
    if payload.clear_api_key:
        api_key = ""
    elif payload.api_key is not None and payload.api_key.strip():
        api_key = payload.api_key.strip()
    if payload.base_url is not None:
        base_url = payload.base_url.strip().rstrip("/") or get_settings().deepseek_base_url
    if payload.model is not None:
        model = payload.model.strip() or get_settings().deepseek_model
    now = datetime.now(timezone.utc)
    values = {"ai.api_key": (api_key, True), "ai.base_url": (base_url, False), "ai.model": (model, False)}
    for key, (value, secret) in values.items():
        item = _setting(db, key)
        if item is None:
            db.add(PlatformSetting(key=key, value=value, is_secret=secret, updated_by=admin.id))
        else:
            item.value = value
            item.is_secret = secret
            item.updated_by = admin.id
            item.updated_at = now
    db.commit()
    return get_ai_config(admin, db)


def resolve_ai_config(db: Session, settings=None) -> tuple[str, str, str]:
    api_key, base_url, model, _, _ = _ai_config(db, settings)
    return api_key, base_url, model
