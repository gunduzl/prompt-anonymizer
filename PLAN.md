# Kurumsal AI Chat Platformu - Uygulama Planı

**Referans Doküman:** `docs/docs/local-first-ai-chat-roadmap.md`

## Hedef

Kişisel bilgisayarda LDAP olmadan çalışabilen, sonradan LDAP/AD bağlantısı açılabilen, DB-tabanlı yerel kullanıcılar ile çoklu oturum, mesaj geçmişi, admin denetim panelleri ve tek tıkla veri maskeleme özelliklerini sağlayan platform.

## Teknik Stack

- **Backend:** FastAPI + PostgreSQL + Redis + Alembic + Casbin + Presidio + LiteLLM
- **Frontend:** Next.js/React + TypeScript + Tailwind + shadcn/ui + React Query
- **Auth:** Local DB Users (zorunlu) + LDAP/AD (opsiyonel, feature flag)
- **DLP:** Microsoft Presidio (zorunlu ön-işleme)
- **LLM:** LiteLLM Proxy (OpenAI/Gemini)

## Faz 0: İskelet ve Yerel Kullanıcılarla MVP

- [ ] Monorepo yapısı: `frontend/` ve `backend/` kök klasörleri
- [ ] PostgreSQL + Redis + Alembic DB şeması
- [ ] Local Auth: register/login (email+password, JWT, bcrypt)
- [ ] RBAC: Casbin entegrasyonu (admin, auditor, user)
- [ ] API iskeleti: temel auth/chat/admin endpointleri
- [ ] Frontend (web): basit chat UI + auth
- [ ] Frontend (admin): kullanıcı yönetimi iskeleti
- [ ] Structured logging + trace_id middleware
- [ ] Docker compose dev ortamı
- [ ] Çalıştırma komutları ve smoke testleri

## Faz 1: DLP/PII Çekirdeği ve Zorunlu Ön-İşleme

- [ ] Presidio entegrasyonu (Analyzer + Anonymizer)
- [ ] DLP Policy Engine: entity bazlı mask|block|allow + eşik
- [ ] Chat middleware: zorunlu DLP ön-işleme
- [ ] /pii/preview ve /pii/decision endpointleri
- [ ] "Tek tıkla maskeleme" özelliği
- [ ] Audit redaction: ham PII saklanmaz, yalnız meta veri
- [ ] Negative/Positive test setleri (regex/Luhn/TC/IBAN)

## Faz 2: Chat Orchestrator, Mesaj Geçmişi, Admin Dashboard

- [ ] LiteLLM client entegrasyonu
- [ ] Chat Orchestrator: Auth → RBAC → DLP → Audit → LLM → Save
- [ ] Mesaj geçmişi: session/message CRUD, paging
- [ ] Rate limiting + quota (Redis counter)
- [ ] Admin Dashboard:
  - [ ] Kullanıcı izleme (aktif oturum, istek sayısı, PII tetikleri)
  - [ ] Audit ekranı (filtreleme, export CSV)
  - [ ] DLP politika yönetimi (JSON editor + simülasyon)
  - [ ] Kota/limit yönetimi
- [ ] Frontend iyileştirmeleri:
  - [ ] Session listesi, chat arayüzü
  - [ ] "Maskele & Gönder" toggle/buton
  - [ ] PII sembolleri (CC, TC rozetleri)

## Faz 3: LDAP/AD İsteğe Bağlı Entegrasyon

- [ ] Feature flag: `AUTH_LDAP_ENABLED=false` (varsayılan)
- [ ] LDAP Adapter: bağlantı, kullanıcı çekme, upsert stratejisi
- [ ] Login stratejisi: DB vs LDAP kullanıcıları
- [ ] Çakışma yönetimi: aynı email'de öncelik politikası
- [ ] Admin UI: LDAP ayarları, test connection, sync now
- [ ] Auto-sync (cron) seçeneği

## Commit Stratejisi

Her iş adımı ayrı, anlamlı commit mesajları:

- `feat(auth): add db-user login`
- `feat(dlp): implement presidio integration`
- `feat(chat): add message history with sessions`
- `feat(admin): add user management dashboard`
- `feat(ldap): add optional ldap sync with feature flag`

## Teslim Çıktıları

- Çalışan `backend/` ve `frontend/` projeleri
- `README.md` (nasıl çalıştırılır + kabul kriterleri)
- `docker-compose.dev.yml` (Presidio, LiteLLM, Postgres, Redis)
- Seed scriptleri ve örnek .env dosyaları
- Her faz için test senaryoları

## Temel İlkeler

1. **Local-First:** LDAP kapalı başlar, DB-user ile auth
2. **Zorunlu DLP:** Chat istekleri modele gitmeden DLP'den geçer
3. **Audit redaction:** Ham PII asla loglanmaz/saklanmaz
4. **Çoklu kullanıcı:** Session bazlı mesaj geçmişi
5. **RBAC:** Casbin ile route-level yetkilendirme
