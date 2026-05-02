from typing import Any, Dict, List, Tuple

# DLP politika motoru: entity eşikleri, denylists ve aksiyon matrisi
# Input: recognitions: [{"entity_type":"CREDIT_CARD","score":0.85,"start":..,"end":..}, ...]

# Entities that should be blocked (high-risk PII)
BLOCK_ENTITIES = {
    "API_KEY", "CREDIT_CARD_CVV", "CREDIT_CARD", "CRYPTO", "PASSWORD", 
    "SECRET_KEY", "TR_TCKN", "PASSPORT", "DRIVER_LICENSE", "VKN", 
    "SGK", "IMEI", "ANDROID_ID", "SEC_CODE"
}

# Entities that should be masked (medium-risk PII)
MASK_ENTITIES = {
    "NATIONAL_ID_TR", "IBAN_CODE", "PHONE_NUMBER", "EMAIL_ADDRESS",
    "PHONE", "EMAIL", "PERSON", "DATE", "ADDRESS", "IPV4", "IPV6",
    "MAC", "LICENSE_PLATE_TR", "MRN", "GEO_COORDS", "GEO_URI",
    "UUID", "DATETIME", "LOCATION", "ACCOUNT_NO", "SWIFT_BIC",
    "CUSTOMER_ID", "IBAN"
}

class DlpPolicy:
    def __init__(self, entity_thresholds: Dict[str, float] | None = None, default_action: str = "allow"):
        self.entity_thresholds = entity_thresholds or {
            "CREDIT_CARD": 0.7,
            "IBAN_CODE": 0.7,
            "PHONE_NUMBER": 0.7,
            "EMAIL_ADDRESS": 0.8,
            "PERSON": 0.5,
            "NATIONAL_ID_TR": 0.7,
            "IP_ADDRESS": 0.6,
            "CREDIT_CARD_CVV": 0.9,
        }
        self.default_action = default_action

    def decide(self, recognitions: List[Dict[str, Any]]) -> Tuple[str, List[str]]:
        flags: List[str] = []
        for r in recognitions:
            et = r.get("entity_type")
            sc = float(r.get("score", 0))
            thr = self.entity_thresholds.get(et, 0.0)
            if sc >= thr:
                flags.append(et)
        if not flags:
            return ("allow", [])

        # Çoklu hassas PII aynı metinde: block (örn. kart PAN + CVV + TCKN)
        if len(set(flags)) >= 3:
            return ("block", flags)

        # Block kategorisine giren biri varsa: block
        if any(f in BLOCK_ENTITIES for f in flags):
            return ("block", flags)

        # Mask kategorisine giren biri varsa: mask
        if any(f in MASK_ENTITIES for f in flags):
            return ("mask", flags)

        # Default: allow
        return (self.default_action, flags)