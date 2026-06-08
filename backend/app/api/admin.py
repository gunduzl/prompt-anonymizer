from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta, timezone
from app.db.session import get_db
from app.db import models
from app.auth.security import hash_password
from app.auth.deps import require_admin_role
from sqlalchemy import func, desc

router = APIRouter(prefix="/admin", tags=["admin"]) 

class CreateUserRequest(BaseModel):
    email: EmailStr
    username: str
    password: str

class UserStatsResponse(BaseModel):
    total_users: int
    active_users_today: int
    total_sessions: int
    total_messages: int
    dlp_violations_today: int

class SystemStatsResponse(BaseModel):
    uptime: str
    total_api_calls: int
    active_sessions: int
    storage_used: str

@router.get("/stats/users")
async def get_user_stats(db: Session = Depends(get_db), user: models.User = Depends(require_admin_role())):
    """Kullanıcı istatistiklerini getir"""
    today = datetime.now().date()
    
    total_users = db.query(models.User).count()
    total_sessions = db.query(models.ChatSession).count()
    total_messages = db.query(models.Message).count()
    
    # Bugün aktif olan kullanıcılar (mesaj gönderenler)
    active_users_today = db.query(models.User.id).join(models.ChatSession).join(models.Message)\
        .filter(func.date(models.Message.created_at) == today).distinct().count()
    
    # Bugünkü DLP ihlalleri (varsayılan olarak 0, gerçek implementasyon gerekebilir)
    dlp_violations_today = 0
    
    return UserStatsResponse(
        total_users=total_users,
        active_users_today=active_users_today,
        total_sessions=total_sessions,
        total_messages=total_messages,
        dlp_violations_today=dlp_violations_today
    )

@router.get("/stats/system")
async def get_system_stats(db: Session = Depends(get_db), user: models.User = Depends(require_admin_role())):
    """Sistem istatistiklerini getir"""
    active_sessions = db.query(models.ChatSession)\
        .filter(models.ChatSession.created_at >= datetime.now() - timedelta(hours=24)).count()
    
    return SystemStatsResponse(
        uptime="24h 30m",  # Gerçek uptime hesaplanabilir
        total_api_calls=0,  # API call tracking eklenebilir
        active_sessions=active_sessions,
        storage_used="2.3 GB"  # Gerçek storage hesaplanabilir
    )

@router.get("/users")
async def list_users(db: Session = Depends(get_db), user: models.User = Depends(require_admin_role())):
    """Kullanıcıları listele"""
    users = db.query(models.User).all()
    result = []
    for u in users:
        # Get user roles
        user_roles = db.query(models.Role.name).join(models.UserRole, models.Role.id == models.UserRole.role_id).filter(models.UserRole.user_id == u.id).all()
        role_names = [r[0] for r in user_roles]
        
        result.append({
            "id": u.id, 
            "email": u.email, 
            "username": u.username, 
            "auth_type": u.auth_type, 
            "dlp_violation_count": u.dlp_violation_count,
            "roles": role_names,
            "failed_login_attempts": u.failed_login_attempts,
            "locked_until": u.locked_until.isoformat() if u.locked_until else None,
            "profile_data": u.profile_data,
            "created_at": u.created_at.isoformat(),
            "last_login": None  # This would need to be tracked separately
        })
    return result

@router.post("/users")
async def create_user(payload: CreateUserRequest, db: Session = Depends(get_db), user: models.User = Depends(require_admin_role())):
    if db.query(models.User).filter((models.User.email == payload.email) | (models.User.username == payload.username)).first():
        raise HTTPException(400, "Email veya username mevcut")
    user = models.User(email=payload.email, username=payload.username, password_hash=hash_password(payload.password), auth_type="db")
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"id": user.id, "email": user.email, "username": user.username}

# Yeni: Kullanıcı silme
class DeleteUserResponse(BaseModel):
    ok: bool

@router.delete("/users/{user_id}")
async def delete_user(user_id: str, db: Session = Depends(get_db), user: models.User = Depends(require_admin_role())):
    """Kullanıcı sil"""
    target_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not target_user:
        raise HTTPException(404, "Kullanıcı bulunamadı")
    
    db.delete(target_user)
    db.commit()
    return {"ok": True}
