from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Any, Dict
from app.dlp.client import PresidioClient
from app.dlp.policy import DlpPolicy
from app.dlp.placeholder import PlaceholderManager
from app.core.settings import settings
from app.auth.deps import get_current_user
import httpx

router = APIRouter(prefix="/pii", tags=["pii"])

class PreviewRequest(BaseModel):
    text: str
    entities: List[str] | None = None

class PreviewResponse(BaseModel):
    action: str
    masked_text: str
    placeholder_text: str
    flags: List[str]
    recognitions: List[Dict[str, Any]]
    placeholder_mappings: Dict[str, Dict[str, Any]]
    highlights: List[Dict[str, Any]]

@router.post("/preview", response_model=PreviewResponse)
async def preview(payload: PreviewRequest, user=Depends(get_current_user)):
    client = PresidioClient()
    placeholder_manager = PlaceholderManager()
    
    try:
        recognitions = await client.analyze(payload.text, payload.entities)
        policy = DlpPolicy()
        action, flags = policy.decide(recognitions)
        
        masked = payload.text
        placeholder_text = payload.text
        placeholder_mappings = {}
        highlights = []
        
        # PII tespit edildiğinde (block veya mask durumunda) anonimleştirme bilgilerini hazırla
        if action in ["block", "mask"] and recognitions:
            # Geleneksel maskeleme
            masked = await client.anonymize(payload.text, recognitions, mode="mask")
            
            # Placeholder ile anonimleştirme
            placeholder_text, mappings = placeholder_manager.anonymize_with_placeholders(
                payload.text, recognitions
            )
            
            # Mapping'leri serialize edilebilir formata çevir
            placeholder_mappings = {
                placeholder: {
                    "original_value": mapping.original_value,
                    "placeholder": mapping.placeholder,
                    "entity_type": mapping.entity_type,
                    "start": mapping.start,
                    "end": mapping.end,
                    "score": mapping.score
                }
                for placeholder, mapping in mappings.items()
            }
            
            # Highlight bilgilerini oluştur
            highlights = placeholder_manager.get_diff_highlights(
                payload.text, placeholder_text, mappings
            )
        
        return PreviewResponse(
            action=action,
            masked_text=masked,
            placeholder_text=placeholder_text,
            flags=flags,
            recognitions=recognitions,
            placeholder_mappings=placeholder_mappings,
            highlights=highlights
        )
    except httpx.HTTPStatusError as e:
        # Upstream presidio returned error
        raise HTTPException(status_code=502, detail={"message": "Analyzer/Anonymizer upstream error", "upstream_status": e.response.status_code})
    except httpx.RequestError:
        raise HTTPException(status_code=502, detail={"message": "Analyzer/Anonymizer not reachable"})

class RestoreRequest(BaseModel):
    text: str
    placeholder_mappings: Dict[str, Dict[str, Any]]

class RestoreResponse(BaseModel):
    restored_text: str

@router.post("/restore", response_model=RestoreResponse)
async def restore(payload: RestoreRequest, user=Depends(get_current_user)):
    """Placeholder'ları orijinal değerlerle değiştirerek metni geri döndürür"""
    placeholder_manager = PlaceholderManager()
    
    # Mapping'leri PlaceholderMapping objelerine çevir
    from app.dlp.placeholder import PlaceholderMapping
    mappings = {}
    for placeholder, mapping_data in payload.placeholder_mappings.items():
        mappings[placeholder] = PlaceholderMapping(
            original_value=mapping_data["original_value"],
            placeholder=mapping_data["placeholder"],
            entity_type=mapping_data["entity_type"],
            start=mapping_data["start"],
            end=mapping_data["end"],
            score=mapping_data["score"]
        )
    
    restored_text = placeholder_manager.restore_from_placeholders(payload.text, mappings)
    
    return RestoreResponse(restored_text=restored_text)

class DecisionRequest(BaseModel):
    text: str
    entities: List[str] | None = None

class DecisionResponse(BaseModel):
    action: str
    flags: List[str]

@router.post("/decision", response_model=DecisionResponse)
async def decision(payload: DecisionRequest, user=Depends(get_current_user)):
    client = PresidioClient()
    try:
        recognitions = await client.analyze(payload.text, payload.entities)
        policy = DlpPolicy()
        action, flags = policy.decide(recognitions)
        return DecisionResponse(action=action, flags=flags)
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=502, detail={"message": "Analyzer upstream error", "upstream_status": e.response.status_code})
    except httpx.RequestError:
        raise HTTPException(status_code=502, detail={"message": "Analyzer not reachable"})