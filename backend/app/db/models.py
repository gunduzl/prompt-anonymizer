from sqlalchemy import String, Text, Boolean, ForeignKey, CheckConstraint, UniqueConstraint, Integer, JSON, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from uuid import uuid4
from datetime import datetime
from .base import Base, TimestampMixin

class User(Base, TimestampMixin):
    __tablename__ = "users"
    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid4()))
    email: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    username: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    password_hash: Mapped[str | None] = mapped_column(Text, nullable=True)
    display_name: Mapped[str | None] = mapped_column(Text)
    auth_type: Mapped[str] = mapped_column(String, nullable=False, default="db")
    external_id: Mapped[str | None] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    # New: how many times user hit DLP (mask or block)
    dlp_violation_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    failed_login_attempts: Mapped[int] = mapped_column(Integer, default=0)  # Security tracking
    locked_until: Mapped[datetime | None] = mapped_column(DateTime)  # Account lockout
    profile_data: Mapped[dict | None] = mapped_column(JSON)  # Additional user profile info

    roles: Mapped[list["Role"]] = relationship("Role", secondary="user_roles", back_populates="users")

class Role(Base):
    __tablename__ = "roles"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String, unique=True, nullable=False)

    users: Mapped[list[User]] = relationship("User", secondary="user_roles", back_populates="roles")

class UserRole(Base):
    __tablename__ = "user_roles"
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), primary_key=True)
    role_id: Mapped[int] = mapped_column(ForeignKey("roles.id"), primary_key=True)

class ChatSession(Base, TimestampMixin):
    __tablename__ = "chat_sessions"
    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid4()))
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False)
    title: Mapped[str | None] = mapped_column(String)
    pinned: Mapped[bool] = mapped_column(Boolean, default=False)
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False)  # Admin can archive sessions
    tags: Mapped[list[str] | None] = mapped_column(JSON)  # Session categorization
    session_metadata: Mapped[dict | None] = mapped_column(JSON)  # Additional session metadata
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)

class Message(Base):
    __tablename__ = "messages"
    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid4()))
    session_id: Mapped[str] = mapped_column(ForeignKey("chat_sessions.id"), nullable=False)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False)
    role: Mapped[str] = mapped_column(String, nullable=False)
    content: Mapped[str] = mapped_column(Text)
    raw_content_hash: Mapped[str | None] = mapped_column(Text)
    pii_flags: Mapped[dict | None] = mapped_column(JSON)
    # New: DLP status for this message (allow/masked/blocked)
    dlp_status: Mapped[str | None] = mapped_column(String)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)

class AuditEvent(Base):
    __tablename__ = "audit_events"
    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid4()))
    actor_user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"))
    event_type: Mapped[str] = mapped_column(String)
    ref_id: Mapped[str | None] = mapped_column(String)
    extra: Mapped[dict | None] = mapped_column("metadata", JSON)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)

class ConfigKV(Base):
    __tablename__ = "config"
    key: Mapped[str] = mapped_column(String, primary_key=True)
    value: Mapped[dict | None] = mapped_column(JSON)

class LdapTemp(Base):
    __tablename__ = "ldap_users_temp"
    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid4()))
    external_id: Mapped[str | None] = mapped_column(Text)
    email: Mapped[str | None] = mapped_column(Text)
    username: Mapped[str | None] = mapped_column(Text)
    display_name: Mapped[str | None] = mapped_column(Text)

