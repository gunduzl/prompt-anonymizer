import re
import uuid
from typing import Dict, List, Any, Tuple
from dataclasses import dataclass

@dataclass
class PlaceholderMapping:
    """PII verisi ve placeholder arasındaki eşleşmeyi tutar"""
    original_value: str
    placeholder: str
    entity_type: str
    start: int
    end: int
    score: float

class PlaceholderManager:
    """PII verilerini placeholder'larla değiştirme ve geri dönüştürme işlemlerini yönetir"""
    
    def __init__(self):
        self.mappings: Dict[str, PlaceholderMapping] = {}
        self.entity_counters: Dict[str, int] = {}
    
    def _generate_placeholder(self, entity_type: str) -> str:
        """Entity tipine göre anlamlı placeholder üretir"""
        if entity_type not in self.entity_counters:
            self.entity_counters[entity_type] = 0
        
        self.entity_counters[entity_type] += 1
        counter = self.entity_counters[entity_type]
        
        placeholder_templates = {
            "PERSON": f"[KİŞİ_{counter}]",
            "PHONE_NUMBER": f"[TELEFON_{counter}]", 
            "EMAIL_ADDRESS": f"[EMAIL_{counter}]",
            "CREDIT_CARD": f"[KART_{counter}]",
            "NATIONAL_ID_TR": f"[TCKN_{counter}]",
            "IBAN_CODE": f"[IBAN_{counter}]",
            "IP_ADDRESS": f"[IP_{counter}]",
            "LOCATION": f"[KONUM_{counter}]",
            "DATE_TIME": f"[TARİH_{counter}]",
            "URL": f"[URL_{counter}]",
        }
        
        return placeholder_templates.get(entity_type, f"[{entity_type}_{counter}]")
    
    def anonymize_with_placeholders(self, text: str, recognitions: List[Dict[str, Any]]) -> Tuple[str, Dict[str, PlaceholderMapping]]:
        """
        Metni placeholder'larla anonimleştirir ve mapping bilgilerini döner
        
        Args:
            text: Orijinal metin
            recognitions: Presidio'dan gelen PII tanıma sonuçları
            
        Returns:
            Tuple[anonimleştirilmiş_metin, placeholder_mappings]
        """
        # Recognitions'ları pozisyona göre ters sırada sırala (sondan başa doğru değiştirmek için)
        sorted_recognitions = sorted(recognitions, key=lambda x: x['start'], reverse=True)
        
        anonymized_text = text
        mappings = {}
        
        for recognition in sorted_recognitions:
            start = recognition['start']
            end = recognition['end']
            entity_type = recognition['entity_type']
            score = recognition.get('score', 0.0)
            
            original_value = text[start:end]
            placeholder = self._generate_placeholder(entity_type)
            
            # Metinde değiştir
            anonymized_text = anonymized_text[:start] + placeholder + anonymized_text[end:]
            
            # Mapping'i kaydet
            mapping = PlaceholderMapping(
                original_value=original_value,
                placeholder=placeholder,
                entity_type=entity_type,
                start=start,
                end=end,
                score=score
            )
            mappings[placeholder] = mapping
        
        self.mappings.update(mappings)
        return anonymized_text, mappings
    
    def restore_from_placeholders(self, text: str, mappings: Dict[str, PlaceholderMapping] = None) -> str:
        """
        Placeholder'ları orijinal değerlerle değiştirerek metni geri döndürür
        
        Args:
            text: Placeholder'lar içeren metin
            mappings: Kullanılacak mapping'ler (None ise self.mappings kullanılır)
            
        Returns:
            Orijinal değerlerle geri döndürülmüş metin
        """
        if mappings is None:
            mappings = self.mappings
            
        restored_text = text
        
        for placeholder, mapping in mappings.items():
            restored_text = restored_text.replace(placeholder, mapping.original_value)
        
        return restored_text
    
    def get_diff_highlights(self, original: str, anonymized: str, mappings: Dict[str, PlaceholderMapping]) -> List[Dict[str, Any]]:
        """
        Orijinal ve anonimleştirilmiş metin arasındaki farkları highlight için döner
        
        Returns:
            List of {type: 'original'|'anonymized', text: str, entity_type: str, placeholder: str}
        """
        highlights = []
        
        # Her placeholder için highlight bilgisi oluştur
        for placeholder, mapping in mappings.items():
            highlights.append({
                'type': 'replacement',
                'original_text': mapping.original_value,
                'anonymized_text': placeholder,
                'entity_type': mapping.entity_type,
                'score': mapping.score
            })
        
        return highlights
    
    def clear_mappings(self):
        """Tüm mapping'leri temizler"""
        self.mappings.clear()
        self.entity_counters.clear()