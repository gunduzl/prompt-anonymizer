from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.db.session import get_db, SessionLocal
from app.db import models
from app.auth.deps import get_current_user
from app.core.settings import settings
from app.dlp.client import PresidioClient
from app.dlp.policy import DlpPolicy
import hashlib
from app.llm.client import LlmClient
from app.core.llm_client import chat_stream as llm_chat_stream, chat_sync
import logging
import json
import re

router = APIRouter(prefix="/chat", tags=["chat"]) 

def generate_session_title(first_message: str) -> str:
    """İlk mesajdan otomatik session başlığı oluştur"""
    try:
        # Mesajı temizle ve kısalt
        clean_message = re.sub(r'[^\w\s]', '', first_message).strip()
        if len(clean_message) > 100:
            clean_message = clean_message[:100] + "..."
        
        # Eğer mesaj çok kısa ise direkt kullan
        if len(clean_message) <= 50:
            return clean_message or "Yeni Sohbet"
        
        # LLM ile başlık oluştur
        title_prompt = f"Bu mesaj için kısa ve öz bir başlık oluştur (maksimum 5 kelime): '{clean_message}'"
        title = chat_sync([
            {"role": "system", "content": "Sen bir başlık oluşturucu asistansın. Verilen mesaj için kısa, öz ve anlamlı başlıklar oluşturursun. Sadece başlığı döndür, başka açıklama yapma."},
            {"role": "user", "content": title_prompt}
        ])
        
        # Başlığı temizle ve kısalt
        title = title.strip().strip('"').strip("'")
        if len(title) > 60:
            title = title[:60] + "..."
            
        return title or clean_message[:50] or "Yeni Sohbet"
    except Exception as e:
        logging.warning(f"Title generation failed: {e}")
        # Fallback: ilk 50 karakteri kullan
        return first_message[:50] + ("..." if len(first_message) > 50 else "") or "Yeni Sohbet" 

class CreateSessionRequest(BaseModel):
    title: str | None = None

class UpdateSessionRequest(BaseModel):
    title: str | None = None
    pinned: bool | None = None

class SendMessageRequest(BaseModel):
    session_id: str | None = None
    text: str

class StreamMessageRequest(BaseModel):
    text: str

@router.post("/sessions")
def create_session(payload: CreateSessionRequest, db: Session = Depends(get_db), user=Depends(get_current_user)):
    session = models.ChatSession(user_id=user.id, title=payload.title)
    db.add(session)
    db.commit()
    db.refresh(session)
    return {"session_id": session.id}

@router.get("/sessions")
def list_sessions(db: Session = Depends(get_db), user=Depends(get_current_user)):
    sessions = (
        db.query(models.ChatSession)
        .filter(models.ChatSession.user_id == user.id)
        .order_by(models.ChatSession.pinned.desc(), models.ChatSession.created_at.desc())
        .all()
    )
    return [{"id": s.id, "title": s.title, "pinned": getattr(s, "pinned", False), "created_at": s.created_at.isoformat()} for s in sessions]

@router.patch("/sessions/{session_id}")
def update_session(session_id: str, payload: UpdateSessionRequest, db: Session = Depends(get_db), user=Depends(get_current_user)):
    sess = db.query(models.ChatSession).filter(models.ChatSession.id == session_id, models.ChatSession.user_id == user.id).first()
    if not sess:
        raise HTTPException(404, "Oturum bulunamadı")
    if payload.title is not None:
        sess.title = payload.title
    if payload.pinned is not None:
        sess.pinned = payload.pinned
    db.commit()
    return {"ok": True}

@router.delete("/sessions/{session_id}")
def delete_session(session_id: str, db: Session = Depends(get_db), user=Depends(get_current_user)):
    sess = db.query(models.ChatSession).filter(models.ChatSession.id == session_id, models.ChatSession.user_id == user.id).first()
    if not sess:
        raise HTTPException(404, "Oturum bulunamadı")
    # delete messages first (no cascade configured)
    db.query(models.Message).filter(models.Message.session_id == session_id, models.Message.user_id == user.id).delete()
    db.delete(sess)
    db.commit()
    return {"ok": True}

@router.get("/sessions/{session_id}/messages")
def get_messages(session_id: str, db: Session = Depends(get_db), user=Depends(get_current_user)):
    sess = db.query(models.ChatSession).filter(models.ChatSession.id == session_id, models.ChatSession.user_id == user.id).first()
    if not sess:
        raise HTTPException(404, "Oturum bulunamadı")
    msgs = db.query(models.Message).filter(models.Message.session_id == session_id).order_by(models.Message.created_at.asc()).all()
    return [{"id": m.id, "role": m.role, "content": m.content, "created_at": m.created_at.isoformat()} for m in msgs]

