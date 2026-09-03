import os
import secrets

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status

from lib.auth import (
    SESSION_COOKIE,
    ensure_owner,
    hash_session_token,
    require_user,
    session_expiration,
    verify_password,
)
from lib.db import db
from models.auth import AuthMessageResponse, LoginRequest, LoginResponse, OwnerUser


router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=LoginResponse)
async def login(payload: LoginRequest, response: Response) -> LoginResponse:
    owner = await ensure_owner()
    if owner["email"] != payload.email.lower() or not verify_password(payload.password, owner["password_hash"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="E-mail ou senha incorretos")
    token = secrets.token_urlsafe(48)
    expiration = session_expiration()
    await db.auth_sessions.insert_one({
        "id": secrets.token_hex(16),
        "user_id": owner["id"],
        "token_hash": hash_session_token(token),
        "expires_at": expiration,
    })
    max_age = int(os.environ.get("SESSION_TTL_DAYS", "30")) * 24 * 60 * 60
    response.set_cookie(
        key=SESSION_COOKIE,
        value=token,
        httponly=True,
        samesite="lax",
        secure=False,
        max_age=max_age,
        path="/",
    )
    return LoginResponse(user=OwnerUser(id=owner["id"], email=owner["email"], name=owner["name"]))


@router.get("/me", response_model=OwnerUser)
async def me(user: OwnerUser = Depends(require_user)) -> OwnerUser:
    return user


@router.post("/logout", response_model=AuthMessageResponse)
async def logout(request: Request, response: Response) -> AuthMessageResponse:
    token = request.cookies.get(SESSION_COOKIE)
    if token:
        await db.auth_sessions.delete_one({"token_hash": hash_session_token(token)})
    response.delete_cookie(SESSION_COOKIE, path="/")
    return AuthMessageResponse(message="Sessão encerrada")