# Session Management APIs
@router.get("/sessions")
def list_all_sessions(
    page: int = 1, 
    limit: int = 50, 
    user_id: Optional[str] = None,
    archived: Optional[bool] = None,
    db: Session = Depends(get_db), 
    user: models.User = Depends(require_admin_role())
):
    """Tüm session'ları listele (sayfalama ile)"""
    query = db.query(models.ChatSession)
    
    if user_id:
        query = query.filter(models.ChatSession.user_id == user_id)
    if archived is not None:
        query = query.filter(models.ChatSession.is_archived == archived)
    
    total = query.count()
    sessions = query.order_by(models.ChatSession.created_at.desc())\
                   .offset((page - 1) * limit)\
                   .limit(limit)\
                   .all()
    
    return {
        "sessions": [{
            "id": s.id,
            "user_id": s.user_id,
            "title": s.title,
            "pinned": s.pinned,
            "is_archived": s.is_archived,
            "tags": s.tags,
            "created_at": s.created_at.isoformat(),
            "updated_at": s.updated_at.isoformat() if hasattr(s, 'updated_at') else None
        } for s in sessions],
        "total": total,
        "page": page,
        "limit": limit
    }

class SessionUpdateRequest(BaseModel):
    title: Optional[str] = None
    is_archived: Optional[bool] = None
    tags: Optional[List[str]] = None

@router.patch("/sessions/{session_id}")
def update_session(
    session_id: str, 
    payload: SessionUpdateRequest, 
    db: Session = Depends(get_db), 
    user: models.User = Depends(require_admin_role())
):
    """Session'ı güncelle (admin)"""
    sess = db.query(models.ChatSession).filter(models.ChatSession.id == session_id).first()
    if not sess:
        raise HTTPException(404, "Session bulunamadı")
    
    if payload.title is not None:
        sess.title = payload.title
    if payload.is_archived is not None:
        sess.is_archived = payload.is_archived
    if payload.tags is not None:
        sess.tags = payload.tags
    
    db.commit()
    return {"ok": True}

@router.delete("/sessions/{session_id}")
def delete_session_admin(
    session_id: str, 
    db: Session = Depends(get_db), 
    user: models.User = Depends(require_admin_role())
):
    """Session'ı sil (admin)"""
    sess = db.query(models.ChatSession).filter(models.ChatSession.id == session_id).first()
    if not sess:
        raise HTTPException(404, "Session bulunamadı")
    
    # Mesajları da sil
    db.query(models.Message).filter(models.Message.session_id == session_id).delete()
    db.delete(sess)
    db.commit()
    return {"ok": True}

# System Configuration APIs
class SystemConfigRequest(BaseModel):
    key: str
    value: str
    data_type: str = "string"
    description: Optional[str] = None
    is_public: bool = False

@router.get("/system/configs")
async def list_system_configs(db: Session = Depends(get_db), user: models.User = Depends(require_admin_role())):
    """Sistem konfigürasyonlarını listele"""
    configs = db.query(models.SystemConfig).order_by(models.SystemConfig.key).all()
    return [{
        "id": c.id,
        "key": c.key,
        "value": c.value,
        "data_type": c.data_type,
        "description": c.description,
        "is_public": c.is_public,
        "created_at": c.created_at.isoformat(),
        "updated_at": c.updated_at.isoformat()
    } for c in configs]

@router.get("/config")
async def list_configs(db: Session = Depends(get_db), user: models.User = Depends(require_admin_role())):
    """Sistem konfigürasyonlarını listele (alias for /system/configs)"""
    configs = db.query(models.SystemConfig).order_by(models.SystemConfig.key).all()
    return [{
        "id": c.id,
        "key": c.key,
        "value": c.value,
        "data_type": c.data_type,
        "description": c.description,
        "is_public": c.is_public,
        "created_at": c.created_at.isoformat(),
        "updated_at": c.updated_at.isoformat()
    } for c in configs]

