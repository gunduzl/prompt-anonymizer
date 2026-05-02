from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db import models
from app.schemas.auth import RegisterRequest, LoginRequest, TokenResponse
from app.auth.security import hash_password, verify_password, create_access_token

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/register", response_model=dict)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    if db.query(models.User).filter((models.User.email == payload.email) | (models.User.username == payload.username)).first():
        raise HTTPException(400, "Email veya username kullanılmakta")
    user = models.User(
        email=payload.email,
        username=payload.username,
        password_hash=hash_password(payload.password),
        auth_type="db",
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"id": user.id, "email": user.email, "username": user.username}

@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(
        (models.User.email == payload.email_or_username) | (models.User.username == payload.email_or_username)
    ).first()
    if not user or user.auth_type != "db" or not user.password_hash or not verify_password(payload.password, user.password_hash):
        raise HTTPException(401, "Geçersiz kimlik bilgileri")
    token = create_access_token(user.id)
    return TokenResponse(access_token=token, user={"id": user.id, "email": user.email, "username": user.username})