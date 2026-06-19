# Email Tools Analysis & Integration Plan
*Started: 2026-06-18 | Updated: 2026-06-18*

---

## Source Repositories Analyzed

### [`email-trust-tracker`](other-sources/email-trust-tracker/)
- **Port:** 4010 (Express + React)
- **DB:** `emailtrust` standalone DB — `customers`, `email_campaigns`, `email_messages`, `email_events`, `customer_email_stats` view
- **Lead thresholds:** hot≥80, warm≥45, cold<45
- **Key files:**
  - [`apps/api/src/scoring.js`](other-sources/email-trust-tracker/email-trust-tracker/apps/api/src/scoring.js) — `calculateLeadScore()` with email engagement metrics
  - [`apps/api/src/security.js`](other-sources/email-trust-tracker/email-trust-tracker/apps/api/src/security.js) — HMAC-SHA256 IP hashing, safe redirect validation
  - [`apps/api/src/server.js`](other-sources/email-trust-tracker/email-trust-tracker/apps/api/src/server.js) — Express app with trust-scoring routes

### [`mass-email-campaign-builder`](other-sources/mass-email-campaign-builder/)
- **Port:** 4100 (Express + BullMQ + Redis)
- **DB:** `contacts`, `suppression_list`, `segments`, `email_templates`, `campaigns`, `campaign_recipients`, `email_events`
- **Send rate:** 60/min via BullMQ rate limiter
- **Provider:** nodemailer (SMTP) + SESv2 dual adapter
- **Tracking:** SHA256+salt IP hash, open pixel, click redirect, unsubscribe
- **Key files:**
  - [`backend/src/server.js`](other-sources/mass-email-campaign-builder/homeu-campaign-builder/backend/src/server.js)
  - [`backend/src/routes/campaigns.js`](other-sources/mass-email-campaign-builder/homeu-campaign-builder/backend/src/routes/campaigns.js)
  - [`backend/src/routes/contacts.js`](other-sources/mass-email-campaign-builder/homeu-campaign-builder/backend/src/routes/contacts.js)
  - [`backend/src/routes/tracking.js`](other-sources/mass-email-campaign-builder/homeu-campaign-builder/backend/src/routes/tracking.js)
  - [`backend/src/workers/emailWorker.js`](other-sources/mass-email-campaign-builder/homeu-campaign-builder/backend/src/workers/emailWorker.js)
  - [`backend/src/services/sendProvider.js`](other-sources/mass-email-campaign-builder/homeu-campaign-builder/backend/src/services/sendProvider.js)
  - [`backend/src/lib/queue.js`](other-sources/mass-email-campaign-builder/homeu-campaign-builder/backend/src/lib/queue.js)

---

## Existing DaVinciOS Workspace Context

| Aspect | Detail |
|--------|--------|
| **Stack** | Next.js + PostgreSQL 16 + Ollama (qwen3:4b) |
| **Port** | 3000 (website) |
| **DB** | `homeu` DB — 20+ tables (categories, products, customers, pages, media, rfq_requests, chat_sessions, lead_scores, emails, appointments, etc.) |
| **Chatbot Lead Scorer** | [`apps/website/src/lib/chatbot/lead-scorer.ts`](apps/website/src/lib/chatbot/lead-scorer.ts) — signal weights: lead_gate=5, rfq_submit=25, high_value_cart=20, appointment=15, product_view=3, page_visit=2, complaint=-5 |
| **Thresholds** | qualified≥81, hot≥51, warm≥21, cold<21 (4-tier) |
| **IMAP Sync** | [`apps/website/src/lib/mail-client.ts`](apps/website/src/lib/mail-client.ts) — Zoho IMAP via imapflow → `emails` table |
| **DB Layer** | [`apps/website/src/lib/db.ts`](apps/website/src/lib/db.ts) — PostgreSQL pool singleton with `query()`, `findOne()`, `find()`, `update()` |

---

## Key Decisions

1. **Run as separate marketing service** — preserves SMTP reputation; not directly from VPS IP
2. **Merge email-trust-tracker into campaign-builder** — single Express service on port 4010
3. **Unify lead scoring** — blend email engagement + chatbot signals into shared 0–100 range
4. **Add orchestration layer** — cross-system coordination (campaign → tracking → scoring → chat enrichment)

---

## Lead Scoring Unification