@router.post("/config")
def create_system_config(
    payload: SystemConfigRequest, 
    db: Session = Depends(get_db), 
    user: models.User = Depends(require_admin_role())
):
    """Sistem konfigürasyonu oluştur"""
    # Check if key already exists
    existing = db.query(models.SystemConfig).filter(models.SystemConfig.key == payload.key).first()
    if existing:
        raise HTTPException(400, "Bu key zaten mevcut")
    
    config = models.SystemConfig(
        key=payload.key,
        value=payload.value,
        data_type=payload.data_type,
        description=payload.description,
        is_public=payload.is_public
    )
    db.add(config)
    db.commit()
    db.refresh(config)
    return {"id": config.id}

@router.patch("/config/{config_id}")
def update_system_config(
    config_id: str,
    payload: SystemConfigRequest,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_admin_role())
):
    """Sistem konfigürasyonunu güncelle"""
    config = db.query(models.SystemConfig).filter(models.SystemConfig.id == config_id).first()
    if not config:
        raise HTTPException(404, "Konfigürasyon bulunamadı")
    
    config.value = payload.value
    config.data_type = payload.data_type
    if payload.description is not None:
        config.description = payload.description
    config.is_public = payload.is_public
    
    db.commit()
    return {"ok": True}

@router.delete("/config/{config_id}")
def delete_system_config(
    config_id: str,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_admin_role())
):
    """Sistem konfigürasyonunu sil"""
    config = db.query(models.SystemConfig).filter(models.SystemConfig.id == config_id).first()
    if not config:
        raise HTTPException(404, "Konfigürasyon bulunamadı")
    
    db.delete(config)
    db.commit()
    return {"ok": True}

# Audit Log APIs
@router.get("/audit")
def list_audit_events(
    page: int = 1,
    limit: int = 50,
    action: Optional[str] = None,
    resource_type: Optional[str] = None,
    admin_user_id: Optional[str] = None,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_admin_role())
):
    """Audit loglarını listele"""
    query = db.query(models.AdminAuditEvent)
    
    if action:
        query = query.filter(models.AdminAuditEvent.action == action)
    if resource_type:
        query = query.filter(models.AdminAuditEvent.resource_type == resource_type)
    if admin_user_id:
        query = query.filter(models.AdminAuditEvent.admin_user_id == admin_user_id)
    
    total = query.count()
    events = query.order_by(models.AdminAuditEvent.created_at.desc())\
                  .offset((page - 1) * limit)\
                  .limit(limit)\
                  .all()
    
    return {
        "events": [{
            "id": e.id,
            "admin_user_id": e.admin_user_id,
            "action": e.action,
            "resource_type": e.resource_type,
            "resource_id": e.resource_id,
            "details": e.details,
            "ip_address": e.ip_address,
            "user_agent": e.user_agent,
            "created_at": e.created_at.isoformat()
        } for e in events],
        "total": total,
        "page": page,
        "limit": limit
    }

# Yeni: Kullanıcı rolleri atama (tam set)
class UpdateUserRolesRequest(BaseModel):
    roles: List[str]

@router.post("/users/{user_id}/roles")
async def set_user_roles(user_id: str, payload: UpdateUserRolesRequest, db: Session = Depends(get_db), user: models.User = Depends(require_admin_role())):
    u = db.query(models.User).filter(models.User.id == user_id).first()
    if not u:
        raise HTTPException(404, "Kullanıcı bulunamadı")
    # Mevcut rol bağlantılarını temizle
    db.query(models.UserRole).filter(models.UserRole.user_id == user_id).delete(synchronize_session=False)
    # Rolleri oluştur veya mevcutları bul
    for name in set(payload.roles or []):
        if not name:
            continue
        r = db.query(models.Role).filter(models.Role.name == name).first()
        if not r:
            r = models.Role(name=name)
            db.add(r)
            db.flush()
        db.add(models.UserRole(user_id=user_id, role_id=r.id))
    db.commit()
    return {"ok": True}

# Yeni: Kullanıcı geçmişi (session ve mesajlar)
@router.get("/users/{user_id}/sessions")
async def list_user_sessions(user_id: str, db: Session = Depends(get_db), user: models.User = Depends(require_admin_role())):
    sessions = db.query(models.ChatSession).filter(models.ChatSession.user_id == user_id).order_by(models.ChatSession.created_at.desc()).all()
    return [{"id": s.id, "title": s.title, "created_at": s.created_at.isoformat()} for s in sessions]