# New: LiteLLM API Keys table
class LiteLLMKey(Base, TimestampMixin):
    __tablename__ = "litellm_keys"
    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid4()))
    key_value: Mapped[str] = mapped_column(Text, nullable=False)
    key_name: Mapped[str | None] = mapped_column(String, nullable=True)
    key_alias: Mapped[str | None] = mapped_column(String, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    max_budget: Mapped[float | None] = mapped_column(nullable=True)
    spend: Mapped[float] = mapped_column(nullable=False, default=0.0)
    usage_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    usage_limit: Mapped[int | None] = mapped_column(Integer, nullable=True)
    last_used_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

# New: DLP Policies table (admin-managed)
class DlpPolicyRule(Base, TimestampMixin):
    __tablename__ = "dlp_policies"
    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid4()))
    name: Mapped[str] = mapped_column(String, nullable=False)
    entity_type: Mapped[str] = mapped_column(String, nullable=False)
    action: Mapped[str] = mapped_column(String, nullable=False)  # allow | mask | block
    config_json: Mapped[dict | None] = mapped_column(JSON)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    priority: Mapped[int] = mapped_column(Integer, default=0)  # Rule priority for ordering
    description: Mapped[str | None] = mapped_column(Text)  # Rule description
    created_by: Mapped[str | None] = mapped_column(ForeignKey("users.id"))  # Admin who created

# DLP Rule Sets - SkyHigh benzeri kural setleri
class DlpRuleSet(Base, TimestampMixin):
    __tablename__ = "dlp_rule_sets"
    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid4()))
    name: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    priority: Mapped[int] = mapped_column(Integer, default=0)  # Rule set priority
    tags: Mapped[list[str] | None] = mapped_column(JSON)  # For categorization
    category: Mapped[str | None] = mapped_column(String)  # "security", "compliance", "custom"
    created_by: Mapped[str | None] = mapped_column(ForeignKey("users.id"))

# DLP Rule Set Rules - Kural seti içindeki kurallar
class DlpRuleSetRule(Base, TimestampMixin):
    __tablename__ = "dlp_rule_set_rules"
    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid4()))
    rule_set_id: Mapped[str] = mapped_column(ForeignKey("dlp_rule_sets.id"), nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    criteria: Mapped[dict] = mapped_column(JSON, nullable=False)  # Kural kriterleri
    action: Mapped[str] = mapped_column(String, nullable=False)  # allow | mask | block | remove
    action_config: Mapped[dict | None] = mapped_column(JSON)  # Aksiyon konfigürasyonu
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    priority: Mapped[int] = mapped_column(Integer, default=0)  # Kural önceliği
    description: Mapped[str | None] = mapped_column(Text)
    created_by: Mapped[str | None] = mapped_column(ForeignKey("users.id"))

# System Configuration Model
class SystemConfig(Base, TimestampMixin):
    __tablename__ = "system_configs"
    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid4()))
    key: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    value: Mapped[str | None] = mapped_column(Text)
    data_type: Mapped[str] = mapped_column(String, default="string")  # string, integer, boolean, json
    description: Mapped[str | None] = mapped_column(Text)
    is_public: Mapped[bool] = mapped_column(Boolean, default=False)  # Can be accessed by non-admin users

# Enhanced Audit Event Model
class AdminAuditEvent(Base):
    __tablename__ = "admin_audit_events"
    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid4()))
    admin_user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False)
    action: Mapped[str] = mapped_column(String, nullable=False)  # CREATE_USER, DELETE_SESSION, UPDATE_POLICY, etc.
    resource_type: Mapped[str] = mapped_column(String, nullable=False)  # USER, SESSION, POLICY, etc.
    resource_id: Mapped[str | None] = mapped_column(String)  # ID of affected resource
    details: Mapped[dict | None] = mapped_column(JSON)  # Additional action details
    ip_address: Mapped[str | None] = mapped_column(String)
    user_agent: Mapped[str | None] = mapped_column(String)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)

# Session Analytics Model
class SessionAnalytics(Base, TimestampMixin):
    __tablename__ = "session_analytics"
    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid4()))
    session_id: Mapped[str] = mapped_column(ForeignKey("chat_sessions.id"), nullable=False)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False)
    message_count: Mapped[int] = mapped_column(Integer, default=0)
    dlp_violations: Mapped[int] = mapped_column(Integer, default=0)
    total_tokens: Mapped[int] = mapped_column(Integer, default=0)
    duration_minutes: Mapped[int] = mapped_column(Integer, default=0)
    last_activity: Mapped[datetime] = mapped_column(default=datetime.utcnow)