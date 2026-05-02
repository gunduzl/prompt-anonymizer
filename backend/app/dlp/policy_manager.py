from typing import Any, Dict, List, Tuple, Optional
from datetime import datetime, timedelta
import threading
import time
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db import models
import logging

logger = logging.getLogger(__name__)

class DynamicDlpPolicy:
    """
    Dinamik DLP Policy sistemi - veritabanından kuralları yükler ve cache'ler
    """
    
    def __init__(self):
        self._cache = {}
        self._last_update = None
        self._cache_ttl = 300  # 5 dakika cache
        self._lock = threading.Lock()
        
    def _load_policies_from_db(self) -> Dict[str, Any]:
        """Veritabanından aktif policy'leri yükle"""
        try:
            db = next(get_db())
            
            # Admin policies (DlpPolicyRule)
            admin_policies = db.query(models.DlpPolicyRule).filter(
                models.DlpPolicyRule.is_active == True
            ).order_by(models.DlpPolicyRule.priority.desc()).all()
            
            # Rule sets (DlpRuleSet + DlpRuleSetRule)
            rule_sets = db.query(models.DlpRuleSet).filter(
                models.DlpRuleSet.is_active == True
            ).all()
            
            policies = {
                'admin_policies': [],
                'rule_sets': [],
                'entity_thresholds': {},
                'block_entities': set(),
                'mask_entities': set(),
                'last_updated': datetime.now()
            }
            
            # Admin policies'i işle
            for policy in admin_policies:
                entity_types = policy.entity_type.split(',') if policy.entity_type else []
                
                policies['admin_policies'].append({
                    'id': policy.id,
                    'name': policy.name,
                    'entity_types': [et.strip() for et in entity_types],
                    'action': policy.action,
                    'priority': policy.priority,
                    'config': policy.config_json or {}
                })
                
                # Entity action mapping'i güncelle
                for entity_type in entity_types:
                    entity_type = entity_type.strip()
                    if policy.action == 'block':
                        policies['block_entities'].add(entity_type)
                    elif policy.action == 'mask':
                        policies['mask_entities'].add(entity_type)
            
            # Rule sets'i işle
            for rule_set in rule_sets:
                rules = db.query(models.DlpRuleSetRule).filter(
                    models.DlpRuleSetRule.rule_set_id == rule_set.id,
                    models.DlpRuleSetRule.is_active == True
                ).order_by(models.DlpRuleSetRule.priority.desc()).all()
                
                rule_set_data = {
                    'id': rule_set.id,
                    'name': rule_set.name,
                    'priority': rule_set.priority,
                    'rules': []
                }
                
                for rule in rules:
                    rule_data = {
                        'id': rule.id,
                        'name': rule.name,
                        'criteria': rule.criteria,
                        'action': rule.action,
                        'priority': rule.priority,
                        'action_config': rule.action_config or {}
                    }
                    rule_set_data['rules'].append(rule_data)
                    
                    # Criteria'dan entity'leri çıkar ve action mapping'e ekle
                    if isinstance(rule.criteria, dict):
                        entity_types = self._extract_entities_from_criteria(rule.criteria)
                        for entity_type in entity_types:
                            if rule.action == 'block':
                                policies['block_entities'].add(entity_type)
                            elif rule.action == 'mask':
                                policies['mask_entities'].add(entity_type)
                
                policies['rule_sets'].append(rule_set_data)
            
            db.close()
            return policies
            
        except Exception as e:
            logger.error(f"Error loading policies from database: {e}")
            return self._get_fallback_policies()
    
    def _extract_entities_from_criteria(self, criteria: Dict[str, Any]) -> List[str]:
        """Criteria'dan entity type'ları çıkar"""
        entities = []
        
        if isinstance(criteria, dict):
            if criteria.get('type') == 'entity_detected':
                entity_type = criteria.get('entity_type')
                if entity_type:
                    entities.append(entity_type)
            
            # Nested criteria'ları kontrol et
            for key, value in criteria.items():
                if isinstance(value, dict):
                    entities.extend(self._extract_entities_from_criteria(value))
                elif isinstance(value, list):
                    for item in value:
                        if isinstance(item, dict):
                            entities.extend(self._extract_entities_from_criteria(item))
        
        return entities
    
    def _get_fallback_policies(self) -> Dict[str, Any]:
        """Fallback policy'ler (veritabanı erişimi başarısız olursa)"""
        return {
            'admin_policies': [],
            'rule_sets': [],
            'entity_thresholds': {
                "CREDIT_CARD": 0.7,
                "IBAN_CODE": 0.7,
                "PHONE_NUMBER": 0.7,
                "EMAIL_ADDRESS": 0.8,
                "PERSON": 0.5,
                "NATIONAL_ID_TR": 0.7,
                "IP_ADDRESS": 0.6,
                "CREDIT_CARD_CVV": 0.9,
            },
            'block_entities': {
                "API_KEY", "CREDIT_CARD_CVV", "CREDIT_CARD", "CRYPTO", "PASSWORD", 
                "SECRET_KEY", "TR_TCKN", "PASSPORT", "DRIVER_LICENSE", "VKN", 
                "SGK", "IMEI", "ANDROID_ID", "SEC_CODE"
            },
            'mask_entities': {
                "NATIONAL_ID_TR", "IBAN_CODE", "PHONE_NUMBER", "EMAIL_ADDRESS",
                "PHONE", "EMAIL", "PERSON", "DATE", "ADDRESS", "IPV4", "IPV6",
                "MAC", "LICENSE_PLATE_TR", "MRN", "GEO_COORDS", "GEO_URI",
                "UUID", "DATETIME", "LOCATION", "ACCOUNT_NO", "SWIFT_BIC",
                "CUSTOMER_ID", "IBAN"
            },
            'last_updated': datetime.now()
        }
    
    def _should_refresh_cache(self) -> bool:
        """Cache'in yenilenmesi gerekip gerekmediğini kontrol et"""
        if not self._last_update:
            return True
        
        return (datetime.now() - self._last_update).total_seconds() > self._cache_ttl
    
    def get_policies(self) -> Dict[str, Any]:
        """Policy'leri getir (cache'den veya veritabanından)"""
        with self._lock:
            if self._should_refresh_cache():
                logger.info("Refreshing DLP policy cache...")
                self._cache = self._load_policies_from_db()
                self._last_update = datetime.now()
            
            return self._cache.copy()
    
    def invalidate_cache(self):
        """Cache'i manuel olarak invalidate et"""
        with self._lock:
            self._cache = {}
            self._last_update = None
            logger.info("DLP policy cache invalidated")
    
    def decide(self, recognitions: List[Dict[str, Any]]) -> Tuple[str, List[str]]:
        """
        DLP kararı ver - dinamik policy'lere göre
        """
        policies = self.get_policies()
        flags: List[str] = []
        
        # Entity threshold kontrolü
        entity_thresholds = policies.get('entity_thresholds', {})
        for r in recognitions:
            et = r.get("entity_type")
            sc = float(r.get("score", 0))
            thr = entity_thresholds.get(et, 0.0)
            if sc >= thr:
                flags.append(et)
        
        if not flags:
            return ("allow", [])
        
        # Çoklu hassas PII kontrolü
        if len(set(flags)) >= 3:
            return ("block", flags)
        
        # Admin policies kontrolü (öncelik sırasına göre)
        for policy in policies.get('admin_policies', []):
            for entity_type in policy['entity_types']:
                if entity_type in flags:
                    return (policy['action'], flags)
        
        # Rule sets kontrolü (öncelik sırasına göre)
        for rule_set in policies.get('rule_sets', []):
            for rule in rule_set['rules']:
                if self._rule_matches(rule, recognitions, flags):
                    return (rule['action'], flags)
        
        # Fallback: static entity sets
        block_entities = policies.get('block_entities', set())
        mask_entities = policies.get('mask_entities', set())
        
        if any(f in block_entities for f in flags):
            return ("block", flags)
        
        if any(f in mask_entities for f in flags):
            return ("mask", flags)
        
        return ("allow", flags)
    
    def _rule_matches(self, rule: Dict[str, Any], recognitions: List[Dict[str, Any]], flags: List[str]) -> bool:
        """Rule'un criteria'sının match edip etmediğini kontrol et"""
        criteria = rule.get('criteria', {})
        
        if isinstance(criteria, dict):
            return self._evaluate_criteria(criteria, recognitions, flags)
        
        return False
    
    def _evaluate_criteria(self, criteria: Dict[str, Any], recognitions: List[Dict[str, Any]], flags: List[str]) -> bool:
        """Criteria'yı evaluate et"""
        criteria_type = criteria.get('type')
        
        if criteria_type == 'entity_detected':
            entity_type = criteria.get('entity_type')
            return entity_type in flags
        
        elif criteria_type == 'prompt_contains':
            pattern = criteria.get('pattern', '').lower()
            # Bu durumda orijinal text'e ihtiyaç var, şimdilik flags'e bakıyoruz
            return any(pattern in flag.lower() for flag in flags)
        
        elif criteria_type == 'logical_group':
            operator = criteria.get('operator', 'AND')
            conditions = criteria.get('conditions', [])
            
            if operator == 'AND':
                return all(self._evaluate_criteria(cond, recognitions, flags) for cond in conditions)
            elif operator == 'OR':
                return any(self._evaluate_criteria(cond, recognitions, flags) for cond in conditions)
        
        return False


# Global instance
_policy_manager = DynamicDlpPolicy()

def get_policy_manager() -> DynamicDlpPolicy:
    """Global policy manager instance'ını getir"""
    return _policy_manager

def invalidate_policy_cache():
    """Policy cache'ini invalidate et - API endpoint'lerden çağrılacak"""
    _policy_manager.invalidate_cache()
    logger.info("DLP policy cache invalidated via API call")