@router.get("/history")
def history(session_id: str, db: Session = Depends(get_db), user=Depends(get_current_user)):
    # only own session
    sess = db.query(models.ChatSession).filter(models.ChatSession.id == session_id, models.ChatSession.user_id == user.id).first()
    if not sess:
        raise HTTPException(404, "Oturum bulunamadı")
    msgs = db.query(models.Message).filter(models.Message.session_id == session_id).order_by(models.Message.created_at.asc()).all()
    return [{"id": m.id, "role": m.role, "content": m.content, "created_at": m.created_at.isoformat()} for m in msgs]

@router.post("/send")
def send(payload: SendMessageRequest, db: Session = Depends(get_db), user=Depends(get_current_user)):
    # If no session_id provided, create a new session
    if not payload.session_id:
        session = models.ChatSession(user_id=user.id)
        db.add(session)
        db.commit()
        db.refresh(session)
        sess = session
    else:
        sess = db.query(models.ChatSession).filter(models.ChatSession.id == payload.session_id, models.ChatSession.user_id == user.id).first()
        if not sess:
            raise HTTPException(404, "Oturum bulunamadı")

    # DLP Enforce: analyze → policy → block/mask
    client = PresidioClient()
    from app.dlp.policy_manager import get_policy_manager
    policy = get_policy_manager()
    import asyncio
    
    try:
        recognitions = asyncio.run(client.analyze(payload.text))
        action, flags = policy.decide(recognitions)
    except Exception as e:
        logging.warning(f"DLP analysis failed: {e}")
        # Fallback: allow without DLP analysis
        recognitions = []
        action, flags = "allow", []
        
    if action == "block" and settings.DLP_ENFORCE:
        # DLP block: artır ve logla
        try:
            u = db.query(models.User).filter(models.User.id == user.id).first()
            if u:
                u.dlp_violation_count = (u.dlp_violation_count or 0) + 1
                db.commit()
        except Exception:
            db.rollback()
        # Generate anonymized version for blocked messages
        try:
            masked_text = asyncio.run(client.anonymize(payload.text, recognitions))
        except Exception as e:
            logging.warning(f"DLP anonymization failed: {e}")
            masked_text = payload.text
        raise HTTPException(400, detail={
            "action": "block", 
            "flags": flags,
            "original_text": payload.text,
            "anonymized_text": masked_text,
            "recognitions": [{"entity_type": r["entity_type"], "start": r["start"], "end": r["end"], "score": r["score"]} for r in recognitions]
        })

    masked_text = payload.text
    if action == "mask":
        try:
            masked_text = asyncio.run(client.anonymize(payload.text, recognitions, mode="mask"))
        except Exception as e:
            logging.warning(f"DLP anonymization failed: {e}")
            # Fallback: use original text
            masked_text = payload.text

    # Store user message with dlp_status
    raw_hash = hashlib.sha256(payload.text.encode()).hexdigest()
    dlp_status = "allow" if action == "allow" else ("masked" if action == "mask" else "blocked")
    user_msg = models.Message(session_id=sess.id, user_id=user.id, role="user", content=masked_text, raw_content_hash=raw_hash, pii_flags={"flags": flags}, dlp_status=dlp_status)
    db.add(user_msg)
    # If masked, increase user dlp counter
    if action == "mask":
        try:
            u = db.query(models.User).filter(models.User.id == user.id).first()
            if u:
                u.dlp_violation_count = (u.dlp_violation_count or 0) + 1
        except Exception:
            pass
    db.commit()
    db.refresh(user_msg)

    # Call LLM with masked text directly via OpenAI
    from app.core.llm_client import chat_sync
    try:
        reply_text = chat_sync([
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": masked_text},
        ])
    except Exception as e:
        logging.exception("LLM call failed")
        # Fallback: echo on failure
        reply_text = f"Echo: {masked_text}"

    bot_msg = models.Message(session_id=sess.id, user_id=user.id, role="assistant", content=reply_text)
    db.add(bot_msg)
    db.commit()

    # Eğer session'ın başlığı yoksa ve bu ilk mesajsa, otomatik başlık oluştur
    if not sess.title:
        try:
            # Session'daki mesaj sayısını kontrol et (user + assistant = 2 mesaj = ilk sohbet)
            message_count = db.query(models.Message).filter(models.Message.session_id == sess.id).count()
            if message_count <= 2:  # İlk user mesajı + ilk assistant mesajı
                generated_title = generate_session_title(payload.text)
                sess.title = generated_title
                db.commit()
        except Exception as e:
            logging.warning(f"Auto title generation failed: {e}")

    # Return detailed DLP information for frontend display
    return {
        "reply": reply_text, 
        "session_id": sess.id,  # Include session_id in response
        "action": action, 
        "flags": flags,
        "dlp_info": {
            "original_text": payload.text if action in ["mask", "block"] else None,
            "masked_text": masked_text if action == "mask" else None,
            "recognitions": [{"entity_type": r["entity_type"], "start": r["start"], "end": r["end"], "score": r["score"]} for r in recognitions] if recognitions else []
        }
    }