@router.get("/users/{user_id}/sessions/{session_id}/messages")
async def list_user_session_messages(user_id: str, session_id: str, db: Session = Depends(get_db), user: models.User = Depends(require_admin_role())):
    sess = db.query(models.ChatSession).filter(models.ChatSession.id == session_id, models.ChatSession.user_id == user_id).first()
    if not sess:
        raise HTTPException(404, "Oturum bulunamadı")
    msgs = db.query(models.Message).filter(models.Message.session_id == session_id).order_by(models.Message.created_at.asc()).all()
    return [{"id": m.id, "role": m.role, "content": m.content, "dlp_status": getattr(m, "dlp_status", None), "flags": (m.pii_flags or {}).get("flags", []), "created_at": m.created_at.isoformat()} for m in msgs]

# LiteLLM Key Management
class LiteLLMKeyCreate(BaseModel):
    key_value: str
    key_name: Optional[str] = None
    key_alias: Optional[str] = None
    is_active: bool = True
    expires_at: Optional[str] = None  # ISO format datetime string
    max_budget: Optional[float] = None
    usage_limit: Optional[int] = None

class LiteLLMKeyUpdate(BaseModel):
    key_value: Optional[str] = None
    key_name: Optional[str] = None
    key_alias: Optional[str] = None
    is_active: Optional[bool] = None
    expires_at: Optional[str] = None
    max_budget: Optional[float] = None
    usage_limit: Optional[int] = None

@router.get("/keys")
async def list_keys(db: Session = Depends(get_db), user: models.User = Depends(require_admin_role())):
    try:
        keys = db.query(models.LiteLLMKey).order_by(models.LiteLLMKey.created_at.desc()).all()
    except Exception:
        # Keep admin UI alive even if key table schema/data is temporarily inconsistent.
        return []
    now_utc = datetime.now(timezone.utc)
    result = []
    for k in keys:
        try:
            # Calculate expiry status
            expiry_status = "active"
            days_until_expiry = None
            if k.expires_at:
                expiry_dt = k.expires_at
                if expiry_dt.tzinfo is None:
                    expiry_dt = expiry_dt.replace(tzinfo=timezone.utc)
                delta = expiry_dt - now_utc
                days_until_expiry = delta.days
                if delta.total_seconds() <= 0:
                    expiry_status = "expired"
                elif delta.days <= 30:
                    expiry_status = "expiring_soon"

            # Calculate budget usage percentage
            budget_usage_pct = None
            if k.max_budget and k.max_budget > 0:
                spend_value = getattr(k, "spend", 0) or 0
                budget_usage_pct = round((spend_value / k.max_budget) * 100, 2)

            key_value = k.key_value or ""
            key_prefix = key_value[:8] + "..." if len(key_value) > 8 else key_value

            result.append({
                "id": k.id,
                "key_value": key_value,
                "key_prefix": key_prefix,
                "key_name": getattr(k, "key_name", None),
                "key_alias": getattr(k, "key_alias", None),
                "is_active": bool(getattr(k, "is_active", True)),
                "expires_at": k.expires_at.isoformat() if k.expires_at else None,
                "days_until_expiry": days_until_expiry,
                "expiry_status": expiry_status,
                "max_budget": getattr(k, "max_budget", None),
                "spend": getattr(k, "spend", 0) or 0,
                "budget_usage_pct": budget_usage_pct,
                "usage_count": getattr(k, "usage_count", 0) or 0,
                "usage_limit": getattr(k, "usage_limit", None),
                "last_used_at": k.last_used_at.isoformat() if getattr(k, "last_used_at", None) else None,
                "created_at": k.created_at.isoformat() if getattr(k, "created_at", None) else None,
                "updated_at": k.updated_at.isoformat() if getattr(k, "updated_at", None) else None,
            })
        except Exception:
            continue
    return result

