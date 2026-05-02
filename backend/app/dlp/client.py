from typing import Any, Dict, List
import httpx
from app.core.settings import settings

# Entity-key mapping between our policy names and Presidio entity types
ENTITY_MAP = {
    "TCKN_TR": "NATIONAL_ID_TR",
    "IBAN_TR": "IBAN_CODE",
    "CREDIT_CARD": "CREDIT_CARD",
    "CVV": "CREDIT_CARD_CVV",
    "PHONE_TR": "PHONE_NUMBER",  # using generic phone in Presidio
    "EMAIL_ADDRESS": "EMAIL_ADDRESS",
    "IP_ADDRESS": "IP_ADDRESS",
}

class PresidioClient:
    def __init__(self, analyzer_url: str | None = None, anonymizer_url: str | None = None):
        self.analyzer_url = analyzer_url or settings.PRESIDIO_ANALYZER_URL
        self.anonymizer_url = anonymizer_url or settings.PRESIDIO_ANONYMIZER_URL

    async def analyze(self, text: str, entities: List[str] | None = None) -> List[Dict[str, Any]]:
        # Map incoming entities to Presidio ones; if none provided, request all supported entities
        requested = [ENTITY_MAP.get(e, e) for e in (entities or [])]
        payload = {"text": text, "entities": requested, "language": "en"}
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                r = await client.post(f"{self.analyzer_url}/analyze", json=payload)
                r.raise_for_status()
                return r.json()
        except Exception as e:
            # Mock DLP analysis for testing when Presidio is not available
            import re
            mock_results = []
            
            # Turkish National ID (TCKN) detection
            tckn_pattern = r'\b\d{11}\b'
            for match in re.finditer(tckn_pattern, text):
                mock_results.append({
                    "entity_type": "TR_TCKN",
                    "start": match.start(),
                    "end": match.end(),
                    "score": 0.9
                })
            
            # Phone number detection (Turkish format)
            phone_pattern = r'\+90\s?\d{3}\s?\d{3}\s?\d{2}\s?\d{2}|\b0\d{3}\s?\d{3}\s?\d{2}\s?\d{2}\b'
            for match in re.finditer(phone_pattern, text):
                mock_results.append({
                    "entity_type": "PHONE",
                    "start": match.start(),
                    "end": match.end(),
                    "score": 0.9
                })
            
            # Email detection
            email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
            for match in re.finditer(email_pattern, text):
                mock_results.append({
                    "entity_type": "EMAIL",
                    "start": match.start(),
                    "end": match.end(),
                    "score": 0.95
                })
            
            # Person name detection (Turkish names)
            name_pattern = r'\b[A-ZÇĞıİÖŞÜ][a-zçğıiöşü]+\s+[A-ZÇĞıİÖŞÜ][a-zçğıiöşü]+\b'
            for match in re.finditer(name_pattern, text):
                mock_results.append({
                    "entity_type": "PERSON",
                    "start": match.start(),
                    "end": match.end(),
                    "score": 0.8
                })
            
            # Date detection (various formats)
            date_pattern = r'\b\d{1,2}[./]\d{1,2}[./]\d{4}\b|\b\d{4}-\d{1,2}-\d{1,2}\b|\b\d{1,2}/\d{2}\b'
            for match in re.finditer(date_pattern, text):
                if len(match.group()) > 5:  # Avoid matching short patterns like "08/27"
                    mock_results.append({
                        "entity_type": "DATE",
                        "start": match.start(),
                        "end": match.end(),
                        "score": 0.85
                    })
                else:
                    mock_results.append({
                        "entity_type": "DATE",
                        "start": match.start(),
                        "end": match.end(),
                        "score": 0.75
                    })
            
            # Credit Card detection
            cc_pattern = r'\b\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\b'
            for match in re.finditer(cc_pattern, text):
                mock_results.append({
                    "entity_type": "CREDIT_CARD",
                    "start": match.start(),
                    "end": match.end(),
                    "score": 0.9
                })
            
            # CVC/CVV detection
            cvc_pattern = r'\b\d{3}\b'
            for match in re.finditer(cvc_pattern, text):
                # Check if it's likely a CVC (near credit card or expiry date)
                context = text[max(0, match.start()-50):match.end()+50].lower()
                if any(word in context for word in ['cvc', 'cvv', 'güvenlik', 'kod', 'kart']):
                    mock_results.append({
                        "entity_type": "SEC_CODE",
                        "start": match.start(),
                        "end": match.end(),
                        "score": 0.8
                    })
            
            # IBAN detection
            iban_pattern = r'\bTR\d{2}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{2}\b'
            for match in re.finditer(iban_pattern, text):
                mock_results.append({
                    "entity_type": "IBAN",
                    "start": match.start(),
                    "end": match.end(),
                    "score": 0.95
                })
            
            # Address detection (Turkish addresses)
            address_pattern = r'\b[A-ZÇĞıİÖŞÜ][a-zçğıiöşü]+\s+Mah\.|Mahallesi|Cad\.|Caddesi|Sk\.|Sokak.*?No:\d+.*?[A-ZÇĞıİÖŞÜ][a-zçğıiöşü]+/[A-ZÇĞıİÖŞÜ][a-zçğıiöşü]+'
            for match in re.finditer(address_pattern, text):
                mock_results.append({
                    "entity_type": "ADDRESS",
                    "start": match.start(),
                    "end": match.end(),
                    "score": 0.85
                })
            
            # IP Address detection (IPv4)
            ipv4_pattern = r'\b(?:\d{1,3}\.){3}\d{1,3}\b'
            for match in re.finditer(ipv4_pattern, text):
                mock_results.append({
                    "entity_type": "IPV4",
                    "start": match.start(),
                    "end": match.end(),
                    "score": 0.9
                })
            
            # IPv6 detection
            ipv6_pattern = r'\b(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\b'
            for match in re.finditer(ipv6_pattern, text):
                mock_results.append({
                    "entity_type": "IPV6",
                    "start": match.start(),
                    "end": match.end(),
                    "score": 0.9
                })
            
            # MAC Address detection
            mac_pattern = r'\b(?:[0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}\b'
            for match in re.finditer(mac_pattern, text):
                mock_results.append({
                    "entity_type": "MAC",
                    "start": match.start(),
                    "end": match.end(),
                    "score": 0.9
                })
            
            # Turkish License Plate detection
            plate_pattern = r'\b\d{2}\s?[A-Z]{1,3}\s?\d{1,4}\b'
            for match in re.finditer(plate_pattern, text):
                mock_results.append({
                    "entity_type": "LICENSE_PLATE_TR",
                    "start": match.start(),
                    "end": match.end(),
                    "score": 0.8
                })
            
            # Driver License detection
            license_pattern = r'\b[A-Z]\d{8}\b'
            for match in re.finditer(license_pattern, text):
                mock_results.append({
                    "entity_type": "DRIVER_LICENSE",
                    "start": match.start(),
                    "end": match.end(),
                    "score": 0.85
                })
            
            # Passport detection
            passport_pattern = r'\b[A-Z]\d{8}\b'
            for match in re.finditer(passport_pattern, text):
                # Check context to differentiate from driver license
                context = text[max(0, match.start()-20):match.end()+20].lower()
                if any(word in context for word in ['pasaport', 'passport']):
                    mock_results.append({
                        "entity_type": "PASSPORT",
                        "start": match.start(),
                        "end": match.end(),
                        "score": 0.85
                    })
            
            # VKN (Tax Number) detection
            vkn_pattern = r'\b\d{10}\b'
            for match in re.finditer(vkn_pattern, text):
                context = text[max(0, match.start()-20):match.end()+20].lower()
                if any(word in context for word in ['vkn', 'vergi', 'tax']):
                    mock_results.append({
                        "entity_type": "VKN",
                        "start": match.start(),
                        "end": match.end(),
                        "score": 0.85
                    })
            
            # SGK Number detection
            sgk_pattern = r'\b\d{2}-\d{8}-\d{1}\b'
            for match in re.finditer(sgk_pattern, text):
                mock_results.append({
                    "entity_type": "SGK",
                    "start": match.start(),
                    "end": match.end(),
                    "score": 0.9
                })
            
            # MRN detection
            mrn_pattern = r'\b\d{8}\b'
            for match in re.finditer(mrn_pattern, text):
                context = text[max(0, match.start()-10):match.end()+10].lower()
                if 'mrn' in context:
                    mock_results.append({
                        "entity_type": "MRN",
                        "start": match.start(),
                        "end": match.end(),
                        "score": 0.85
                    })
            
            # Geographic Coordinates detection
            geo_coords_pattern = r'\b\d{1,2}\.\d{4},\s?\d{1,2}\.\d{4}\b'
            for match in re.finditer(geo_coords_pattern, text):
                mock_results.append({
                    "entity_type": "GEO_COORDS",
                    "start": match.start(),
                    "end": match.end(),
                    "score": 0.9
                })
            
            # GEO URI detection
            geo_uri_pattern = r'\bgeo:\d{1,2}\.\d{4},\d{1,2}\.\d{4}\b'
            for match in re.finditer(geo_uri_pattern, text):
                mock_results.append({
                    "entity_type": "GEO_URI",
                    "start": match.start(),
                    "end": match.end(),
                    "score": 0.95
                })
            
            # IMEI detection
            imei_pattern = r'\b\d{15}\b'
            for match in re.finditer(imei_pattern, text):
                context = text[max(0, match.start()-10):match.end()+10].lower()
                if 'imei' in context:
                    mock_results.append({
                        "entity_type": "IMEI",
                        "start": match.start(),
                        "end": match.end(),
                        "score": 0.9
                    })
            
            # Android ID detection
            android_id_pattern = r'\b[a-f0-9]{16}\b'
            for match in re.finditer(android_id_pattern, text):
                context = text[max(0, match.start()-20):match.end()+20].lower()
                if any(word in context for word in ['android', 'id']):
                    mock_results.append({
                        "entity_type": "ANDROID_ID",
                        "start": match.start(),
                        "end": match.end(),
                        "score": 0.85
                    })
            
            # UUID detection
            uuid_pattern = r'\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b'
            for match in re.finditer(uuid_pattern, text):
                mock_results.append({
                    "entity_type": "UUID",
                    "start": match.start(),
                    "end": match.end(),
                    "score": 0.95
                })
            
            # DateTime detection
            datetime_pattern = r'\b\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}\b'
            for match in re.finditer(datetime_pattern, text):
                mock_results.append({
                    "entity_type": "DATETIME",
                    "start": match.start(),
                    "end": match.end(),
                    "score": 0.9
                })
            
            # Location detection (Turkish cities/districts)
            location_pattern = r'\b[A-ZÇĞıİÖŞÜ][a-zçğıiöşü]+/[A-ZÇĞıİÖŞÜ][a-zçğıiöşü]+\b'
            for match in re.finditer(location_pattern, text):
                mock_results.append({
                    "entity_type": "LOCATION",
                    "start": match.start(),
                    "end": match.end(),
                    "score": 0.8
                })
            
            # Account Number detection
            account_pattern = r'\b\d{8}\b'
            for match in re.finditer(account_pattern, text):
                context = text[max(0, match.start()-30):match.end()+30].lower()
                if any(word in context for word in ['hesap', 'account', 'banka']):
                    mock_results.append({
                        "entity_type": "ACCOUNT_NO",
                        "start": match.start(),
                        "end": match.end(),
                        "score": 0.8
                    })
            
            # SWIFT/BIC detection
            swift_pattern = r'\b[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?\b'
            for match in re.finditer(swift_pattern, text):
                context = text[max(0, match.start()-10):match.end()+10].lower()
                if any(word in context for word in ['swift', 'bic']):
                    mock_results.append({
                        "entity_type": "SWIFT_BIC",
                        "start": match.start(),
                        "end": match.end(),
                        "score": 0.9
                    })
            
            # Customer ID detection
            customer_pattern = r'\b\d{8}\b'
            for match in re.finditer(customer_pattern, text):
                context = text[max(0, match.start()-20):match.end()+20].lower()
                if any(word in context for word in ['müşteri', 'customer']):
                    mock_results.append({
                        "entity_type": "CUSTOMER_ID",
                        "start": match.start(),
                        "end": match.end(),
                        "score": 0.8
                    })
            
            return mock_results

    async def anonymize(self, text: str, recognitions: List[Dict[str, Any]], mode: str = "mask") -> str:
        """Anonymize text based on recognitions. Returns mock anonymization if service unavailable."""
        try:
            payload = {
                "text": text,
                "anonymizers": {r["entity_type"]: {"type": "mask", "masking_char": "*", "chars_to_mask": 4, "from_end": True} for r in recognitions},
                "analyzer_results": recognitions
            }
            async with httpx.AsyncClient(timeout=10) as client:
                r = await client.post(f"{self.anonymizer_url}/anonymize", json=payload)
                r.raise_for_status()
                result = r.json()
                return result.get("text", text)
        except Exception as e:
            # Mock anonymization when service is not available
            return self.mock_anonymize(text, recognitions)

    def mock_anonymize(self, text: str, entities: List[Dict]) -> str:
        """Mock anonymization for testing when Presidio is not available"""
        result = text
        # Sort entities by start position in reverse order to avoid index shifting
        sorted_entities = sorted(entities, key=lambda x: x['start'], reverse=True)
        
        for entity in sorted_entities:
            start = entity['start']
            end = entity['end']
            entity_type = entity['entity_type']
            original_text = text[start:end]
            
            # Different masking strategies based on entity type
            if entity_type == "PHONE":
                # Mask middle digits: 0532 123 45 67 -> 0532 *** ** 67
                masked = original_text[:4] + " *** ** " + original_text[-2:]
            elif entity_type == "EMAIL":
                # Mask username part: john.doe@example.com -> j***e@example.com
                if '@' in original_text:
                    username, domain = original_text.split('@', 1)
                    if len(username) > 2:
                        masked = username[0] + '*' * (len(username) - 2) + username[-1] + '@' + domain
                    else:
                        masked = '*' * len(username) + '@' + domain
                else:
                    masked = '*' * len(original_text)
            elif entity_type == "PERSON":
                # Mask to initials: John Doe -> J. D.
                words = original_text.split()
                masked = '. '.join([word[0] for word in words if word]) + '.'
            elif entity_type == "TR_TCKN":
                # Mask middle digits: 12345678901 -> 123****8901
                masked = original_text[:3] + '*' * 4 + original_text[-4:]
            elif entity_type == "CREDIT_CARD":
                # Mask middle digits: 1234 5678 9012 3456 -> 1234 **** **** 3456
                masked = original_text[:4] + ' **** **** ' + original_text[-4:]
            elif entity_type == "IBAN":
                # Mask middle part: TR12 3456 7890 1234 5678 9012 34 -> TR12 **** **** **** **** **** 34
                masked = original_text[:6] + '*' * (len(original_text) - 8) + original_text[-2:]
            elif entity_type == "DATE":
                # Mask day/month: 15/08/1990 -> **/**/1990
                if '/' in original_text:
                    parts = original_text.split('/')
                    if len(parts) == 3:
                        masked = '**/**/' + parts[2]
                    else:
                        masked = '**/**'
                elif '-' in original_text:
                    parts = original_text.split('-')
                    if len(parts) == 3:
                        masked = parts[0] + '-**-**'
                    else:
                        masked = '**-**'
                else:
                    masked = '*' * len(original_text)
            elif entity_type == "ADDRESS":
                # Mask address details but keep general area
                masked = "*** Mahallesi *** Caddesi No:** ***/**"
            elif entity_type in ["IPV4", "IPV6"]:
                # Mask IP addresses: 192.168.1.1 -> ***.***.***.***
                if '.' in original_text:
                    parts = original_text.split('.')
                    masked = '.'.join(['***'] * len(parts))
                elif ':' in original_text:
                    parts = original_text.split(':')
                    masked = ':'.join(['****'] * len(parts))
                else:
                    masked = '*' * len(original_text)
            elif entity_type == "MAC":
                # Mask MAC address: 00:11:22:33:44:55 -> **:**:**:**:**:**
                if ':' in original_text:
                    masked = ':'.join(['**'] * 6)
                elif '-' in original_text:
                    masked = '-'.join(['**'] * 6)
                else:
                    masked = '*' * len(original_text)
            elif entity_type == "LICENSE_PLATE_TR":
                # Mask license plate: 34 ABC 1234 -> ** *** ****
                masked = '** *** ****'
            elif entity_type in ["DRIVER_LICENSE", "PASSPORT"]:
                # Mask ID numbers: A12345678 -> *********
                masked = '*' * len(original_text)
            elif entity_type == "VKN":
                # Mask tax number: 1234567890 -> ****567890
                masked = '****' + original_text[-6:]
            elif entity_type == "SGK":
                # Mask SGK number: 12-34567890-1 -> **-********-*
                masked = '**-********-*'
            elif entity_type == "MRN":
                # Mask MRN: 12345678 -> ****5678
                masked = '****' + original_text[-4:]
            elif entity_type in ["GEO_COORDS", "GEO_URI"]:
                # Mask coordinates: 41.0082,28.9784 -> **.****,**.****
                if ',' in original_text:
                    parts = original_text.split(',')
                    masked = '**.****,**.****'
                else:
                    masked = '*' * len(original_text)
            elif entity_type == "IMEI":
                # Mask IMEI: 123456789012345 -> ***********2345
                masked = '*' * 11 + original_text[-4:]
            elif entity_type == "ANDROID_ID":
                # Mask Android ID: 1234567890abcdef -> ************cdef
                masked = '*' * 12 + original_text[-4:]
            elif entity_type == "UUID":
                # Mask UUID: 123e4567-e89b-12d3-a456-426614174000 -> ********-****-****-****-************
                masked = '********-****-****-****-************'
            elif entity_type == "DATETIME":
                # Mask datetime: 2023-08-15 14:30 -> ****-**-** **:**
                masked = '****-**-** **:**'
            elif entity_type == "LOCATION":
                # Mask location: İstanbul/Kadıköy -> *******/******
                if '/' in original_text:
                    parts = original_text.split('/')
                    masked = '/'.join(['*' * len(part) for part in parts])
                else:
                    masked = '*' * len(original_text)
            elif entity_type == "ACCOUNT_NO":
                # Mask account number: 12345678 -> ****5678
                masked = '****' + original_text[-4:]
            elif entity_type == "SWIFT_BIC":
                # Mask SWIFT/BIC: TGBATRIS -> ****TRIS
                masked = '****' + original_text[-4:]
            elif entity_type == "CUSTOMER_ID":
                # Mask customer ID: 12345678 -> ****5678
                masked = '****' + original_text[-4:]
            elif entity_type == "SEC_CODE":
                # Mask security code: 123 -> ***
                masked = '*' * len(original_text)
            else:
                # Default masking for unknown types
                masked = '*' * len(original_text)
            
            result = result[:start] + masked + result[end:]
        
        return result