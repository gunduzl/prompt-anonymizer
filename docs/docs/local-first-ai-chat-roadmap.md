# Kurumsal, Denetlenebilir AI Chat Platformu — Uygulama Yol Haritası (İlk 4 Faz • **Local‑First + İsteğe Bağlı LDAP**)

Bu doküman **code agent** tarafından uygulanmak üzere yazılmıştır. Hedef: **kişisel bilgisayarda** LDAP olmadan da çalışabilen, **admin isterse** LDAP/AD bağlantısını **sonradan açıp** kullanıcı senkronizasyonu yapabilen; **DB‑tabanlı yerel kullanıcılar** ile **çoklu kullanıcı oturumu**, **mesaj geçmişi**, **admin denetim panelleri** ve **tek tıkla veri maskeleme** özelliklerini sağlayan bir platform.

**Stack (önerilen):**
Backend: **FastAPI (Python)** + Pydantic v2 + SQLAlchemy + Alembic + Redis (rate‑limit/oturum) + PostgreSQL
Frontend: **Next.js/React (TypeScript)** + Tailwind + shadcn/ui + React Query + Zod
Auth: **Local DB Users (zorunlu)** + **OIDC/LDAP (opsiyonel, admin açar)**
DLP/PII: **Microsoft Presidio** (Analyzer/Anonymizer) + Regex/Luhn + (opsiyonel) küçük NER
LLM Gateway: **LiteLLM Proxy** (OpenAI/Gemini tek API)
Policy: **Casbin** (RBAC/ABAC) (+ ileri seviye için OPA opsiyonel)
Observability: OpenTelemetry + Loki/Grafana (dev: basit log)
Secrets: .env (dev), Vault (prod’a geçişte)

---

## İçindekiler