@router.post("/keys")
async def create_key(payload: LiteLLMKeyCreate, db: Session = Depends(get_db), user: models.User = Depends(require_admin_role())):
    expires_at_dt = None
    if payload.expires_at:
        try:
            expires_at_dt = datetime.fromisoformat(payload.expires_at.replace("Z", "+00:00"))
        except ValueError:
            from fastapi import HTTPException as HE
            raise HE(400, "Invalid expires_at format. Use ISO format.")
    
    k = models.LiteLLMKey(
        key_value=payload.key_value,
        key_name=payload.key_name,
        key_alias=payload.key_alias,
        is_active=payload.is_active,
        expires_at=expires_at_dt,
        max_budget=payload.max_budget,
        usage_limit=payload.usage_limit,
    )
    db.add(k)
    db.commit()
    db.refresh(k)
    return {
        "id": k.id,
        "key_value": k.key_value,
        "key_name": k.key_name,
        "key_alias": k.key_alias,
        "is_active": k.is_active,
        "expires_at": k.expires_at.isoformat() if k.expires_at else None,
        "max_budget": k.max_budget,
        "usage_limit": k.usage_limit,
    }

@router.patch("/keys/{key_id}")
async def update_key(key_id: str, payload: LiteLLMKeyUpdate, db: Session = Depends(get_db), user: models.User = Depends(require_admin_role())):
    k = db.query(models.LiteLLMKey).filter(models.LiteLLMKey.id == key_id).first()
    if not k:
        raise HTTPException(404, "Key bulunamadı")
    if payload.key_value is not None:
        k.key_value = payload.key_value
    if payload.key_name is not None:
        k.key_name = payload.key_name
    if payload.key_alias is not None:
        k.key_alias = payload.key_alias
    if payload.is_active is not None:
        k.is_active = payload.is_active
    if payload.expires_at is not None:
        try:
            k.expires_at = datetime.fromisoformat(payload.expires_at.replace("Z", "+00:00"))
        except ValueError:
            raise HTTPException(400, "Invalid expires_at format")
    if payload.max_budget is not None:
        k.max_budget = payload.max_budget
    if payload.usage_limit is not None:
        k.usage_limit = payload.usage_limit
    db.commit()
    return {"ok": True}

@router.delete("/keys/{key_id}")
async def delete_key(key_id: str, db: Session = Depends(get_db), user: models.User = Depends(require_admin_role())):
    k = db.query(models.LiteLLMKey).filter(models.LiteLLMKey.id == key_id).first()
    if not k:
        raise HTTPException(404, "Key bulunamadı")
    db.delete(k)
    db.commit()
    return {"ok": True}

# Enhanced DLP Policy Management
class DlpPolicyRequest(BaseModel):
    name: str
    entity_type: str
    action: str
    config: Optional[dict] = None
    priority: int = 1
    description: Optional[str] = None

class DlpPolicyUpdate(BaseModel):
    name: Optional[str] = None
    entity_type: Optional[str] = None
    action: Optional[str] = None
    config_json: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None

@router.get("/policies")
async def list_dlp_policies(db: Session = Depends(get_db), user: models.User = Depends(require_admin_role())):
    """DLP policy'leri listele"""
    policies = db.query(models.DlpPolicyRule).order_by(models.DlpPolicyRule.priority.desc()).all()
    return [{
        "id": p.id,
        "name": p.name,
        "entity_type": p.entity_type,
        "action": p.action,
        "config": p.config_json,
        "priority": p.priority,
        "description": p.description,
        "created_by": p.created_by,
        "is_active": p.is_active,
        "created_at": p.created_at.isoformat() if hasattr(p, 'created_at') else None
    } for p in policies]

@router.post("/policies")
async def create_dlp_policy(
    payload: DlpPolicyRequest, 
    db: Session = Depends(get_db), 
    user: models.User = Depends(require_admin_role())
):
    """DLP policy oluştur"""
    policy = models.DlpPolicyRule(
        name=payload.name,
        entity_type=payload.entity_type,
        action=payload.action,
        config_json=payload.config,
        priority=payload.priority,
        description=payload.description,
        created_by=user.id,
        is_active=True
    )
    db.add(policy)
    db.commit()
    db.refresh(policy)
    return {"id": policy.id}