| Dimension | email-trust-tracker | DaVinciOS Chatbot | **Unified Decision** |
|-----------|--------------------|-------------------|---------------------|
| Thresholds | hot≥80, warm≥45, cold<45 | qualified≥81, hot≥51, warm≥21, cold<21 | **Adopt DaVinciOS 4-tier** (21/51/81) |
| Inputs | Email engagement only | Chat signals only | **Blend both** — email + chat contribute to same score |
| Range | 0–100 (clamped) | 0+ (floor 0, no cap) | **0–100 hard cap** across both |
| Penalties | -25 for 10+ sends 0 engagement | -5 complaint, -3 abandoned chat | **Combine all penalties** |

### Unified Scoring Formula

```
total = 0

# Email signals
total += min(opens * 2, 20)
total += min(clicks * 6, 30)

# Chat signals  
total += 5  if lead_gate_completed
total += 25 if rfq_submitted
total += 15 if appointment_booked
total += 20 if high_value_cart
total += 3  per product_view (max 9)
total += 2  per page_visit (max 10)

# Penalties
total -= 5  if complaint
total -= 25 if 10+ sends with 0 engagement

# Clamp
return max(0, min(100, total))
```

---

## Architecture Diagrams

### System Architecture

```mermaid
graph TB
    subgraph "DaVinciOS (Next.js :3000)"
        A[Website Storefront]
        B[Admin Panel / Payload CMS]
        C[Chatbot Lead Scorer]
        D[Zoho IMAP Sync]
    end

    subgraph "Marketing Service (Express :4010)"
        E[Campaign API Routes]
        F[Contact API Routes]
        G[Template API Routes]
        H[Segment API Routes]
        I[Tracking Routes]
        J[BullMQ Email Worker]
        K[Unified Lead Scorer]
        L[Event Ingestion Routes]
    end

    subgraph "Infrastructure"
        M[(PostgreSQL :5432 <br/> homeu DB)]
        N[(Redis :6379)]
        O[SMTP / SES Provider]
    end

    A -->|POST /api/contacts/signup| E
    A -->|tracking pixel| I
    B -->|CRUD campaigns/templates| E
    B -->|CRUD contacts/segments| F
    C -->|email signals| K
    D -->|enrich contacts| E
    I -->|open/click| M
    I -->|open/click| M
    J -->|fetch jobs| N
    J -->|send| O
    O -->|webhooks| I
    K -->|score upsert| M
    L -->|unified events| M
```

### Campaign Lifecycle

```mermaid
stateDiagram-v2
    [*] --> Draft: create campaign
    Draft --> Sending: /prepare (resolve segment → queue recipients)
    Sending --> Paused: /pause
    Paused --> Sending: /send (resume)
    Sending --> Sent: all recipients processed
    Sent --> [*]
    Draft --> [*]: DELETE
    Sending --> Cancelled: /pause + DELETE
    Cancelled --> [*]
```

### Tracking Flow

```mermaid
sequenceDiagram
    participant S as SMTP/SES
    participant R as Recipient
    participant TRK as Marketing :4010
    participant DB as PostgreSQL
    participant W as BullMQ Worker

    S->>R: Email with tracking pixel & rewritten links
    
    R->>TRK: GET /t/open/{recipientId}.gif
    TRK->>DB: INSERT email_events (open, ip_hash, user_agent)
    TRK-->>R: 1×1 transparent GIF

    R->>TRK: GET /t/click/{recipientId}?u=target
    TRK->>DB: INSERT email_events (click, url, product_id)
    TRK-->>R: 302 redirect → target URL

    R->>TRK: GET /t/unsubscribe/{recipientId}
    TRK->>DB: INSERT suppression_list (reason='unsubscribe')
    TRK-->>R: "Unsubscribed" confirmation page

    S-->>TRK: POST /t/provider-webhook (bounce/complaint)
    TRK->>DB: INSERT suppression_list (reason='bounce'|'complaint')
    Note over TRK,DB: Also updates email_events with event_type
```

### Lead Scoring Flow

