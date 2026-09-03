import base64
from datetime import datetime, timedelta, timezone
import hashlib
import hmac
import os
import secrets

from fastapi import HTTPException, Request, status

from lib.db import db
from models.auth import OwnerUser


SESSION_COOKIE = "cash_session"
PASSWORD_ITERATIONS = 260_000


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, PASSWORD_ITERATIONS)
    return f"{base64.b64encode(salt).decode()}:{base64.b64encode(digest).decode()}"


def verify_password(password: str, encoded: str) -> bool:
    try:
        salt_encoded, digest_encoded = encoded.split(":", 1)
        salt = base64.b64decode(salt_encoded)
        expected = base64.b64decode(digest_encoded)
    except (ValueError, TypeError):
        return False
    candidate = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, PASSWORD_ITERATIONS)
    return hmac.compare_digest(candidate, expected)


def hash_session_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


async def ensure_owner() -> dict:
    email = os.environ.get("OWNER_EMAIL", "").strip().lower()
    password = os.environ.get("OWNER_PASSWORD", "")
    if not email or not password:
        raise RuntimeError("OWNER_EMAIL e OWNER_PASSWORD precisam estar configurados")
    owner = await db.auth_users.find_one({"email": email})
    if owner:
        return owner
    owner = {
        "id": "owner",
        "email": email,
        "name": "Proprietário",
        "password_hash": hash_password(password),
        "created_at": datetime.now(timezone.utc),
    }
    await db.auth_users.insert_one(owner)
    return owner


async def require_user(request: Request) -> OwnerUser:
    token = request.cookies.get(SESSION_COOKIE)
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Faça login para continuar")
    session = await db.auth_sessions.find_one({
        "token_hash": hash_session_token(token),
        "expires_at": {"$gt": datetime.now(timezone.utc)},
    })
    if not session:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Sessão inválida ou expirada")
    owner = await db.auth_users.find_one({"id": session["user_id"]})
    if not owner:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuário não encontrado")
    return OwnerUser(id=owner["id"], email=owner["email"], name=owner["name"])


def session_expiration() -> datetime:
    days = int(os.environ.get("SESSION_TTL_DAYS", "30"))
    return datetime.now(timezone.utc) + timedelta(days=days)