@router.patch("/policies/{policy_id}")
async def update_dlp_policy(
    policy_id: str, 
    payload: DlpPolicyRequest, 
    db: Session = Depends(get_db), 
    user: models.User = Depends(require_admin_role())
):
    """DLP policy güncelle"""
    policy = db.query(models.DlpPolicyRule).filter(models.DlpPolicyRule.id == policy_id).first()
    if not policy:
        raise HTTPException(404, "Policy bulunamadı")
    
    policy.name = payload.name
    policy.entity_type = payload.entity_type
    policy.action = payload.action
    policy.config_json = payload.config
    policy.priority = payload.priority
    if payload.description is not None:
        policy.description = payload.description
    
    db.commit()
    
    # Cache'i invalidate et
    from app.dlp.policy_manager import invalidate_policy_cache
    invalidate_policy_cache()
    
    return {"ok": True}

@router.delete("/policies/{policy_id}")
async def delete_dlp_policy(
    policy_id: str, 
    db: Session = Depends(get_db), 
    user: models.User = Depends(require_admin_role())
):
    """DLP policy sil"""
    policy = db.query(models.DlpPolicyRule).filter(models.DlpPolicyRule.id == policy_id).first()
    if not policy:
        raise HTTPException(404, "Policy bulunamadı")
    
    db.delete(policy)
    db.commit()
    
    # Cache'i invalidate et
    from app.dlp.policy_manager import invalidate_policy_cache
    invalidate_policy_cache()
    
    return {"ok": True}

# Analytics APIs
@router.get("/analytics/overview")
def get_analytics_overview(
    days: int = 30,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_admin_role())
):
    """Genel analitik özeti"""
    from datetime import datetime, timedelta
    
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=days)
    
    # Session analytics
    session_analytics = db.query(models.SessionAnalytics)\
        .filter(models.SessionAnalytics.created_at >= start_date)\
        .all()
    
    total_sessions = len(session_analytics)
    total_messages = sum(s.message_count for s in session_analytics)
    total_dlp_violations = sum(s.dlp_violations for s in session_analytics)
    avg_duration = sum(s.duration_minutes for s in session_analytics if s.duration_minutes) / max(1, len([s for s in session_analytics if s.duration_minutes]))
    
    # User stats
    total_users = db.query(models.User).count()
    active_users = db.query(models.User)\
        .join(models.ChatSession)\
        .filter(models.ChatSession.created_at >= start_date)\
        .distinct(models.User.id)\
        .count()
    
    return {
        "period_days": days,
        "total_sessions": total_sessions,
        "total_messages": total_messages,
        "total_dlp_violations": total_dlp_violations,
        "avg_session_duration": round(avg_duration, 2),
        "total_users": total_users,
        "active_users": active_users,
        "user_activity_rate": round((active_users / max(1, total_users)) * 100, 2)
    }

@router.get("/analytics/dlp-trends")
def get_dlp_trends(
    days: int = 30,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_admin_role())
):
    """DLP ihlal trendleri"""
    from datetime import datetime, timedelta
    from sqlalchemy import func, text
    
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=days)
    
    # DLP violations by day
    violations_by_day = db.execute(text("""
        SELECT DATE(created_at) as date, COUNT(*) as violations
        FROM messages 
        WHERE created_at >= :start_date 
        AND dlp_status IN ('blocked', 'masked')
        GROUP BY DATE(created_at)
        ORDER BY date
    """), {"start_date": start_date}).fetchall()
    
    # DLP violations by type
    violations_by_type = db.execute(text("""
        SELECT dlp_status, COUNT(*) as count
        FROM messages 
        WHERE created_at >= :start_date 
        AND dlp_status IN ('blocked', 'masked')
        GROUP BY dlp_status
    """), {"start_date": start_date}).fetchall()
    
    return {
        "violations_by_day": [{"date": str(row[0]), "violations": row[1]} for row in violations_by_day],
        "violations_by_type": [{"type": row[0], "count": row[1]} for row in violations_by_type]
    }

