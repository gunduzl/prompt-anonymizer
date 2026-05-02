from sqlalchemy.orm import Session
from app.db import models
from datetime import datetime
from typing import Optional, Dict, Any

def log_admin_action(
    db: Session,
    admin_user_id: str,
    action: str,
    resource_type: str,
    resource_id: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None
):
    """Admin eylemlerini audit log'a kaydet"""
    audit_event = models.AdminAuditEvent(
        admin_user_id=admin_user_id,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        details=details,
        ip_address=ip_address,
        user_agent=user_agent
    )
    db.add(audit_event)
    db.commit()
    return audit_event

def get_client_info(request):
    """Request'ten client bilgilerini çıkar"""
    ip_address = request.client.host if hasattr(request, 'client') else None
    user_agent = request.headers.get('user-agent') if hasattr(request, 'headers') else None
    return ip_address, user_agent