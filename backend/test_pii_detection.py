#!/usr/bin/env python3
"""
PII Detection Test Script
CSV'deki PII örneklerini test etmek için kullanılır
"""

import csv
import sys
import os
import asyncio
from typing import List, Dict

# Backend modüllerini import etmek için path'i ayarla
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

from dlp.client import PresidioClient
from dlp.policy import DlpPolicy

def load_pii_examples(csv_path: str) -> List[Dict]:
    """CSV dosyasından PII örneklerini yükle"""
    examples = []
    try:
        with open(csv_path, 'r', encoding='utf-8') as file:
            reader = csv.DictReader(file)
            for row in reader:
                examples.append({
                    'id': row.get('id', ''),
                    'text': row.get('text', ''),
                    'pii_types_present': row.get('pii_types_present', ''),
                    'entities': row.get('entities', '')
                })
    except Exception as e:
        print(f"CSV dosyası okuma hatası: {e}")
        return []
    
    return examples

async def test_pii_detection(examples: List[Dict]):
    """PII tespit sistemini test et"""
    client = PresidioClient()
    policy = DlpPolicy()
    
    print("PII Tespit Sistemi Test Sonuçları")
    print("=" * 50)
    
    total_tests = len(examples)
    detected_count = 0
    
    for i, example in enumerate(examples, 1):
        example_id = example['id']
        text = example['text']
        expected_types = example['pii_types_present']
        
        print(f"\nTest {i}/{total_tests}: ID {example_id}")
        print(f"Metin: {text}")
        print(f"Beklenen PII türleri: {expected_types}")
        
        try:
            # PII analizi yap
            analysis_result = await client.analyze(text)
            
            if analysis_result:
                detected_count += 1
                print(f"✅ TESPİT EDİLDİ!")
                
                for entity in analysis_result:
                    entity_type = entity.get('entity_type', 'UNKNOWN')
                    score = entity.get('score', 0)
                    start = entity.get('start', 0)
                    end = entity.get('end', 0)
                    detected_text = text[start:end]
                    
                    # Policy kararını al
                    decision, _ = policy.decide([entity])
                    
                    print(f"  - Tür: {entity_type}")
                    print(f"  - Güven: {score:.2f}")
                    print(f"  - Tespit edilen: '{detected_text}'")
                    print(f"  - Karar: {decision}")
                    
                    # Maskeleme testi
                    if decision == "mask":
                        masked_text = await client.anonymize(text, analysis_result)
                        print(f"  - Maskelenmiş: {masked_text}")
                
            else:
                print("❌ TESPİT EDİLEMEDİ")
                
        except Exception as e:
            print(f"❌ HATA: {e}")
        
        print("-" * 40)
    
    # Özet
    detection_rate = (detected_count / total_tests) * 100 if total_tests > 0 else 0
    print(f"\nTEST ÖZETİ:")
    print(f"Toplam test: {total_tests}")
    print(f"Tespit edilen: {detected_count}")
    print(f"Tespit oranı: {detection_rate:.1f}%")

async def main():
    """Ana fonksiyon"""
    csv_path = "/Users/gunduz/Desktop/enterprise-agent/docs/docs/pii-examples.csv"
    
    if not os.path.exists(csv_path):
        print(f"CSV dosyası bulunamadı: {csv_path}")
        return
    
    print("PII örnekleri yükleniyor...")
    examples = load_pii_examples(csv_path)
    
    if not examples:
        print("PII örnekleri yüklenemedi!")
        return
    
    print(f"{len(examples)} PII örneği yüklendi.")
    
    # Test başlat
    await test_pii_detection(examples)

if __name__ == "__main__":
    asyncio.run(main())