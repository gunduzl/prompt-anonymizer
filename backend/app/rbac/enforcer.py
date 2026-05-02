import casbin
from app.core.settings import settings

def get_enforcer() -> casbin.Enforcer:
    e = casbin.Enforcer(settings.CASBIN_MODEL_PATH, settings.CASBIN_POLICY_PATH)
    return e