@router.post("/sessions/{session_id}/stream")
def stream(session_id: str, payload: StreamMessageRequest, request: Request, db: Session = Depends(get_db), user=Depends(get_current_user)):
    # Validate session ownership
    sess = db.query(models.ChatSession).filter(models.ChatSession.id == session_id, models.ChatSession.user_id == user.id).first()
    if not sess:
        raise HTTPException(404, "Oturum bulunamadı")

    user_id = user.id  # capture early to avoid accessing ORM object in generator

    # DLP analyze & policy
    client = PresidioClient()
    from app.dlp.policy_manager import get_policy_manager
    policy = get_policy_manager()
    import asyncio
    recognitions = asyncio.run(client.analyze(payload.text))
    action, flags = policy.decide(recognitions)

    if action == "block" and settings.DLP_ENFORCE:
        # Increase violation count then stream error
        try:
            u = db.query(models.User).filter(models.User.id == user.id).first()
            if u:
                u.dlp_violation_count = (u.dlp_violation_count or 0) + 1
                db.commit()
        except Exception:
            db.rollback()
        def err_gen():
            data = json.dumps({"action": action, "flags": flags})
            yield f"event: error\ndata: {data}\n\n"
        return StreamingResponse(err_gen(), media_type="text/event-stream", headers={"Cache-Control": "no-cache", "Connection": "keep-alive"})

    masked_text = payload.text
    if action == "mask":
        masked_text = asyncio.run(client.anonymize(payload.text, recognitions, mode="mask"))

    # Store user message with dlp_status
    raw_hash = hashlib.sha256(payload.text.encode()).hexdigest()
    dlp_status = "allow" if action == "allow" else ("masked" if action == "mask" else "blocked")
    user_msg = models.Message(session_id=session_id, user_id=user_id, role="user", content=masked_text, raw_content_hash=raw_hash, pii_flags={"flags": flags}, dlp_status=dlp_status)
    db.add(user_msg)
    if action == "mask":
        try:
            u = db.query(models.User).filter(models.User.id == user_id).first()
            if u:
                u.dlp_violation_count = (u.dlp_violation_count or 0) + 1
        except Exception:
            pass
    db.commit()
    db.refresh(user_msg)

    messages = [
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": masked_text},
    ]

    def sse_gen():
        assistant_accum = []
        # Send meta first
        meta = json.dumps({"action": action, "flags": flags})
        yield f"event: meta\ndata: {meta}\n\n"
        try:
            for chunk in llm_chat_stream(messages):
                try:
                    delta = chunk.choices[0].delta.content  # type: ignore[attr-defined]
                except Exception:
                    delta = None
                if delta:
                    assistant_accum.append(delta)
                    data = json.dumps({"delta": delta})
                    yield f"event: token\ndata: {data}\n\n"
            # done
            full_text = "".join(assistant_accum)
            # save assistant message using a fresh DB session to avoid dependency cleanup issues
            bot_msg_id = None
            db2 = SessionLocal()
            try:
                bot_msg = models.Message(session_id=session_id, user_id=user_id, role="assistant", content=full_text)
                db2.add(bot_msg)
                db2.commit()
                db2.refresh(bot_msg)
                bot_msg_id = bot_msg.id
            finally:
                db2.close()
            done_data = json.dumps({"message_id": bot_msg_id})
            yield f"event: done\ndata: {done_data}\n\n"
        except GeneratorExit:
            # client disconnected; do not save partial? we could, but skip for now
            logging.info("Client disconnected during stream for session %s", session_id)
        except Exception as e:
            logging.exception("Streaming failed")
            err = json.dumps({"error": str(e)})
            yield f"event: error\ndata: {err}\n\n"
        finally:
            # ensure flush
            pass

    return StreamingResponse(sse_gen(), media_type="text/event-stream", headers={"Cache-Control": "no-cache", "Connection": "keep-alive"})