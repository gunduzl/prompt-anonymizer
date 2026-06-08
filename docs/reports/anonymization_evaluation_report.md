# Yapay Veri Seti ile DLP Anonimleştirme Performans Raporu

## 1. Amaç ve Kapsam

Bu rapor, projedeki PII/DLP anonimleştirme akışını incelemek, yapay bir veri seti üretmek ve bu veri seti üzerinde anonimleştirme/detection performansını ölçmek için hazırlanmıştır.

Değerlendirilen metrikler:

- Precision
- Recall
- F1
- Accuracy
- Anonimleştirme başarı oranı

Rapor kapsamında üretilen dosyalar:

- Veri üretim scripti: `backend/app/scripts/generate_synthetic_pii_dataset.py`
- Değerlendirme scripti: `backend/app/scripts/evaluate_anonymization.py`
- Yapay veri seti: `docs/reports/synthetic_pii_dataset.json`
- Ham değerlendirme sonucu: `docs/reports/synthetic_pii_evaluation_results.json`
- Rapor dosyası: `docs/reports/anonymization_evaluation_report.md`

## 2. Projede Anonimleştirme Akışı

Projede PII anonimleştirme akışı backend tarafında aşağıdaki modüller üzerinden ilerler:

- `backend/app/api/pii.py`
- `backend/app/dlp/client.py`
- `backend/app/dlp/policy.py`
- `backend/app/dlp/placeholder.py`

### 2.1. PII Preview Endpoint'i

Ana endpoint:

```text
POST /pii/preview
```

Bu endpoint `PreviewRequest` ile metni alır:

```json
{
  "text": "Metin",
  "entities": ["EMAIL", "PHONE"]
}
```

Endpoint şu adımları uygular:

1. `PresidioClient.analyze()` ile metin analiz edilir.
2. Tespit edilen entity listesi `DlpPolicy.decide()` metoduna gönderilir.
3. Politika sonucu `allow`, `mask` veya `block` olabilir.
4. Eğer PII tespit edilmişse `PresidioClient.anonymize()` ile maskelenmiş metin üretilir.
5. `PlaceholderManager.anonymize_with_placeholders()` ile placeholder tabanlı anonim metin üretilir.
6. Orijinal değer ile placeholder arasındaki mapping tutulur.
7. Frontend tarafında karşılaştırmalı görünüm ve restore işlemi için mapping bilgisi döndürülür.

### 2.2. Detection Katmanı

`backend/app/dlp/client.py` içinde `PresidioClient` iki modda çalışabilir:

- Presidio Analyzer/Anonymizer servisleri erişilebilir ise HTTP üzerinden gerçek Presidio servisine istek atar.
- Servis erişilemezse regex tabanlı mock analiz ve mock anonimleştirme çalışır.

Bu değerlendirme koşumunda sistem, dış servise bağımlı olmaması için mevcut fallback/mock detection hattıyla ölçülmüştür. Bu sayede sonuçlar lokal ortamda tekrar üretilebilir.

### 2.3. Politika Kararı

`backend/app/dlp/policy.py` içinde iki ana entity grubu vardır:

```text
BLOCK_ENTITIES
MASK_ENTITIES
```

Politika mantığı:

1. Her recognition için confidence threshold kontrol edilir.
2. Hiç eşleşme yoksa aksiyon `allow` olur.
3. Aynı metinde 3 veya daha fazla farklı hassas entity varsa aksiyon `block` olur.
4. Entity `BLOCK_ENTITIES` içindeyse aksiyon `block` olur.
5. Entity `MASK_ENTITIES` içindeyse aksiyon `mask` olur.
6. Aksi halde default aksiyon uygulanır.

### 2.4. Anonimleştirme Yöntemleri

Projede iki anonimleştirme çıktısı üretilir:

1. Maskeli metin

Örnek:

```text
ahmet.yilmaz@example.com -> a**********z@example.com
```

2. Placeholder tabanlı anonim metin

Örnek:

```text
ahmet.yilmaz@example.com -> [EMAIL_1]
```

Placeholder yaklaşımı, LLM'e kişisel veri göndermeden metnin anlamını korumak için daha uygundur. Mapping saklandığı için gerekiyorsa yanıt sonrası restore yapılabilir.

## 3. Yapay Veri Seti Üretimi

Yapay veri seti `backend/app/scripts/generate_synthetic_pii_dataset.py` scripti ile üretilmiştir.

Çalıştırılan komut:

```bash
cd backend
python3 -m app.scripts.generate_synthetic_pii_dataset
```

Komut çıktısı:

```text
Wrote 20 records to /Users/gunduz/Desktop/enterprise-agent/docs/reports/synthetic_pii_dataset.json
```

Veri seti özeti:

| Alan | Değer |
|---|---:|
| Toplam kayıt | 20 |
| PII içeren kayıt | 17 |
| Temiz kayıt | 3 |
| Beklenen entity sayısı | 29 |

