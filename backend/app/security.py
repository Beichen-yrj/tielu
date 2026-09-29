from __future__ import annotations

from datetime import datetime, timedelta, timezone
from uuid import uuid4

import bcrypt
import jwt

from .config import get_settings


ALGORITHM = "HS256"


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))


def create_access_token(user_id: int) -> tuple[str, str, datetime]:
    settings = get_settings()
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(minutes=settings.access_token_minutes)
    token_id = str(uuid4())
    token = jwt.encode(
        {"sub": str(user_id), "jti": token_id, "iat": now, "exp": expires_at},
        settings.jwt_secret,
        algorithm=ALGORITHM,
    )
    return token, token_id, expires_at


def decode_access_token(token: str) -> dict[str, object]:
    return jwt.decode(token, get_settings().jwt_secret, algorithms=[ALGORITHM])
