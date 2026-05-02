from fastapi import Depends, HTTPException, Header
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db import models
from app.auth.security import decode_token

async def get_current_user(authorization: str | None = Header(None), db: Session = Depends(get_db)) -> models.User:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(401, "Kimlik doğrulama gerekli")
    token = authorization.split(" ", 1)[1]
    payload = decode_token(token)
    if not payload:
        raise HTTPException(401, "Geçersiz token")
    user_id = payload.get("sub")
    user = db.query(models.User).filter(models.User.id == user_id, models.User.is_active == True).first()  # noqa: E712
    if not user:
        raise HTTPException(401, "Kullanıcı bulunamadı veya pasif")
    return user

async def require_roles(roles: list[str], user: models.User = Depends(get_current_user), db: Session = Depends(get_db)) -> models.User:
    # basit kontrol: user_roles join ile rol adlarını çekip kontrol et
    q = db.query(models.Role.name).join(models.UserRole, models.Role.id == models.UserRole.role_id).filter(models.UserRole.user_id == user.id)
    user_role_names = {r[0] for r in q.all()}
    if not user_role_names.intersection(set(roles)):
        raise HTTPException(403, "Yetki yok")
    return user

def require_admin_role():
    """Dependency factory for admin role requirement"""
    async def _require_admin(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)) -> models.User:
        q = db.query(models.Role.name).join(models.UserRole, models.Role.id == models.UserRole.role_id).filter(models.UserRole.user_id == user.id)
        user_role_names = {r[0] for r in q.all()}
        if "admin" not in user_role_names:
            raise HTTPException(403, "Admin yetkisi gerekli")
        return user
    return _require_admin