Kapsanan entity tipleri:

```text
PERSON, EMAIL, PHONE, TR_TCKN, CREDIT_CARD, DATE, SEC_CODE, IBAN,
IPV4, IPV6, MAC, LICENSE_PLATE_TR, DRIVER_LICENSE, PASSPORT, VKN,
SGK, MRN, GEO_COORDS, GEO_URI, IMEI, ANDROID_ID, UUID, DATETIME,
LOCATION, ACCOUNT_NO, SWIFT_BIC, CUSTOMER_ID, ADDRESS
```

Örnek kayıt:

```json
{
  "id": "synthetic-004",
  "text": "Payment card 4580 8765 4321 9012 expires on 08/27 and CVC is 123.",
  "entities": [
    {
      "entity_type": "CREDIT_CARD",
      "start": 13,
      "end": 32,
      "text": "4580 8765 4321 9012"
    },
    {
      "entity_type": "DATE",
      "start": 44,
      "end": 49,
      "text": "08/27"
    },
    {
      "entity_type": "SEC_CODE",
      "start": 61,
      "end": 64,
      "text": "123"
    }
  ]
}
```

## 4. Performans Hesaplama Scripti

Değerlendirme `backend/app/scripts/evaluate_anonymization.py` scripti ile yapılmıştır.

Çalıştırılan komut:

```bash
cd backend
python3 -m app.scripts.evaluate_anonymization
```

Komut çıktısı:

```json
{
  "precision": 0.7297,
  "recall": 0.931,
  "f1": 0.8182,
  "record_accuracy": 1.0,
  "entity_accuracy_with_clean_tn": 0.7143,
  "anonymization_success_rate": 1.0
}
```

Ek çıktı:

```text
Wrote evaluation results to /Users/gunduz/Desktop/enterprise-agent/docs/reports/synthetic_pii_evaluation_results.json
```

## 5. Metrik Tanımları

Entity bazlı eşleşme kuralı:

```text
entity_type + start + end
```

Yani bir tahminin doğru sayılması için entity tipi ve span aralığı birebir eşleşmelidir.

Kullanılan formüller:

```text
Precision = TP / (TP + FP)
Recall    = TP / (TP + FN)
F1        = 2 * Precision * Recall / (Precision + Recall)
```

Accuracy için iki değer raporlanmıştır:

- `record_accuracy`: Kayıt seviyesinde PII var/yok kararının doğruluğu.
- `entity_accuracy_with_clean_tn`: Entity seviyesinde TP, FP, FN ve temiz kayıt TN bilgisiyle hesaplanan doğruluk.

Anonimleştirme başarı oranı:

```text
Anonimleştirme başarı oranı = Orijinal PII değerleri maskeli veya placeholder metinde sızmayan kayıt sayısı / Toplam kayıt
```

## 6. Performans Sonuçları

| Metrik | Değer |
|---|---:|
| Precision | 0.7297 |
| Recall | 0.9310 |
| F1 | 0.8182 |
| Accuracy, kayıt bazlı | 1.0000 |
| Accuracy, entity + temiz TN | 0.7143 |
| Anonimleştirme başarı oranı | 1.0000 |

Confusion özeti:

| Alan | Değer |
|---|---:|
| True Positive | 27 |
| False Positive | 10 |
| False Negative | 2 |
| Temiz true negative kayıt | 3 |

## 7. Kayıt Bazlı Sonuç Özeti

| Kayıt | Beklenen | Tahmin | TP | FP | FN | Aksiyon |
|---|---:|---:|---:|---:|---:|---|
| synthetic-001 | 2 | 2 | 1 | 1 | 1 | mask |
| synthetic-002 | 1 | 1 | 1 | 0 | 0 | mask |
| synthetic-003 | 1 | 1 | 1 | 0 | 0 | block |
| synthetic-004 | 3 | 3 | 3 | 0 | 0 | block |
| synthetic-005 | 1 | 2 | 1 | 1 | 0 | block |
| synthetic-006 | 2 | 2 | 2 | 0 | 0 | mask |
| synthetic-007 | 1 | 1 | 1 | 0 | 0 | mask |
| synthetic-008 | 2 | 2 | 2 | 0 | 0 | block |
| synthetic-009 | 1 | 2 | 1 | 1 | 0 | block |
| synthetic-010 | 2 | 2 | 2 | 0 | 0 | block |
| synthetic-011 | 1 | 1 | 1 | 0 | 0 | mask |
| synthetic-012 | 2 | 3 | 2 | 1 | 0 | mask |
| synthetic-013 | 2 | 2 | 2 | 0 | 0 | block |
| synthetic-014 | 1 | 1 | 1 | 0 | 0 | mask |
| synthetic-015 | 3 | 4 | 3 | 1 | 0 | block |
| synthetic-016 | 3 | 3 | 3 | 0 | 0 | block |
| synthetic-017 | 1 | 5 | 0 | 5 | 1 | block |
| synthetic-018 | 0 | 0 | 0 | 0 | 0 | allow |
| synthetic-019 | 0 | 0 | 0 | 0 | 0 | allow |
| synthetic-020 | 0 | 0 | 0 | 0 | 0 | allow |

