from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from app.core.llm_client import chat_sync, chat_stream

router = APIRouter(prefix="/llm", tags=["llm"])

@router.post("/chat")
def chat(payload: dict):
    messages = payload.get("messages", [])
    return {"answer": chat_sync(messages)}

@router.post("/chat/stream")
def chat_streaming(payload: dict):
    messages = payload.get("messages", [])

    def gen():
        for chunk in chat_stream(messages):
            # openai v1 streaming chunk: choices[0].delta.content
            try:
                delta = chunk.choices[0].delta.content  # type: ignore[attr-defined]
            except Exception:
                delta = None
            if delta:
                yield delta

    return StreamingResponse(gen(), media_type="text/plain")