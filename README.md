# Safe Chat — Local-First AI Chat

Referans: docs/docs/local-first-ai-chat-roadmap.md

## Nasıl Çalıştırılır (Faz 0)

Önkoşullar: Docker (opsiyonel), Node.js 18+, Python 3.11

### Backend

1. Sanal ortam ve bağımlılıklar:

```
python3 -m venv .venv
source .venv/bin/activate
cd backend
poetry install --no-root
```

2. Veritabanı migrasyonları:

```
cd backend
alembic upgrade head
python -m app.scripts.seed_roles_users
```

3. Çalıştırma:

```
uvicorn app.main:app --reload --port 8080
```

### Frontend (Web)

```
cd frontend/apps/web
npm i
npm run dev
```

### Frontend (Admin)

```
cd frontend/apps/admin
npm i
npm run dev
```

## Smoke Test (Faz 0)

- POST /auth/register ile kullanıcı oluşturun veya seed kullanıcıyı kullanın: admin@example.com / admin123
- POST /auth/login ile token alın.
- Authorization: Bearer <token> başlığı ile:
  - POST /chat/sessions → session_id döner
  - POST /chat/send → echo yanıtı döner ve messages tablosuna kaydedilir
  - GET /chat/history?session_id=... → mesaj geçmişini listeleyin
- Admin UI’da kullanıcıları listeleyin ve yeni DB-user oluşturun.

## Kabul Kriterleri (Faz 0)

- DB-user ile register/login çalışır.
- Chat ekranında mesaj atılır, messages tablosuna kaydolur.
- Admin panelinden DB-user oluşturulabilir.

## Notlar

- DLP, LiteLLM ve LDAP entegrasyonları Faz 1/2/3’te eklenecek.