## 8. Hata Analizi

False positive ve false negative gözlenen kayıtlar:

| Kayıt | Bulgular |
|---|---|
| synthetic-001 | `PERSON` regex'i cümle başındaki `Customer Ahmet` bölümünü kişi adı gibi algıladı; beklenen `Ahmet Yilmaz` span'i kaçtı. |
| synthetic-005 | IBAN içindeki 16 haneli sayı bloğu ayrıca `CREDIT_CARD` gibi algılandı. |
| synthetic-009 | Pasaport numarası aynı zamanda `DRIVER_LICENSE` regex'iyle de eşleşti. |
| synthetic-012 | `geo:` URI içindeki koordinat kısmı hem `GEO_URI` hem tekrar `GEO_COORDS` olarak algılandı. |
| synthetic-015 | `DATETIME` içindeki tarih bölümü ayrıca `DATE` olarak algılandı. |
| synthetic-017 | Adres metni parçalara bölünerek `ADDRESS`, `LOCATION` ve `PERSON` olarak fazla sayıda eşleşti; tam adres span'i birebir yakalanmadı. |

Bu bulgular sistemin PII var/yok kararında güçlü olduğunu, fakat span bazlı entity sınıflandırmasında regex çakışmalarının precision değerini düşürdüğünü gösterir.

## 9. Anonimleştirme Çıktıları

Değerlendirme sırasında her kayıt için iki anonimleştirme çıktısı üretildi:

- `masked_text`
- `placeholder_text`

Örnek:

```text
Orijinal:
Support callback number is +90 532 456 78 90 for the incident.

Masked:
Support callback number is +90  *** ** 90 for the incident.

Placeholder:
Support callback number is [PHONE_1] for the incident.
```

Anonimleştirme sızıntı kontrolü sonucu:

```text
anonymization_success_rate = 1.0000
```

Bu koşumda beklenen PII değerlerinin hiçbiri maskeli veya placeholder anonim metin içinde düz metin olarak kalmadı.

## 10. Sonuç ve Değerlendirme

Yapay veri seti üzerinde sistemin kayıt seviyesinde PII var/yok kararı başarılıdır:

```text
record_accuracy = 1.0000
```

Entity seviyesinde sonuçlar daha karmaşıktır:

```text
precision = 0.7297
recall = 0.9310
f1 = 0.8182
```

Recall değerinin yüksek olması sistemin çoğu PII'yi yakaladığını gösterir. Precision değerinin daha düşük olması, regex tabanlı fallback detector içinde bazı entity türlerinin birbirini tetiklemesinden kaynaklanır. Özellikle IBAN/kredi kartı, pasaport/ehliyet, datetime/date ve adres/person/location çakışmaları öne çıkmaktadır.

Anonimleştirme açısından sonuç güçlüdür:

```text
anonymization_success_rate = 1.0000
```

Bu, tespit edilen PII değerlerinin maskeli metin veya placeholder metin içinde açık halde kalmadığını gösterir.

## 11. İyileştirme Önerileri

1. Çakışan regex sonuçları için overlap resolution eklenmelidir. Daha uzun ve daha spesifik entity eşleşmesi kısa eşleşmeye tercih edilmelidir.
2. `PASSPORT` ve `DRIVER_LICENSE` gibi aynı pattern'i kullanan entity'lerde bağlam kelimeleri daha yüksek öncelikli olmalıdır.
3. `DATETIME` yakalandığında aynı span içindeki `DATE` tahmini bastırılmalıdır.
4. IBAN içindeki sayı bloklarının kredi kartı olarak tekrar sınıflandırılmasını engelleyen negatif bağlam kontrolü eklenmelidir.
5. Adres tespiti için tek regex yerine parça bazlı ve skor öncelikli bir resolver kullanılmalıdır.

## 12. Tekrar Çalıştırma Adımları

```bash
cd /Users/gunduz/Desktop/enterprise-agent/backend
python3 -m app.scripts.generate_synthetic_pii_dataset
python3 -m app.scripts.evaluate_anonymization
```

Çıktı dosyaları:

```text
/Users/gunduz/Desktop/enterprise-agent/docs/reports/synthetic_pii_dataset.json
/Users/gunduz/Desktop/enterprise-agent/docs/reports/synthetic_pii_evaluation_results.json
/Users/gunduz/Desktop/enterprise-agent/docs/reports/anonymization_evaluation_report.md
```
