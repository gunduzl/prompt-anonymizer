from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache

class Settings(BaseSettings):
    APP_ENV: str = "dev"
    DATABASE_URL: str = "postgresql+psycopg://ai_user:ai_pass@localhost:5432/ai_db"
    REDIS_URL: str = "redis://localhost:6379/0"

    JWT_SECRET: str = "change_me"
    TOKEN_EXPIRE_MIN: int = 60

    CASBIN_MODEL_PATH: str = "app/rbac/model.conf"
    CASBIN_POLICY_PATH: str = "app/rbac/policy.csv"

    # DLP / Presidio
    PRESIDIO_ANALYZER_URL: str = "http://localhost:3000"
    PRESIDIO_ANONYMIZER_URL: str = "http://localhost:3001"
    # Enforce DLP policy decisions (block/mask). If False, block actions will be downgraded to allow (for dev/testing).
    DLP_ENFORCE: bool = True

    # LLM Gateway
    LLM_GATEWAY_URL: str = "http://localhost:8003"
    OPENAI_API_KEY: str | None = None
    # Accept additional LLM-specific env vars
    LLM_BASE_URL: str | None = None
    LLM_API_KEY: str | None = None
    LLM_MODEL: str | None = None

    # Frontend origin for CORS (comma-separated list or single origin)
    FRONTEND_ORIGIN: str = "*"

    # Pydantic v2 settings config
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

@lru_cache
def get_settings() -> "Settings":
    return Settings()

settings = get_settings()