```mermaid
flowchart TD
    S[Scoring Engine] --> SC[Signal Collection]
    SC --> ES[Email Signals]
    SC --> CS[Chat Signals]
    SC --> WS[Web Signals]

    ES -->|opens × 2 (max 20)| AWS[Email Sub-score]
    ES -->|clicks × 6 (max 30)| AWS
    ES -->|-25 penalty 10+ sends 0 engagement| AWS

    CS -->|lead_gate: +5| CWS[Chat Sub-score]
    CS -->|rfq_submitted: +25| CWS
    CS -->|appointment_booked: +15| CWS
    CS -->|high_value_cart: +20| CWS
    CS -->|complaint: -5| CWS

    WS -->|product_view: +3 each (max 9)| WWS[Web Sub-score]
    WS -->|page_visit: +2 each (max 10)| WWS

    AWS --> COMBINE[Total 0-100]
    CWS --> COMBINE
    WWS --> COMBINE

    COMBINE --> CLASS{Classify}
    CLASS -->|≥ 81| Q[qualified]
    CLASS -->|≥ 51| H[hot]
    CLASS -->|≥ 21| W[warm]
    CLASS -->|< 21| C[cold]

    Q --> ACT[Trigger: sales notification]
    H --> ACT
    W --> NURTURE[Add to nurture campaign]
    C --> REACTIVATE[Add to re-engagement campaign]
```

---

## Project Structure (New Service)

```
apps/marketing/
├── Dockerfile
├── package.json
├── src/
│   ├── server.js                 ← Unified Express API (:4010)
│   ├── db.js                     ← Reuse pool from apps/website/src/lib/db.ts
│   ├── scoring.js                ← Unified lead scorer (email + chat + web)
│   ├── security.js               ← IP hashing, safe redirect, VCF escape
│   ├── auth.js                   ← requireAdmin (JWT from DaVinciOS session)
│   ├── queue.js                  ← BullMQ queue (Redis)
│   ├── routes/
│   │   ├── campaigns.js          ← CRUD + prepare/send/pause/analytics
│   │   ├── contacts.js           ← CRUD + bulk import
│   │   ├── templates.js          ← CRUD email templates
│   │   ├── segments.js           ← CRUD + preview
│   │   ├── tracking.js           ← open pixel, click, unsubscribe, webhooks
│   │   └── events.js             ← POST /events (unified event ingestion)
│   ├── services/
│   │   ├── sendProvider.js       ← SMTP/SES dual adapter
│   │   ├── renderTemplate.js     ← Handlebars rendering
│   │   └── segmentService.js     ← Dynamic segment resolution
│   └── workers/
│       └── emailWorker.js        ← BullMQ worker with rate limiter
└── frontend/                     ← React dashboard (from campaign-builder)
```

---

## New Tables (into existing `homeu` DB)

| Table | Key Columns | Source |
|-------|-------------|--------|
| `contacts` | id (uuid PK), email (unique), first_name, last_name, phone, company, role (enum), marketing_consent (bool), consent_source, tags (text[]), metadata (jsonb), created_at, updated_at | campaign-builder |
| `suppression_list` | id (uuid PK), email (unique), reason (text), created_at | campaign-builder |
| `segments` | id (uuid PK), name, description, rules (jsonb), created_at, updated_at | campaign-builder |
| `email_templates` | id (uuid PK), name, subject, html_body (text), text_body (text), created_at, updated_at | campaign-builder |
| `campaigns` | id (uuid PK), name, subject, segment_id → segments, template_id → email_templates, status (enum), scheduled_at, created_at, updated_at | campaign-builder |
| `campaign_recipients` | id (uuid PK), campaign_id → campaigns, contact_id → contacts, email, status (enum), error, provider_message_id, sent_at | campaign-builder |
| `email_events` | id (uuid PK), campaign_id, contact_id, recipient_id, customer_id → homeu.customers, event_type (enum: open/click/delivered/unsubscribe/bounce/complaint/rfq_submit/appointment_booked), url, product_id, user_agent, ip_hash, metadata (jsonb), created_at | both |

---

## API Endpoint Map