1. [Tasarım İlkeleri](#tasarım-ilkeleri)
2. [Klasör Yapısı (İki Ana Klasör: frontend/ backend)](#klasör-yapısı-iki-ana-klasör-frontend-backend)
3. [Faz 0 — İskelet ve Yerel Kullanıcılarla Çalışan MVP](#faz-0--iskelet-ve-yerel-kullanıcılarla-çalışan-mvp)
4. [Faz 1 — DLP/PII Çekirdeği ve Zorunlu Ön‑İşleme](#faz-1--dlppii-çekirdeği-ve-zorunlu-ön-işleme)
5. [Faz 2 — Chat Orchestrator, Mesaj Geçmişi, Admin Dashboard](#faz-2--chat-orchestrator-mesaj-geçmişi-admin-dashboard)
6. [Faz 3 — LDAP/AD’i İsteğe Bağlı Açma + Kullanıcı Senkronizasyonu](#faz-3--ldapadi-isteğe-bağlı-açma--kullanıcı-senkronizasyonu)
7. [Veritabanı Şeması (MVP+LDAP)](#veritabanı-şeması-mvpldap)
8. [API Sözleşmeleri (Özet)](#api-sözleşmeleri-özet)
9. [Konfigürasyon, .env ve Özellik Bayrakları](#konfigürasyon-env-ve-özellik-bayrakları)
10. [UI Akışları ve Yetkiler](#ui-akışları-ve-yetkiler)
11. [Test, Seed ve Çalıştırma Adımları (Local Dev)](#test-seed-ve-çalıştırma-adımları-local-dev)
12. [Ne Kullanılmalı / Ne Kaçınılmalı](#ne-kullanılmalı--ne-kaçınılmalı)

---

## Tasarım İlkeleri

- **Local‑First:** LDAP/AD **kapalı** başlar; **DB‑User** ile giriş yapılır. Admin **toggle** ile LDAP’ı açıp kullanıcıları çeker.
- **Denetlenebilirlik:** Her istek **trace_id** ile izlenir; PII tespitleri **redacted** şekilde loglanır.
- **Zorunlu DLP Ön‑İşleme:** Chat girişi **modele gitmeden** DLP’den geçer; `mask|block|allow` kararı uygular.
- **Çoklu Kullanıcı + Geçmiş:** Her kullanıcı çoklu **chat_session** açabilir; mesajlar **kalıcı** saklanır.
- **RBAC:** Roller: `user`, `auditor`, `admin`. Admin her şeyi raporlar; auditor yalnız izler.
- **Gizlilik:** Ham PII **loglanmaz**; sadece tür/konum/aksiyon meta’sı yazılır.
- **Basit Başla:** İlk gün yalnız **OpenAI (LiteLLM üzerinden)**; sonra Gemini/diğerleri eklenir.

---

## Klasör Yapısı (İki Ana Klasör: `frontend/` `backend/`)

```
repo-root/
├─ backend/
│  ├─ app/
│  │  ├─ core/                # settings, logging, otel, security utils
│  │  ├─ auth/                # local-db auth, (opsiyonel) oidc/ldap adapter
│  │  ├─ rbac/                # casbin adapter + policy yükleme
│  │  ├─ dlp/                 # presidio client, policy engine, validators
│  │  ├─ chat/                # orchestrator (dlp → audit → llm)
│  │  ├─ llm/                 # gateway client (LiteLLM)
│  │  ├─ admin/               # user mgmt, audits, policies, quotas
│  │  ├─ api/                 # fastapi routers (/auth, /chat, /admin, /pii)
│  │  ├─ db/                  # sqlmodels, repositories, unit of work
│  │  └─ schemas/             # pydantic dto
│  ├─ migrations/             # alembic
│  ├─ tests/                  # pytest
│  ├─ Dockerfile
│  └─ pyproject.toml
└─ frontend/
   ├─ apps/
   │  ├─ web/                 # kullanıcı chat arayüzü (Next.js)
   │  └─ admin/               # admin dashboard (Next.js)
   ├─ packages/
   │  ├─ ui/                  # shared ui (tailwind, shadcn)
   │  └─ lib/                 # fetch client, auth hooks, zod schemas
   ├─ package.json
   ├─ turbo.json (opsiyonel)
   └─ Dockerfile
```

**Notlar**

- **İki kök klasör** (frontend/backend) şartı sağlandı.
- LDAP entegrasyonu `backend/app/auth/ldap_adapter.py` içinde **özellik bayrağı** ile kontrol edilir.
- **Casbin** dosyaları `backend/app/rbac/` altında; prod’da DB adapter’e taşınabilir.
- **Presidio** bağımsız container; backend onu HTTP ile çağırır.
- **LiteLLM** bağımsız container; backend onu HTTP ile çağırır.

---

## Faz 0 — İskelet ve Yerel Kullanıcılarla Çalışan MVP

**Hedef:** LDAP olmadan **kişisel PC’de** çalışır; **DB‑user** ile auth; temel chat uçları (dummy), audit iskeleti.

### Yapılacaklar

1. **DB & Alembic:** `users`, `roles`, `user_roles`, `chat_sessions`, `messages`, `audit_events` tablolarını oluştur.
2. **Local Auth (zorunlu):** `/auth/register` (email+password), `/auth/login` (JWT); password **bcrypt**.
3. **RBAC (Casbin):** `model.conf`, `policy.csv` (admin, auditor, user).
4. **API iskeleti:** `/chat/preview` (echo), `/chat/send` (şimdilik DLP’siz), `/admin/users` (list, create DB‑user).
5. **Frontend (web):** basit chat UI + register/login + session listesi.
6. **Frontend (admin):** kullanıcı listesi, roller atama (UI iskeleti).
7. **Logging:** yapılandırılmış JSON log; trace_id üret; request id middleware.

### Kabul Kriterleri

- DB‑user ile giriş/çıkış yapılır.
- Chat ekranında mesaj atılır, `messages` tablosuna kaydolur.
- Admin panelinden DB‑user oluşturulabilir, role atanabilir.

---

## Faz 1 — DLP/PII Çekirdeği ve Zorunlu Ön‑İşleme

**Hedef:** **Presidio** entegre; **tek tıkla maskeleme** + **otomatik maskele/blok**; audit redacted kayıtları.

### Yapılacaklar

1. **Presidio entegrasyonu:** `dlp/client.py` (Analyzer + Anonymizer).
2. **Policy Engine:** `dlp/policy.py` → entity bazlı `mask|block|allow` + eşik (score).
3. **Giriş Akışı Middleware:** `/chat/send` çağrısı **önce DLP** → karar:

   - `block` → 400 + kullanıcı uyarısı (UI banner).
   - `mask` → metni maskele, **modele maskeli gönder**.
   - `allow` → direkt devam.

4. **Tek Tıkla Maskeleme:** `/pii/preview` → `masked_text` ve entities; web’de “Maskele & Gönder” butonu.
5. **Audit:** `audit_events` → action, entity_türü, start/end, masked_diff_hash; ham PII **yok**.
6. **Negative/Positive Test Set:** `tests/pii/` altında regex/Luhn/TC/IBAN için örnekler.

### Kabul Kriterleri

- PII içeren metin **modele gitmeden** maskeleme/bloklama uygular.
- “Maskele & Gönder” butonu çalışır; önizleme döner.
- Audit logları **redacted** ve sorgulanabilir.

---

## Faz 2 — Chat Orchestrator, Mesaj Geçmişi, Admin Dashboard

**Hedef:** LLM çağrıları LiteLLM üzerinden; session/mesaj geçmişi kaydı; admin izleme/rapor.

### Yapılacaklar

1. **LiteLLM Client:** `llm/client.py` → `/v1/chat/completions` proxy; timeout/retry.
2. **Chat Orchestrator:** `chat/service.py` akışı → Auth → RBAC → **DLP** → Audit → LLM → Save Message.
3. **Mesaj Geçmişi:** `/chat/sessions` (create/list), `/chat/history?session_id=` (paged).
4. **Admin Dashboard:**

   - **Kullanıcı izle**: aktif oturumlar, istek sayısı, son PII tetikleri.
   - **Audit ekranı**: tarih/actor/policy/entitiy filtreleri, export (CSV).
   - **Politika yönetimi**: DLP policy JSON düzenleme + simülasyon.
   - **Kota/Limit**: user/role bazlı günlük istek limiti (Redis counter).

5. **Frontend (web):**

   - Sol çizgide **session listesi**, orta chat, üstte “Maskele & Gönder” toggle/buton.
   - Mesaj başına “PII sembolleri” (örn. CC, TC) küçük rozet.

6. **Frontend (admin):**

   - Users tab (db‑users + ldap‑users \[placeholder])
   - Sessions tab, Audits tab (filtreler), Policies tab (JSON editor + test).

### Kabul Kriterleri

- Mesajlar session bazında kalıcı saklanır, UI’da listelenir.
- Admin paneli PII olaylarını ve kullanıcı trafiğini gösterebilir.
- LiteLLM üzerinden en az bir model (örn. gpt‑4o‑mini) çağrılır.

---

## Faz 3 — LDAP/AD’i İsteğe Bağlı Açma + Kullanıcı Senkronizasyonu

**Hedef:** Admin LDAP’ı **özellik bayrağıyla açar**, bağlantı bilgilerini girer, kullanıcıları **çekip DB’ye yazar**.

### Yapılacaklar

1. **Feature Flag:** `AUTH_LDAP_ENABLED=false` (varsayılan). Admin bu flag’i **UI’den** açar (backend config kaydı).
2. **LDAP Adapter:** `auth/ldap_adapter.py`

   - Bağlantı ayarları: host/port, bind DN, base DN, filter (örn. `(&(objectClass=user)(memberOf=...))`).
   - **Read‑only çekim**: `ldap_users_temp` tablosuna dump → `users` ile **upsert** (mapping: email, display_name, username, external_id).
   - `auth_type` alanı: `db` / `ldap`.

3. **Login Stratejisi:**

   - `db` kullanıcıları: email+password (bcrypt)
   - `ldap` kullanıcıları: admin **OIDC/Reverse‑Proxy ile SSO** veya **simple bind** (dev’de simple bind kabul, prod’da SSO öner).

4. **Çakışma Yönetimi:** Aynı email varsa öncelik politikası: `ldap` > `db` (configurable).
5. **Admin UI:** LDAP ayar formu, “Test connection”, “Sync now”, “Auto‑sync (cron)” seçenekleri.

### Kabul Kriterleri

- LDAP kapalıyken **DB‑user** ile sistem tam çalışır.
- LDAP açılınca “Sync now” ile kullanıcılar çekilir; `users`’a upsert edilir.
- LDAP kullanıcıları ile login (SSO/simple bind) yapılabilir.

---

## Veritabanı Şeması (MVP+LDAP)

```
users (
  id                uuid pk,
  email             text unique not null,
  username          text unique not null,
  password_hash     text null,           -- db users için dolu, ldap users için NULL
  display_name      text,
  auth_type         text not null default 'db',  -- 'db' | 'ldap'
  external_id       text,                -- ldap/oidc sub
  is_active         bool default true,
  created_at        timestamptz,
  updated_at        timestamptz
)

roles (id pk, name unique)               -- admin, auditor, user
user_roles (user_id fk, role_id fk, pk(user_id,role_id))

chat_sessions (
  id                uuid pk,
  user_id           uuid fk(users),
  title             text,
  created_at        timestamptz
)

messages (
  id                uuid pk,
  session_id        uuid fk(chat_sessions),
  user_id           uuid fk(users),
  role              text check in ('user','assistant','system'),
  content           text,                -- maskelenmiş gönderilen prompt da burada saklanır
  raw_content_hash  text,                -- ham içerik hash (ham içerik saklanmaz!)
  pii_flags         jsonb,               -- ["CREDIT_CARD","NATIONAL_ID_TR",...]
  created_at        timestamptz
)

audit_events (
  id                uuid pk,
  actor_user_id     uuid fk(users) null,
  event_type        text,                -- "PII_MASK","PII_BLOCK","LOGIN","POLICY_UPDATE"...
  ref_id            uuid null,           -- message/session/policy id vs.
  metadata          jsonb,               -- redacted detaylar
  created_at        timestamptz
)

config (
  key               text pk,
  value             jsonb
)

ldap_users_temp (    -- sync sırasında geçici tablo
  external_id       text,
  email             text,
  username          text,
  display_name      text
)
```

> **Not:** Ham kullanıcı girdisini **asla** saklamıyoruz; sadece **maskelenmiş** sürümü + ham içerik **hash’i** (şikayet/denetim için kanıt) kayıt altına alınır.

---

## API Sözleşmeleri (Özet)

### Auth (DB Users)

- `POST /auth/register` → `{email, username, password}`
- `POST /auth/login` → `{email|username, password}` → `{access_token, refresh_token, user}`

### PII/DLP

- `POST /pii/preview` → `{text}` → `{masked_text, entities:[{type,start,end,score}], action}`
- `POST /pii/decision` → `{text}` → `{action:'mask|block|allow', masked_text, entities}`

### Chat

- `POST /chat/sessions` → `{title?}` → `{session_id}`
- `GET  /chat/sessions` → list
- `GET  /chat/history?session_id=&page=&size=` → `{items:[message], page, total}`
- `POST /chat/send` → `{session_id, model_id, text, stream?}`

  - **Akış:** DLP → Audit → LLM → kayıt → yanıtı stream (SSE/websocket) döndür.

### Admin

- `GET  /admin/users?source=(db|ldap|all)`
- `POST /admin/users` (yalnız DB‑user create)
- `PUT  /admin/users/:id/roles`
- `GET  /admin/audits?filters...`
- `GET  /admin/policies` / `PUT /admin/policies`
- `GET  /admin/config` / `PUT /admin/config` (örn. `AUTH_LDAP_ENABLED`)
- `POST /admin/ldap/test` / `POST /admin/ldap/sync`

---

## Konfigürasyon, .env ve Özellik Bayrakları

`backend/.env.example`

```
APP_ENV=dev
DATABASE_URL=postgresql+psycopg://ai_user:ai_pass@localhost:5432/ai_db
REDIS_URL=redis://localhost:6379/0
JWT_SECRET=change_me
TOKEN_EXPIRE_MIN=60
CASBIN_MODEL_PATH=app/rbac/model.conf
CASBIN_POLICY_PATH=app/rbac/policy.csv

# DLP
PRESIDIO_ANALYZER_URL=http://localhost:3000
PRESIDIO_ANONYMIZER_URL=http://localhost:3001
DLP_DEFAULT_POLICY_PATH=app/dlp/policies/default.json

# LLM Gateway
LLM_GATEWAY_URL=http://localhost:8003
OPENAI_API_KEY=<for-dev-only>

# LDAP (isteğe bağlı)
AUTH_LDAP_ENABLED=false
LDAP_HOST=ldap://dc01.local
LDAP_BIND_DN=cn=svc-ai,ou=svc,dc=corp,dc=local
LDAP_BIND_PASS=change_me
LDAP_BASE_DN=ou=Users,dc=corp,dc=local
LDAP_FILTER=(objectClass=user)
LDAP_EMAIL_ATTR=mail
LDAP_USERNAME_ATTR=sAMAccountName
LDAP_DISPLAYNAME_ATTR=displayName
```

`frontend/apps/web/.env.local`

```
NEXT_PUBLIC_API_BASE=http://localhost:8080
```

`frontend/apps/admin/.env.local`

```
NEXT_PUBLIC_API_BASE=http://localhost:8080
```

**Özellik Bayrakları:**

- `AUTH_LDAP_ENABLED` (false → dev’de DB‑user; true → LDAP test/sync/login aktifleştir)
- `DLP_ENFORCE=true` (chat/send öncesi DLP zorunlu)
- `STREAMING_ENABLED=true` (SSE/websocket)
- `LOG_REDACTION=true`

---

## UI Akışları ve Yetkiler

### Kullanıcı (DB veya LDAP)

1. **Login** (DB: form / LDAP: SSO veya bind)
2. **Session oluştur** → **Mesaj yaz**
3. **Maskele & Gönder** (isteğe bağlı) veya **otomatik DLP**
4. Yanıt **stream** edilir; mesaj geçmişine kaydedilir.

### Admin

- **Kullanıcılar:** DB‑user create, role ata; LDAP sync (aktifse)
- **Audit:** tarih/actor/policy/entity filtrele, CSV export
- **Policy:** DLP kuralları (mask/block/allow), simülasyon
- **Konfig:** `AUTH_LDAP_ENABLED` toggle, LDAP bağlantı test
- **Kota/Limit:** kullanıcı/rol bazlı rate‑limit

### Auditor

- Audit görüntüleme (salt okunur), policy görüntüleme.

---

## Test, Seed ve Çalıştırma Adımları (Local Dev)

1. **DB & Migrations:**

   ```
   cd backend
   poetry install / pip install -r requirements.txt
   alembic upgrade head
   python -m app.scripts.seed_roles_users  # admin/user demo
   ```

2. **Presidio (Docker):** analyzer/anonymizer container’larını `docker-compose.dlp.yml` ile başlat.
3. **LiteLLM (Docker):** `docker run -e OPENAI_API_KEY=... -p 8003:8000 ghcr.io/berriai/litellm` (örn.).
4. **Backend:** `uvicorn app.main:app --reload --port 8080`
5. **Frontend:**

   ```
   cd frontend/apps/web && pnpm i && pnpm dev
   cd ../admin && pnpm i && pnpm dev
   ```

6. **Testler:** `pytest -q` (backend) • `pnpm test` (frontend)
7. **E2E (opsiyonel):** Playwright ile login→chat→pii‑preview→send senaryosu.

---

## Ne Kullanılmalı / Ne Kaçınılmalı

**Kullanılmalı**

- DB‑User **her zaman** açık; LDAP **isteğe bağlı**.
- DLP **zorunlu** (chat öncesi); loglarda **redaction**.
- Casbin ile route‑level RBAC; audit her kritik olayda.
- Mesajlarda **maskelenmiş içerik** + ham hash; ham içerik yok.
- Timeout/retry/circuit‑breaker (LLM çağrıları); rate‑limit (Redis).

**Kaçınılmalı**

- Client‑side secret (anahtarlar frontend’e **asla** sızmaz).
- Ham PII’yi log/db’de saklama.
- DLP’yi opsiyonel yapmak (chat için **her zaman** zorunlu).
- LDAP’ı dev’de “zorunlu” yapmak (kişisel PC’de esneklik kaybı).

---

### Kod Parçaları (Özet)

**DLP guard (backend middleware)**

```python
# backend/app/api/middleware.py
from fastapi import Request, HTTPException
import httpx, json
from app.core.settings import settings

async def dlp_guard(request: Request, call_next):
    if request.url.path.startswith("/chat/send") and request.method == "POST":
        body = await request.json()
        text = body.get("text", "") or ""
        async with httpx.AsyncClient(timeout=5) as client:
            r = await client.post(f"{settings.DLP_BASE}/decision", json={"text": text})
        r.raise_for_status()
        decision = r.json()  # {action, masked_text, entities}

        if decision["action"] == "block":
            # audit: PII_BLOCK
            raise HTTPException(400, "Hassas veri tespit edildi ve politika gereği engellendi.")

        if decision["action"] == "mask":
            body["text"] = decision["masked_text"]
            request._body = json.dumps(body).encode()

        # audit: PII_MASK / PII_ALLOW
        # emit_audit(event_type=..., metadata=... )

    return await call_next(request)
```

**LDAP toggle (config tablosu)**

```python
# backend/app/admin/service_config.py
from app.db import repo

def is_ldap_enabled() -> bool:
    row = repo.config_get("AUTH_LDAP_ENABLED")
    return bool(row and row["value"].get("enabled", False))
```

**Mesaj Kaydı (maskeli)**

```python
# backend/app/chat/service.py
def save_message(session_id, user_id, role, text, pii_flags):
    masked = text  # zaten middleware'de maskelendi
    raw_hash = sha256_of_original_input_somewhere()  # ham metni hafızada tutma!
    repo.messages.insert(
        session_id=session_id, user_id=user_id, role=role,
        content=masked, raw_content_hash=raw_hash, pii_flags=pii_flags
    )
```

---

Bu planla projeyi **kişisel bilgisayarda** LDAP’a bağımlı olmadan başlatır, **DB‑user** ile geliştirir; ihtiyaca göre **admin togglesıyla** LDAP/AD’i devreye alır, kullanıcıları çekip **çok kullanıcılı**, **denetlenebilir** ve **gizlilik odaklı** bir chat platformunu adım adım tamamlarsın.