@router.get("/analytics/users")
def get_user_analytics(
    days: int = 30,
    limit: int = 50,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_admin_role())
):
    """Kullanıcı bazlı DLP analytics"""
    from datetime import datetime, timedelta
    from sqlalchemy import func, text
    
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=days)
    
    # Kullanıcı bazlı DLP ihlalleri ve session bilgileri
    user_analytics = db.execute(text("""
        SELECT 
            u.id,
            u.username,
            u.email,
            u.dlp_violation_count,
            COUNT(DISTINCT cs.id) as total_sessions,
            COUNT(DISTINCT CASE WHEN cs.created_at >= :start_date THEN cs.id END) as recent_sessions,
            COUNT(CASE WHEN m.dlp_status IN ('blocked', 'masked') AND m.created_at >= :start_date THEN 1 END) as recent_violations,
            COUNT(CASE WHEN m.dlp_status = 'blocked' AND m.created_at >= :start_date THEN 1 END) as blocked_messages,
            COUNT(CASE WHEN m.dlp_status = 'masked' AND m.created_at >= :start_date THEN 1 END) as masked_messages,
            MAX(m.created_at) as last_activity
        FROM users u
        LEFT JOIN chat_sessions cs ON u.id = cs.user_id
        LEFT JOIN messages m ON cs.id = m.session_id
        GROUP BY u.id, u.username, u.email, u.dlp_violation_count
        ORDER BY recent_violations DESC, u.dlp_violation_count DESC
        LIMIT :limit
    """), {"start_date": start_date, "limit": limit}).fetchall()
    
    # Aktif session sayısı (son 24 saat içinde aktivite olan)
    active_sessions_count = db.execute(text("""
        SELECT COUNT(DISTINCT cs.id)
        FROM chat_sessions cs
        JOIN messages m ON cs.id = m.session_id
        WHERE m.created_at >= :active_threshold
    """), {"active_threshold": datetime.utcnow() - timedelta(hours=24)}).scalar()
    
    return {
        "users": [
            {
                "user_id": row[0],
                "username": row[1],
                "email": row[2],
                "total_violations": row[3] or 0,
                "total_sessions": row[4] or 0,
                "recent_sessions": row[5] or 0,
                "recent_violations": row[6] or 0,
                "blocked_messages": row[7] or 0,
                "masked_messages": row[8] or 0,
                "last_activity": row[9].isoformat() if row[9] else None
            }
            for row in user_analytics
        ],
        "active_sessions": active_sessions_count or 0,
        "period_days": days
    }

@router.get("/analytics/sessions")
def get_session_analytics(
    days: int = 30,
    user_id: Optional[str] = None,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_admin_role())
):
    """Session bazlı analytics"""
    from datetime import datetime, timedelta
    from sqlalchemy import func, text
    
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=days)
    
    # Session analytics with DLP data
    query = """
        SELECT 
            cs.id,
            cs.title,
            cs.user_id,
            u.username,
            cs.created_at,
            COUNT(m.id) as message_count,
            COUNT(CASE WHEN m.dlp_status IN ('blocked', 'masked') THEN 1 END) as dlp_violations,
            COUNT(CASE WHEN m.dlp_status = 'blocked' THEN 1 END) as blocked_count,
            COUNT(CASE WHEN m.dlp_status = 'masked' THEN 1 END) as masked_count,
            MAX(m.created_at) as last_message_at
        FROM chat_sessions cs
        LEFT JOIN users u ON cs.user_id = u.id
        LEFT JOIN messages m ON cs.id = m.session_id
        WHERE cs.created_at >= :start_date
    """
    
    params = {"start_date": start_date}
    
    if user_id:
        query += " AND cs.user_id = :user_id"
        params["user_id"] = user_id
    
    query += """
        GROUP BY cs.id, cs.title, cs.user_id, u.username, cs.created_at
        ORDER BY dlp_violations DESC, cs.created_at DESC
        LIMIT 100
    """
    
    sessions = db.execute(text(query), params).fetchall()
    
    return {
        "sessions": [
            {
                "session_id": row[0],
                "title": row[1] or "Başlıksız Oturum",
                "user_id": row[2],
                "username": row[3],
                "created_at": row[4].isoformat() if row[4] else None,
                "message_count": row[5] or 0,
                "dlp_violations": row[6] or 0,
                "blocked_count": row[7] or 0,
                "masked_count": row[8] or 0,
                "last_message_at": row[9].isoformat() if row[9] else None
            }
            for row in sessions
        ],
        "period_days": days
    }