| Method | Endpoint | Source | Purpose |
|--------|----------|--------|---------|
| GET | `/health` | campaign-builder | Health check |
| GET,POST | `/api/contacts` | campaign-builder | List/Create contacts |
| GET,PUT,DELETE | `/api/contacts/:id` | campaign-builder | Single contact CRUD |
| POST | `/api/contacts/bulk` | campaign-builder | Bulk import |
| GET,POST | `/api/templates` | campaign-builder | List/Create templates |
| GET,PUT,DELETE | `/api/templates/:id` | campaign-builder | Single template CRUD |
| GET,POST | `/api/segments` | campaign-builder | List/Create segments |
| GET,PUT,DELETE | `/api/segments/:id` | campaign-builder | Single segment CRUD |
| POST | `/api/segments/:id/preview` | campaign-builder | Preview segment members |
| GET,POST | `/api/campaigns` | campaign-builder | List/Create campaigns |
| GET,PUT,DELETE | `/api/campaigns/:id` | campaign-builder | Single campaign CRUD |
| POST | `/api/campaigns/:id/prepare` | campaign-builder | Resolve segment → queue recipients |
| POST | `/api/campaigns/:id/send` | campaign-builder | Start sending |
| POST | `/api/campaigns/:id/pause` | campaign-builder | Pause sending |
| GET | `/api/campaigns/:id/analytics` | campaign-builder | Campaign analytics |
| GET | `/t/open/:recipientId.gif` | campaign-builder | Tracking pixel |
| GET | `/t/click/:recipientId` | campaign-builder | Click redirect |
| GET | `/t/unsubscribe/:recipientId` | campaign-builder | One-click unsubscribe |
| POST | `/t/provider-webhook` | campaign-builder | SES/SMTP bounce/complaint |
| POST | `/api/events` | trust-tracker | Unified event ingestion |
| GET | `/stats/summary` | trust-tracker | Aggregate stats |
| GET | `/stats/customers` | trust-tracker | Customer stats with lead score |
| GET | `/contact-card/homeu.vcf` | trust-tracker | Unified VCF endpoint |

---

## docker-compose.yml Additions

```yaml
services:
  redis:
    image: redis:7-alpine
    restart: unless-stopped
    networks:
      - homeu_network

  marketing:
    build:
      context: ./apps/marketing
      dockerfile: Dockerfile
    restart: unless-stopped
    ports:
      - "127.0.0.1:4010:4010"
    depends_on:
      - postgres
      - redis
    env_file:
      - .env
    environment:
      - DATABASE_URL=postgres://homeu:${POSTGRES_PASSWORD}@postgres:5432/homeu
      - REDIS_URL=redis://redis:6379
      - SEND_RATE_PER_MINUTE=60
      - TRACKING_DOMAIN=https://marketing.homeatelier.ph
      - FRONTEND_URL=https://admin.homeatelier.ph
    networks:
      - homeu_network
```

---

## Implementation Order

| Phase | What | Details |
|-------|------|---------|
| **1** | Schema | Create 7 new tables in existing `homeu` DB (contacts, suppression_list, segments, email_templates, campaigns, campaign_recipients, email_events) |
| **2** | Service scaffolding | Create [`apps/marketing/`](apps/marketing/) with Dockerfile, package.json, db.js (reuse existing pool pattern) |
| **3** | Core routes | Contacts, templates, segments CRUD (standalone first) |
| **4** | Campaign flow | CRUD → prepare → BullMQ queue → emailWorker → sendProvider |
| **5** | Tracking | Open pixel, click redirect, unsubscribe, provider webhook |
| **6** | Events & scoring | POST /events, unified lead scorer blending email + chat signals |
| **7** | Infrastructure | Add Redis + marketing service to docker-compose.yml |
| **8** | Frontend | React dashboard from campaign-builder (mounted at `/dashboard`) |
| **9** | Auth | Map `requireAdmin` to DaVinciOS JWT session (session cookie) |
| **10** | Deploy | Add `marketing` service to DigitalOcean VPS with `marketing.homeatelier.ph` subdomain |

---

## Security Considerations

- **IP hashing:** SHA256 HMAC with server-side secret (from trust-tracker's [`security.js`](other-sources/email-trust-tracker/email-trust-tracker/apps/api/src/security.js)) — do not store raw IPs
- **Safe redirect:** Validate click redirect URLs against allowlist to prevent open redirect vulns
- **API auth:** `requireAdmin` middleware validates JWT from DaVinciOS session (same as admin panel)
- **Rate limiting:** BullMQ rate limiter enforces `SEND_RATE_PER_MINUTE` (60/min default)
- **Suppression:** Check `suppression_list` before every send — unsubscribe, bounce, complaint
- **VCF injection:** Escape all fields in VCF generation to prevent LDIF injection (from trust-tracker)
- **CORS:** Restrict tracking endpoints to email client user-agents only
