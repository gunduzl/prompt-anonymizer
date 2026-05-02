from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.settings import settings
from app.api import auth as auth_api
from app.api import admin as admin_api
from app.api import chat as chat_api
from app.api import pii as pii_api
from app.api import dlp_management
from app.db.base import Base
from app.db.session import engine
from app.db import models  # noqa: F401 - ensure models are imported so tables are registered
from app.scripts.seed_roles_users import main as seed_roles_users
from app.routers import llm  # added
from sqlalchemy import text

app = FastAPI(title="Enterprise AI Chat", version="0.1.0", description="Faz 0-1: Local DB auth, temel chat+admin ve DLP/PII ön-işleme")

# Resolve allowed origins from settings.FRONTEND_ORIGIN (supports comma-separated list)
origins_cfg = settings.FRONTEND_ORIGIN or "*"
allow_origins = [o.strip() for o in origins_cfg.split(",")] if "," in origins_cfg else ([origins_cfg] if origins_cfg else ["*"])

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def _startup():
    # Create tables if not exist and seed roles/admin user
    Base.metadata.create_all(bind=engine)
    # Lightweight migrations: ensure new columns exist
    try:
        with engine.connect() as conn:
            # Existing
            conn.execute(text("ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS pinned boolean NOT NULL DEFAULT false"))
            # New columns for admin features
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS dlp_violation_count integer NOT NULL DEFAULT 0"))
            conn.execute(text("ALTER TABLE messages ADD COLUMN IF NOT EXISTS dlp_status text"))
            conn.commit()
    except Exception:
        # ignore migration errors in dev startup
        pass
    try:
        seed_roles_users()
    except Exception:
        # seeding is idempotent; ignore errors to not block startup
        pass

@app.get("/health")
def health():
    return {"status": "ok"}

app.include_router(auth_api.router)
app.include_router(admin_api.router)
app.include_router(chat_api.router)
app.include_router(pii_api.router)
app.include_router(dlp_management.router)
app.include_router(llm.router)  # added