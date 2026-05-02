from typing import List, Dict, Any
import httpx
from app.core.settings import settings

DEFAULT_MODEL = "gpt-4o"

class LlmClient:
    def __init__(self, base_url: str | None = None):
        self.base_url = (base_url or settings.LLM_GATEWAY_URL).rstrip("/")

    def chat(self, messages: List[Dict[str, str]], model: str = DEFAULT_MODEL, temperature: float = 0.2, max_tokens: int | None = None) -> str:
        url = f"{self.base_url}/v1/chat/completions"
        payload: Dict[str, Any] = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
        }
        if max_tokens is not None:
            payload["max_tokens"] = max_tokens
        headers: Dict[str, str] = {}
        if settings.OPENAI_API_KEY:
            headers["Authorization"] = f"Bearer {settings.OPENAI_API_KEY}"
        with httpx.Client(timeout=20) as client:
            r = client.post(url, json=payload, headers=headers)
            r.raise_for_status()
            data = r.json()
            # OpenAI-style response
            return data.get("choices", [{}])[0].get("message", {}).get("content", "")