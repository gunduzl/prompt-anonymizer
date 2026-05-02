import os
from dotenv import load_dotenv
from openai import OpenAI

# Load env from .env if available
load_dotenv()

_client: OpenAI | None = None


def _resolve_base_url() -> str:
    # Prefer explicit LLM_BASE_URL, else default to OpenAI API directly
    return os.getenv("LLM_BASE_URL") or "https://api.openai.com/v1"


def _resolve_api_key() -> str:
    # Try LLM_API_KEY, else OPENAI_API_KEY
    return os.getenv("LLM_API_KEY") or os.getenv("OPENAI_API_KEY") or ""


def _resolve_model() -> str:
    return os.getenv("LLM_MODEL") or "gpt-4o-mini"


def get_client() -> OpenAI:
    global _client
    # Always create a new client to pick up environment changes
    _client = OpenAI(api_key=_resolve_api_key(), base_url=_resolve_base_url())
    return _client


def chat_sync(messages: list[dict]) -> str:
    print(f"DEBUG: API Key: {_resolve_api_key()[:20]}...")
    print(f"DEBUG: Base URL: {_resolve_base_url()}")
    print(f"DEBUG: Model: {_resolve_model()}")
    resp = get_client().chat.completions.create(model=_resolve_model(), messages=messages)
    return resp.choices[0].message.content or ""


def chat_stream(messages: list[dict]):
    return get_client().chat.completions.create(model=_resolve_model(), messages=messages, stream=True)