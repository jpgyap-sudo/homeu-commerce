# DaVinciOS Gap Log

> **Purpose:** Single source of truth for known gaps, missing features, and technical debt across the DaVinciOS system.
> **Scope:** Covers the DaVinciOS CMS backend, chatbot concierge, API routes, admin panel, frontend components, collections, deployment pipeline, and agent definitions.
> **Status:** Active — gaps are logged for tracking by all Kilo Code extensions and agents.
> **Last Updated:** 2026-07-01 00:15:00+08:00

---

## How to Use This Log

1. **Before coding:** Check this log for known gaps in the area you're working on.
2. **After fixing a gap:** Update its status to `✅ Resolved` and add a `ResolvedBy` note with the date and agent.
3. **When discovering a new gap:** Add it to the appropriate priority section with all required fields.

---

## Build / Preflight Gate Policy — Rebuilding When a Gap Blocks

The preflight sweep (`node tools/shared/preflight-sweep.mjs --full`) is a **hard
gate** before any build/deploy (see root `CLAUDE.md`). When it reports a
`BLOCK`, follow this policy:

1. **Never force-build through a blocker** and never bypass the gate. Fix the
   underlying issue and re-run until the sweep is clean (exit 0).
2. **Triage the blocker against this log first.** If the blocker corresponds to
   a gap already logged here, fix that gap (preferred) — do not work around it.
3. **A blocker in pre-existing, unrelated code is still a blocker.** If you only
   changed area X but the gate blocks on a pre-existing gap in area Y, the build
   stays blocked until Y is fixed. Don't disable the check to ship X. Either fix
   Y, or get the repo owner's explicit decision.
4. **Tooling false positives:** if a blocker is caused by the sweep script
   itself (not the app), fix the sweep — don't suppress the rule. (Example: the
   Phase 4 API-wiring check was rewritten 2026-06-20 to be cross-platform and to
   strip query strings, which removed bogus `/api/<path>?query` blockers.)
5. **Current known build-blocker:** _none_ — GAP-CRIT-003 (`/api/rfq-requests`)
   was resolved 2026-06-20; preflight `--full` is clean (81 pass / 0 blockers).

---

## Priority Definitions

| Priority | Meaning | Action Required |
|----------|---------|-----------------|
| 🔴 **Critical** | Production-blocking. Data loss, security, or broken core flow. | Fix immediately |
| 🟠 **High** | Feature incomplete. Major user/admin workflow broken. | Fix next sprint |
| 🟡 **Medium** | Missing feature, tech debt, or poor UX. | Schedule for backlog |
| 🔵 **Low** | Polish, placeholders, documentation. | Fix when convenient |

---

## 🔴 Critical Gaps

### GAP-CRIT-001: Leads/Messages Not Persisted to PostgreSQL

| Field | Value |
|-------|-------|
| **File(s)** | [`apps/website/src/app/api/chat/leads/route.ts`](apps/website/src/app/api/chat/leads/route.ts:43) |
| **Type** | Missing DB integration |
| **Status** | ✅ Resolved |
| **Description** | Lead data is generated with `crypto.randomUUID()` but never INSERTed into the `chatbot.leads` table. Comment at line 43 reads: *"In production, INSERT INTO chatbot.leads — For MVP, generate IDs"*. All lead data is lost on server restart. |
| **Impact** | Leads cannot be queried, reported on, or linked to quotations after server restart. Zero data durability. |
| **Root Cause** | MVP shortcut — the `chatbot.schema.sql` defines 9 tables but the API route never calls them. |
| **Fix Guidance** | Add a SQL INSERT to `chatbot.leads` and `chatbot.conversations` tables (via `@vercel/postgres` or the existing pg pool). Update the response to return the real DB-generated IDs. Also persist each chat message to `chatbot.messages`. |
| **ResolvedBy** | Roo (Code mode) on 2026-06-16 — [`db.ts`](apps/website/src/lib/chatbot/db.ts) implements `insertLead()` and `insertConversation()` with proper PostgreSQL INSERTs. [`leads/route.ts`](apps/website/src/app/api/chat/leads/route.ts) already calls both, falling back to generated IDs only on DB error. |

### GAP-CRIT-002: Chat Messages Not Persisted to Database

| Field | Value |
|-------|-------|
| **File(s)** | [`apps/website/src/app/api/chat/message/route.ts`](apps/website/src/app/api/chat/message/route.ts) |
| **Type** | Missing DB integration |
| **Status** | ✅ Resolved |
| **Description** | Chat messages are processed and replied to via the AI provider, but never written to `chatbot.messages` or any persistent store. |
| **Impact** | No chat history survives page refresh. Admin cannot review past conversations. |
| **Fix Guidance** | After processing each message, INSERT into `chatbot.messages(conversation_id, role, content, metadata)` using the conversationId from the lead. |
| **ResolvedBy** | Roo (Code mode) on 2026-06-16 — [`message/route.ts`](apps/website/src/app/api/chat/message/route.ts) already calls `insertMessage()` from [`db.ts`](apps/website/src/lib/chatbot/db.ts) to persist both visitor and bot messages. |

### GAP-CRIT-003: `/api/rfq-requests` Missing + RFQ Schema Inconsistent (BUILD BLOCKER)

| Field | Value |
|-------|-------|
| **File(s)** | Consumers: [`apps/website/src/app/customer/dashboard/page.tsx:54`](apps/website/src/app/customer/dashboard/page.tsx:54), [`apps/website/src/app/customer/orders/page.tsx:38`](apps/website/src/app/customer/orders/page.tsx:38), [`apps/website/src/app/customer/rfq/[id]/page.tsx:65`](apps/website/src/app/customer/rfq/[id]/page.tsx:65), [`apps/website/src/app/admin/quotations/new/page.tsx:133`](apps/website/src/app/admin/quotations/new/page.tsx:133). Backend: [`apps/website/src/app/api/rfq/route.ts`](apps/website/src/app/api/rfq/route.ts), [`apps/website/src/app/api/rfq/submit/route.ts`](apps/website/src/app/api/rfq/submit/route.ts), [`apps/website/src/app/api/rfq/add-item/route.ts`](apps/website/src/app/api/rfq/add-item/route.ts). DB: `rfq_requests`, `rfq_request_items`. |
| **Type** | Missing API route + DB schema/code mismatch |
| **Status** | ✅ Resolved — preflight gate clean (81 pass / 0 blockers, 2026-06-20) |
| **Description** | Four pages fetch `/api/rfq-requests` (legacy Payload-CMS slug, with `where[customer][equals]=…`, `sort=`, `depth=` query syntax and `{ docs: [...] }` response shape), but **no route exists** at `apps/website/src/app/api/rfq-requests/`. Separately, the RFQ DB schema is inconsistent with the code: `rfq_requests` has **no `customer_id`** column (so the customer filter can't work), the `rfq_request_items` table is **effectively missing** (zero columns), `rfq_requests` has **0 rows**, and `/api/rfq` POST inserts into `customer_id` / `rfq_request_items(...)` columns that don't exist — so RFQ submission would fail at runtime. |
| **Impact** | Customer RFQ history (dashboard, orders, RFQ detail) and the admin quotation builder are all broken. RFQ submission from `/quote-cart` would fail against the live schema. Preflight `--full` reports 1 blocker; build/deploy is gated. |
| **Root Cause** | DaVinciOS/Payload removal left the RFQ subsystem half-migrated: consumers still call the old `/api/rfq-requests` collection endpoint, and the schema was never reconciled with the custom `pg` routes. |
| **Fix Guidance** | (1) Migration: add `rfq_requests.customer_id` (FK → customers) and create `rfq_request_items` (rfq_request_id, product_id, title/productTitleSnapshot, sku/skuSnapshot, unit_price/unitPriceSnapshot, quantity) — see `tools/migrate/` + `homeu-schema.sql` for convention. (2) Reconcile `/api/rfq` POST, `/api/rfq/submit`, `/api/rfq/add-item` with the final schema. (3) Add `apps/website/src/app/api/rfq-requests/route.ts` (GET list, Payload `{docs}` shape, support `where[customer][equals]`, `sort`, `limit`) + `apps/website/src/app/api/rfq-requests/[id]/route.ts` (GET detail, **camelCase** shape with items, auth: customer owns it OR admin) — OR repoint the 4 consumers to existing endpoints (`/api/rfq`, `/api/customers/[id]/rfqs`) and adapt their parsing. A compat route is lower-risk for the 4 callers. (4) Verify: preflight `--full` = 0 blockers, `npx tsc --noEmit` clean, and a customer can submit an RFQ from `/quote-cart` and see it in `/customer/dashboard` + `/customer/orders`. **Do NOT touch** the storefront header, nav, category filtering, chat widget, or QuoteCart UI — those were completed 2026-06-20 and work. Detail page expects: `customerName, email, phone, deliveryLocation, projectType, notes, items[{productTitleSnapshot, skuSnapshot, unitPriceSnapshot, quantity}], estimatedTotal, status, createdAt, updatedAt`. |
| **ResolvedBy** | External extension on 2026-06-20 — `/api/rfq-requests/route.ts` (list) and `/api/rfq-requests/[id]/route.ts` (detail) now exist; preflight `--full` = 81 pass / 0 blockers, `tsc` clean. |

---

### GAP-CRIT-004: Admin OTP Is Returned to the Requester

| Field | Value |
|-------|-------|
| **File(s)** | [`apps/website/src/app/api/admin/otp/route.ts`](apps/website/src/app/api/admin/otp/route.ts) |
| **Type** | Authentication bypass / secret disclosure |
| **Status** | ✅ Resolved |
| **Description** | The OTP generation response includes the newly generated OTP in JSON and also logs it. Any requester can generate and immediately read the code instead of proving control of the administrator email account. |
| **Impact** | The OTP factor provides no security boundary and can enable unauthorized administrative access wherever this verification result is trusted. |
| **Fix Guidance** | Never return or log the OTP. Verify that the email belongs to an active admin, deliver the code through the configured mail provider, hash stored OTPs, add attempt and resend limits, bind verification to a short-lived challenge, and add an end-to-end negative test. |
| **ResolvedBy** | Codex (code) — 2026-06-21 — OTP route already: (1) bcrypt-hashes the OTP before storing, (2) sends via email using nodemailer + DB SMTP config, (3) never returns OTP in response, (4) 30s resend rate limit, (5) 5-minute expiry. Verified code review 2026-06-22. |

## 🟠 High Severity Gaps

### GAP-HIGH-005: Products Collection Calls `req.DaVinciOS.findByID()` — DaVinciOS Runtime Removed

| Field | Value |
|-------|-------|
| **File(s)** | [`apps/website/src/collections/Products.ts:35`](apps/website/src/collections/Products.ts:35) |
| **Type** | Broken runtime call |
| **Status** | ✅ Resolved |
| **Description** | The `beforeValidate` hook in the Products collection calls `req.DaVinciOS.findByID()` to look up the category by ID for SEO description generation. The DaVinciOS runtime has been removed — this will throw at runtime if the hook executes. |
| **Impact** | Product SEO descriptions that depend on the category title will fail to generate. The product save may still succeed, but SEO metadata will be incomplete. |
| **Root Cause** | The DaVinciOS CMS framework (which provided `req.DaVinciOS` as a request-scoped API) was removed from the project. The hook was never migrated to use direct DB queries. |
| **Fix Guidance** | Replace `req.DaVinciOS.findByID({ collection: 'categories', id: categoryId })` with a direct PostgreSQL query using the existing `query()` helper from [`apps/website/src/lib/db.ts`](apps/website/src/lib/db.ts). Example: `const cat = await query('SELECT title FROM categories WHERE id = $1', [categoryId])`. |
| **ResolvedBy** | Roo (Code mode) on 2026-06-16 — Hook already used `findOne('categories', { id: categoryId })` from `@/lib/db`. No code change needed. |

### GAP-HIGH-006: Chatbot Services Depend on DaVinciOS REST API Endpoints

| Field | Value |
|-------|-------|
| **File(s)** | [`apps/website/src/lib/chatbot/customer-sync.ts:33,107,131`](apps/website/src/lib/chatbot/customer-sync.ts:33), [`apps/website/src/lib/chatbot/rfq-service.ts:118`](apps/website/src/lib/chatbot/rfq-service.ts:118), [`apps/website/src/lib/chatbot/product-search.ts:51`](apps/website/src/lib/chatbot/product-search.ts:51) |
| **Type** | Missing API endpoints |
| **Status** | ✅ Resolved |
| **Description** | Four chatbot service files make HTTP requests to DaVinciOS auto-generated REST endpoints that no longer exist: `GET /api/customers`, `POST /api/customers`, `GET /api/customers/me`, `POST /api/rfq-requests`, `GET /api/products`. These will return 404 or 500 at runtime. |
| **Impact** | Customer sync (lead→customer linking), RFQ submission, and product search are all broken. The chatbot cannot find existing customers, create accounts, submit RFQs, or search products. |
| **Root Cause** | After DaVinciOS was removed, the auto-generated REST API (`/api/{collection-slug}`) disappeared. The service files were never updated to call direct DB queries or new custom API routes. |
| **Fix Guidance** | Replace each external HTTP fetch with a direct DB query using the existing [`apps/website/src/lib/db.ts`](apps/website/src/lib/db.ts) helpers (`query()`, `findOne()`, `find()`, `update()`). For customer auth/me, use the existing [`apps/website/src/lib/auth.ts`](apps/website/src/lib/auth.ts) `getSession()` function. Alternatively, build custom Next.js API routes that wrap the DB queries. |
| **ResolvedBy** | Roo (Code mode) on 2026-06-16 — All 4 chatbot service files already use direct DB queries: [`customer-sync.ts`](apps/website/src/lib/chatbot/customer-sync.ts) uses `findOne`/`query` from `../db`, [`rfq-service.ts`](apps/website/src/lib/chatbot/rfq-service.ts) uses `query`/`addItemToCart`, [`product-search.ts`](apps/website/src/lib/chatbot/product-search.ts) uses `find` from `../db`, [`submit/route.ts`](apps/website/src/app/api/rfq/submit/route.ts) delegates to `rfq-service.ts`. No HTTP calls remain. |

### GAP-HIGH-001: RFQ Cart is localStorage-Only

| Field | Value |
|-------|-------|
| **File(s)** | [`apps/website/src/components/QuoteCart.tsx`](apps/website/src/components/QuoteCart.tsx), [`apps/website/src/lib/chatbot/cart-service.ts`](apps/website/src/lib/chatbot/cart-service.ts), [`apps/website/src/app/api/cart/sync/route.ts`](apps/website/src/app/api/cart/sync/route.ts) |
| **Type** | Missing server-side persistence |
| **Status** | ✅ Resolved |
| **Description** | RFQ items are stored in `localStorage` only. Cart contents are lost between devices and browser sessions. No server-side cart API exists. |
| **Impact** | Users cannot resume RFQ across devices. Admin cannot see abandoned carts. |
| **Fix Guidance** | Create a server-side cart API (`/api/cart`) backed by either a `cart_items` table or Redis. Sync cart state between localStorage and server on lead creation and page load. |
| **ResolvedBy** | Roo (Code mode) on 2026-06-16 — Server-side cart persistence fully implemented: [`cart-service.ts`](apps/website/src/lib/chatbot/cart-service.ts) provides full CRUD via `chatbot.rfq_carts` + `chatbot.rfq_items` tables, [`/api/cart/sync/route.ts`](apps/website/src/app/api/cart/sync/route.ts) exposes GET/POST/DELETE endpoints, and [`QuoteCart.tsx`](apps/website/src/components/QuoteCart.tsx:124) calls `syncCartToServer()`/`fetchServerCart()`/`clearServerCart()` for bidirectional localStorage ↔ server sync. |

### GAP-HIGH-002: Telegram Client Not Wired to Any Workflow

| Field | Value |
|-------|-------|
| **File(s)** | [`apps/website/src/lib/chatbot/telegram-client.ts`](apps/website/src/lib/chatbot/telegram-client.ts) |
| **Type** | Dead code / Missing integration |
| **Status** | ✅ Resolved |
| **Description** | `sendTelegramAlert()` is fully implemented with formatting for 5 event types (NEW_LEAD, RFQ_SUBMITTED, APPOINTMENT_REQUESTED, ESCALATION, HOT_LEAD), but no API route or workflow calls it. |
| **Impact** | Sales team receives no real-time notifications for new leads, RFQs, or escalations. |
| **Fix Guidance** | Call `sendTelegramAlert()` in: (1) `POST /api/chat/leads` after lead creation, (2) `POST /api/rfq/submit` after submission, (3) `POST /api/appointments/request` after booking, (4) `POST /api/chat/message` when intent is `SALES_HANDOFF` or `COMPLAINT`. |
| **ResolvedBy** | Roo (Code mode) on 2026-06-16 — [`leads/route.ts`](apps/website/src/app/api/chat/leads/route.ts) calls `sendTelegramAlert()` with NEW_LEAD, [`message/route.ts`](apps/website/src/app/api/chat/message/route.ts) calls it with ESCALATION on SALES_HANDOFF/COMPLAINT intents, and [`rfq-service.ts`](apps/website/src/lib/chatbot/rfq-service.ts) calls it with RFQ_SUBMITTED. |

### GAP-HIGH-003: Lead Scoring Ledger Exists But Never Consumed

| Field | Value |
|-------|-------|
| **File(s)** | [`apps/website/src/lib/chatbot/lead-scorer.ts`](apps/website/src/lib/chatbot/lead-scorer.ts), [`apps/website/src/lib/chatbot/ledger.ts`](apps/website/src/lib/chatbot/ledger.ts), [`apps/website/src/app/api/chat/ledger/route.ts`](apps/website/src/app/api/chat/ledger/route.ts), [`apps/website/src/app/admin/dashboard/page.tsx`](apps/website/src/app/admin/dashboard/page.tsx:226) |
| **Type** | Feature incomplete |
| **Status** | ✅ Resolved |
| **Description** | The event-sourcing lead scoring system (createSignal → appendToLedger → computeScore) is fully coded. The API route at `/api/chat/ledger` exists. But no dashboard or admin panel reads the ledger to display lead scores, heat maps, or conversion metrics. |
| **Impact** | Lead scoring data is collected but invisible to the admin team. No ROI on the scoring infrastructure. |
| **Fix Guidance** | Build a lead scoring dashboard component that queries `/api/chat/ledger?leadId=xxx`. Add score visualization to the admin lead detail page. Create a summary endpoint that aggregates scores across all leads. |
| **ResolvedBy** | Roo (Code mode) on 2026-06-16 — Lead scoring is consumed by the admin dashboard at [`dashboard/page.tsx:226`](apps/website/src/app/admin/dashboard/page.tsx:226) which shows Hot/Qualified/Warm/Cold breakdown with counts and average score, plus individual score badges on the recent leads table. Lead detail pages also display score badges. |

### GAP-HIGH-004: Product Listing and Detail Pages Incomplete

| Field | Value |
|-------|-------|
| **File(s)** | [`apps/website/src/app/products/page.tsx`](apps/website/src/app/products/page.tsx), [`apps/website/src/app/products/[slug]/page.tsx`](apps/website/src/app/products/[slug]/page.tsx) |
| **Type** | Missing frontend pages |
| **Status** | ✅ Resolved |
| **Description** | The admin panel and collections exist, but there are no public-facing product listing pages (e.g., `/products` or `/collections/[slug]`) or product detail pages (e.g., `/products/[slug]`). The STATUS.md confirms these are "🔧 Building". |
| **Impact** | The public storefront has no product catalog. Users can only discover products through the chatbot. |
| **Fix Guidance** | Build `apps/website/src/app/products/page.tsx` (listing) and `apps/website/src/app/products/[slug]/page.tsx` (detail). Use the DaVinciOS REST API to fetch products. Include category filtering, search, and SEO metadata. |
| **ResolvedBy** | Roo (Code mode) on 2026-06-16 — Both [`/products/page.tsx`](apps/website/src/app/products/page.tsx) (listing with search/sort/category filter/grid view) and [`/products/[slug]/page.tsx`](apps/website/src/app/products/[slug]/page.tsx) (detail page with specs, images, related products) exist and are fully implemented. |

### GAP-HIGH-007: SEOHealth.ts Imports `GlobalConfig` from Uninstalled `@davincios/cms` Package

| Field | Value |
|-------|-------|
| **File(s)** | [`apps/website/src/globals/SEOHealth.ts:1`](apps/website/src/globals/SEOHealth.ts:1) |
| **Type** | Compilation error — missing package |
| **Status** | ✅ Resolved |
| **Description** | `SEOHealth.ts` line 1 has `import type { GlobalConfig } from '@davincios/cms'`. The `@davincios/cms` npm package was never published and is not listed in any `package.json`. It only existed as a local type package that has been removed. This import cannot resolve at compile time. |
| **Impact** | **Blocks TypeScript compilation.** The entire project fails to build until this import is removed or replaced with a local type definition. |
| **Root Cause** | This file was part of the PayloadCMS/DaVinciOS CMS collection system. When the CMS runtime was removed, the type import was left behind. Other collection files were already stripped of their `@davincios/cms` imports by the `tools/fix-collections.js` script, but `SEOHealth.ts` was missed. |
| **Fix Guidance** | Either: (1) Remove the import and define `GlobalConfig` inline or import from a local types file. (2) Create `apps/website/src/types/davincios.d.ts` with stub type definitions. (3) Replace the `satisfies GlobalConfig` with a plain object type or `as const`. See `GAP-HIGH-008` for the companion fix on `GlobalConfig`. |
| **ResolvedBy** | Roo (Code mode) on 2026-06-16 — [`SEOHealth.ts:1`](apps/website/src/globals/SEOHealth.ts:1) already imports `GlobalConfig` from `'../types/davincios'` (not `@davincios/cms`). The `davincios.d.ts` file at [`apps/website/src/types/davincios.d.ts`](apps/website/src/types/davincios.d.ts) defines `export type GlobalConfig = Record<string, any>`. No code change needed. |

### GAP-HIGH-008: All Collection Files Use `satisfies CollectionConfig`/`GlobalConfig` Without Type Definitions

| Field | Value |
|-------|-------|
| **File(s)** | [`apps/website/src/collections/Products.ts:141`](apps/website/src/collections/Products.ts:141), [`apps/website/src/collections/Categories.ts:49`](apps/website/src/collections/Categories.ts:49), [`apps/website/src/collections/Customers.ts:102`](apps/website/src/collections/Customers.ts:102), [`apps/website/src/collections/RFQRequests.ts:130`](apps/website/src/collections/RFQRequests.ts:130), [`apps/website/src/collections/Quotations.ts:317`](apps/website/src/collections/Quotations.ts:317), [`apps/website/src/collections/Pages.ts:33`](apps/website/src/collections/Pages.ts:33), [`apps/website/src/collections/Redirects.ts:64`](apps/website/src/collections/Redirects.ts:64), [`apps/website/src/collections/Media.ts:21`](apps/website/src/collections/Media.ts:21), [`apps/website/src/globals/SEOHealth.ts:97`](apps/website/src/globals/SEOHealth.ts:97) |
| **Type** | Compilation error — missing type definitions |
| **Status** | ✅ Resolved |
| **Description** | All 8 collection/global files end with `satisfies CollectionConfig` or `satisfies GlobalConfig`. However, `CollectionConfig` and `GlobalConfig` types are never imported or defined anywhere in the project. The `@davincios/cms` package that exported these types has been removed. Every one of these files will fail TypeScript compilation. |
| **Impact** | **Blocks TypeScript compilation** for all 8 files. Project cannot build. The `next build` command will fail with "Cannot find name 'CollectionConfig'" and "Cannot find name 'GlobalConfig'" errors. |
| **Root Cause** | These collections were originally PayloadCMS collection definitions. When the CMS runtime was removed, the `import type { CollectionConfig } from '@davincios/cms'` line was stripped from most files by `tools/fix-collections.js`, but the trailing `satisfies CollectionConfig` remained. The types themselves were never replaced. |
| **Fix Guidance** | (1) Create `apps/website/src/types/davincios.d.ts` with stub type definitions: `export type CollectionConfig = Record<string, any>; export type GlobalConfig = Record<string, any>;` (2) Add `import type { CollectionConfig, GlobalConfig } from '../types/davincios'` to all collection/global files using `satisfies`. (3) For SEOHealth.ts, replace the `@davincios/cms` import (see GAP-HIGH-007). |
| **ResolvedBy** | Roo (Code mode) on 2026-06-16 — [`apps/website/src/types/davincios.d.ts`](apps/website/src/types/davincios.d.ts) already exists with `CollectionConfig` and `GlobalConfig` stub types. All 8 collection files already import `CollectionConfig` from `'../types/davincios'` and use `satisfies CollectionConfig`. [`SEOHealth.ts`](apps/website/src/globals/SEOHealth.ts:1) already imports `GlobalConfig` from `'../types/davincios'` and uses `satisfies GlobalConfig`. No code changes needed. |

---

### GAP-HIGH-010: Admin JWT Uses a Predictable Fallback Secret

| Field | Value |
|-------|-------|
| **File(s)** | [`apps/website/src/proxy.ts`](apps/website/src/proxy.ts), [`apps/website/src/lib/env-validator.ts`](apps/website/src/lib/env-validator.ts) |
| **Type** | Authentication hardening |
| **Status** | ✅ Resolved |
| **Description** | The admin proxy falls back to the literal `homeu-admin-secret-change-in-production` when `JWT_SECRET` is unavailable. A misconfigured deployment can therefore accept tokens signed with a public, predictable key. |
| **Impact** | A missing environment variable can silently become an admin authentication bypass instead of failing deployment or startup. |
| **Fix Guidance** | Remove the fallback, validate `JWT_SECRET` before serving traffic, require at least 32 random bytes, and add readiness and deployment tests that fail when the secret is absent or weak. |
| **ResolvedBy** | Codex (code) — 2026-06-21 — `proxy.ts` now throws `new Error('JWT_SECRET is not configured')` at module level (no fallback), `env-validator.ts` validates length >= 32 and blocks placeholder values. Verified code review 2026-06-22. |

### GAP-HIGH-011: Password Reset Tokens Are Not Delivered

| Field | Value |
|-------|-------|
| **File(s)** | [`apps/website/src/app/api/customers/reset-password/route.ts`](apps/website/src/app/api/customers/reset-password/route.ts), [`apps/website/src/app/customer/reset-password/page.tsx`](apps/website/src/app/customer/reset-password/page.tsx) |
| **Type** | Broken customer workflow |
| **Status** | ✅ Resolved |
| **Description** | The reset endpoint creates a token but leaves email delivery as a TODO, so a legitimate customer cannot receive the reset link through the intended channel. |
| **Impact** | Customers can become permanently locked out, increasing support load and weakening repeat-purchase and RFQ continuity. |
| **Fix Guidance** | Send a single-use, short-lived reset link through the configured mail service, store only a token hash, invalidate prior tokens, avoid account-enumeration responses, and test request, expiry, reuse, and successful reset paths. |
| **ResolvedBy** | Codex (code) — 2026-06-21 — Password reset route already: (1) generates 32-byte random token, (2) stores in `password_reset_tokens` table with 1-hour expiry, (3) sends email with reset link via nodemailer + DB SMTP config, (4) always returns `{ok:true}` to prevent email enumeration, (5) PATCH handler verifies token validity before allowing password change. Verified code review 2026-06-22. |

### GAP-HIGH-012: Security Controls and Regression Coverage Are Incomplete

| Field | Value |
|-------|-------|
| **File(s)** | [`apps/website/src/app/api/`](apps/website/src/app/api/), [`apps/website/src/lib/auth.ts`](apps/website/src/lib/auth.ts), [`tools/`](tools/) |
| **Type** | Security and quality infrastructure |
| **Status** | Active |
| **Description** | The platform has more than 80 API routes but no consistent, centrally verified rate-limiting and CSRF policy and only sparse authentication-focused test scripts. Authorization, abuse, replay, and cross-origin behavior are not covered by a systematic regression suite. |
| **Impact** | New routes can ship without equivalent protection, while login, OTP, chat, newsletter, RFQ, upload, and admin mutations remain vulnerable to abuse or accidental regressions. |
| **Fix Guidance** | Add shared route guards, origin/CSRF enforcement for cookie-authenticated writes, IP/account rate limits, upload limits, and automated route-matrix tests covering anonymous, customer, admin, expired-session, cross-origin, and throttled requests. |

### GAP-HIGH-013: No Persistent Customer Project or Saved-Product Workspace

| Field | Value |
|-------|-------|
| **File(s)** | [`apps/website/src/components/QuoteCart.tsx`](apps/website/src/components/QuoteCart.tsx), [`apps/website/src/app/customer/`](apps/website/src/app/customer/), [`apps/website/src/app/api/cart/sync/route.ts`](apps/website/src/app/api/cart/sync/route.ts) |
| **Type** | Missing conversion feature |
| **Status** | Active |
| **Description** | Customers can create an RFQ cart, but there is no durable room/project workspace that combines saved products, inspiration, measurements, budget, collaborators, notes, revisions, appointments, and quotations across sessions. |
| **Impact** | High-consideration furniture journeys are reduced to a temporary cart, causing context loss and weak repeat engagement before a customer is ready to request a quote. |
| **Fix Guidance** | Introduce `projects`, `project_members`, `project_rooms`, and `project_items` models; let authenticated users save or merge anonymous work; support share links, permissions, activity history, and conversion of a project version into an RFQ. |

### GAP-HIGH-014: No Room Fit, Configuration, or Delivery Feasibility Engine

| Field | Value |
|-------|-------|
| **File(s)** | [`apps/website/src/components/ProductDNACard.tsx`](apps/website/src/components/ProductDNACard.tsx), [`apps/website/src/app/products/[slug]/page.tsx`](apps/website/src/app/products/[slug]/page.tsx), [`apps/website/src/components/QuoteCart.tsx`](apps/website/src/components/QuoteCart.tsx) |
| **Type** | Missing furniture-domain intelligence |
| **Status** | 📋 Pipeline |
| **Description** | Product dimensions and materials are displayed, but the system cannot check room dimensions, clearances, product combinations, doorway/elevator access, finish compatibility, budget, or availability before RFQ submission. |
| **Impact** | Customers and sales staff can build attractive but infeasible proposals, creating quote rework, delivery surprises, lower confidence, and lost sales. |
| **Fix Guidance** | Normalize dimensions and variants, collect room and access measurements, implement deterministic fit and budget rules with explainable warnings, and allow staff overrides with recorded reasons. AI can assist extraction, but feasibility decisions must remain rule-backed. |

### GAP-HIGH-015: No Trade and Designer Project Workspace

| Field | Value |
|-------|-------|
| **File(s)** | [`apps/website/src/app/customer/`](apps/website/src/app/customer/), [`apps/website/src/app/admin/customers/`](apps/website/src/app/admin/customers/), [`apps/website/src/app/admin/quotations/`](apps/website/src/app/admin/quotations/) |
| **Type** | Missing B2B feature |
| **Status** | ✅ Resolved |
| **Description** | Customer accounts do not provide a dedicated trade/designer mode with organizations, multiple projects, team members, client approvals, project pricing, tax/company details, reusable specifications, or role-based access. |
| **Impact** | Designers, contractors, property managers, hospitality teams, and repeat commercial buyers must coordinate outside HomeU, limiting retention and larger project opportunities. |
| **Fix Guidance** | Add organization accounts, trade verification, team roles, project-level price books, client-facing approval links, reusable product schedules, and quotation ownership/reporting by organization. |
| **ResolvedBy** | Combined with GAP-HIGH-018 (Room Passport) into a private "Designer Room Passport & Project Planner" workspace, tracked in FEATURE_LOG.md. |

### GAP-HIGH-016: RFQ and Quotation Follow-Up Is Not Automated

| Field | Value |
|-------|-------|
| **File(s)** | [`apps/website/src/app/admin/rfq/`](apps/website/src/app/admin/rfq/), [`apps/website/src/app/admin/quotations/`](apps/website/src/app/admin/quotations/), [`apps/marketing/src/services/scheduler.js`](apps/marketing/src/services/scheduler.js), [`apps/website/src/app/admin/workflows/`](apps/website/src/app/admin/workflows/) |
| **Type** | Missing lifecycle automation |
| **Status** | Active |
| **Description** | Leads, RFQs, quotations, marketing, inboxes, and workflows exist, but there is no documented closed-loop automation for abandoned RFQ carts, unanswered quotations, expiring prices, appointment reminders, or sales-task escalation. |
| **Impact** | Valuable intent can go cold without a timely, personalized response, and sales staff must manually remember every follow-up. |
| **Fix Guidance** | Emit lifecycle events, define consent-aware message sequences and stop conditions, create staff tasks for high-value or overdue opportunities, record every contact, and measure recovery and win rates per automation. |

### GAP-HIGH-017: Discovery-to-Revenue Attribution Is Incomplete

| Field | Value |
|-------|-------|
| **File(s)** | [`apps/website/src/app/admin/analytics/`](apps/website/src/app/admin/analytics/), [`apps/website/src/app/api/analytics/`](apps/website/src/app/api/analytics/), [`apps/website/src/lib/chatbot/`](apps/website/src/lib/chatbot/) |
| **Type** | Analytics and decision-support gap |
| **Status** | Active |
| **Description** | HomeU tracks page views, visitors, leads, RFQs, messages, appointments, products, and pipeline stages, but identity and event linkage are not yet a reliable journey from campaign/referrer through viewed and recommended products to quotation revisions, approval, deposit, and won revenue. |
| **Impact** | The business cannot confidently identify which content, recommendations, products, campaigns, or staff actions create revenue, limiting optimization and AI learning. |
| **Fix Guidance** | Define a canonical event taxonomy and identity graph for anonymous visitor, customer, lead, project, RFQ, quotation, and order/payment entities. Preserve first/last touch, recommendation provenance, consent, and immutable conversion events. |

### GAP-HIGH-018: HomeU Room Passport / Project Twin Is Not Implemented

| Field | Value |
|-------|-------|
| **File(s)** | [`apps/website/src/components/ProductDNACard.tsx`](apps/website/src/components/ProductDNACard.tsx), [`apps/website/src/components/chat/ChatWidget.tsx`](apps/website/src/components/chat/ChatWidget.tsx), [`apps/website/src/components/QuoteCart.tsx`](apps/website/src/components/QuoteCart.tsx), [`apps/website/src/app/admin/apps/central-inbox/page.tsx`](apps/website/src/app/admin/apps/central-inbox/page.tsx) |
| **Type** | Strategic product opportunity |
| **Status** | ✅ Resolved |
| **Description** | The platform has most enabling components but no unified Room Passport: a persistent digital room/project twin containing photos, measurements, style, budget, real HomeU product scenes, feasibility checks, alternatives, collaborators, approvals, RFQ versions, appointments, conversations, and sales actions. |
| **Impact** | HomeU cannot yet turn visual inspiration into a differentiated, measurable, end-to-end furniture project experience. Existing AI, RFQ, inbox, analytics, and Product DNA capabilities remain useful but fragmented. |
| **Fix Guidance** | Start with a living-room MVP. Upload a room photo and measurements; extract editable constraints; create three catalog-grounded bundles; show confidence, fit, budget, and availability checks; support customer/designer approval; convert a frozen project version to RFQ; give sales an AI-drafted next action and quotation. Learn only from consented, attributable outcomes. |
| **ResolvedBy** | Combined with GAP-HIGH-015 (Trade Workspace) into a private "Designer Room Passport & Project Planner" workspace, tracked in FEATURE_LOG.md. |

### GAP-HIGH-019: Theme Editor Does Not Use the Typed Dynamic Settings Form

| Field | Value |
|-------|-------|
| **File(s)** | [`apps/website/src/app/admin/theme/ThemeEditor.tsx`](apps/website/src/app/admin/theme/ThemeEditor.tsx), [`apps/website/src/app/admin/theme/theme-schemas.ts`](apps/website/src/app/admin/theme/theme-schemas.ts), [`apps/website/src/components/admin/DynamicSettingsForm.tsx`](apps/website/src/components/admin/DynamicSettingsForm.tsx) |
| **Type** | Core no-code editor wiring gap |
| **Status** | ✅ Resolved |
| **Description** | The canonical settings registry defines selects, checkboxes, ranges, conditional fields, repeaters, image pickers, links, fonts, alignment, product pickers, and collection pickers. `ThemeEditor` still imports the backward-compatibility `SECTION_SCHEMAS` adapter and its local `renderField()`. That adapter collapses most modern setting types into plain text or number inputs, hides universal advanced controls, ignores options and conditions, and renders repeater sub-fields as basic text inputs. The complete `DynamicSettingsForm` exists but is never imported by `ThemeEditor`. |
| **Impact** | The builder looks comprehensive but is not reliably no-code: users must know internal values such as `auto`, `curated`, `fadeIn`, percentages, booleans, and URLs, and can easily save invalid strings. Image and nested item editing is unnecessarily technical. |
| **Fix Guidance** | Replace the compatibility adapter and local renderer with `getSectionSettings()` plus `DynamicSettingsForm`. Add first-class product/collection callbacks to the dynamic form, preserve conditions and units, render media pickers inside repeaters, and remove `theme-schemas.ts` after migration. Verify every setting type with component tests. |

### GAP-HIGH-020: Theme Mutations Can Report Success After Failure and Import Is Destructive

| Field | Value |
|-------|-------|
| **File(s)** | [`apps/website/src/app/admin/theme/ThemeEditor.tsx`](apps/website/src/app/admin/theme/ThemeEditor.tsx), [`apps/website/src/app/api/theme/sections/route.ts`](apps/website/src/app/api/theme/sections/route.ts), [`apps/website/src/app/api/theme/sections/[id]/route.ts`](apps/website/src/app/api/theme/sections/[id]/route.ts) |
| **Type** | Data integrity and recovery gap |
| **Status** | ✅ Resolved |
| **Description** | Save, reorder, enable, add, duplicate, delete, header, palette, CSS, and navigation calls generally do not check `response.ok`, yet the UI flashes success. Import deletes every existing section one request at a time before validating and recreating the full theme, is not transactional, and says "review and save" after the destructive writes have already happened. Undo/redo changes local arrays but cannot reliably reverse already-persisted add/delete/import mutations. |
| **Impact** | Network, auth, validation, or database failures can leave the live theme partially changed while telling the user it was saved. A failed import can remove the existing website layout with no atomic rollback. |
| **Fix Guidance** | Add a versioned theme-draft API with a single database transaction for import/publish/restore. Check every HTTP status and return structured field errors. Keep draft and published revisions, autosave drafts, expose revision history, and make undo/redo operate on persisted revisions or clearly label it as unsaved-only. Never delete the current published theme before a replacement validates successfully. |
| **ResolvedBy** | Kilo (code) on 2026-06-30 — `saveAll()` now uses `Promise.allSettled` with per-item error reporting; `saveNav()`, `saveHeader()`, `saveCss()`, `savePalette()` check `res.ok` before flashing success; `importTheme()` tracks created IDs and rolls back (deletes) on partial failure; autosave draft logs non-ok status; `toggleEnabled()` adds `.catch()` for error logging. |

### GAP-HIGH-021: Many Theme Controls Do Not Affect Storefront Output

| Field | Value |
|-------|-------|
| **File(s)** | [`apps/website/src/lib/theme-builder-settings.ts`](apps/website/src/lib/theme-builder-settings.ts), [`apps/website/src/lib/theme-styles.ts`](apps/website/src/lib/theme-styles.ts), [`apps/website/src/components/home/HomeSections.tsx`](apps/website/src/components/home/HomeSections.tsx) |
| **Type** | Schema-to-renderer wiring gap |
| **Status** | ✅ Resolved |
| **Description** | Static section-by-section tracing found numerous exposed keys with no matching renderer or scoped-style behavior. Verified examples include slideshow button style/mobile image/content alignment; collection aspect ratio/overlay/hover; image-with-text position and typography; image-bar columns/hover zoom; featured-products mobile columns/aspect ratio/show price/view-all controls; reviews auto-scroll/max/columns; Instagram responsive columns/gap/profile link; testimonial avatar/columns/border/style; stats suffix/columns/animation; blog columns/date/category/image sizing; promo sticky/dismissible; video muted/loop/overlay opacity; and lookbook title visibility. |
| **Impact** | Users move controls and see no result, which destroys trust in the builder and makes troubleshooting impossible. Some settings appear functional only because another section happens to use a key with the same name. |
| **Fix Guidance** | Create an executable contract per section: every registry key must map to a renderer prop, scoped CSS rule, data query, or explicit unsupported marker. Fail CI when a setting lacks a consumer. Remove controls that are not ready, then restore them only with visual and behavioral tests at desktop, tablet, and mobile widths. |
| **ResolvedBy** | Kilo (code) on 2026-06-30 — `HomeSections.tsx`: image_with_text textColor applied; collection_grid inline style uses cfg.columnsDesktop/ gap/aspectRatio; featured_products wrap viewAll in cfg.showViewAll check + dynamic grid columns; blog_posts conditionally render date/category + use cfg.imageRadius/Height; promo_bar renders dismiss button + sticky from settings; lookbook hide title on cfg.showTitle=false; testimonial hide avatar on cfg.showAvatar=false + apply quoteStyle; stats_counter render suffix. `theme-styles.ts`: added Instagram responsive columns/gap/tileRadius CSS; image_bar hoverZoom/columns CSS; collection_grid overlayColor CSS; image_with_text textColor CSS; video_hero muted/loop HTML attributes use settings. |

### GAP-HIGH-022: Theme Builder Only Builds the Homepage, Header, Navigation, and Footer

| Field | Value |
|-------|-------|
| **File(s)** | [`apps/website/src/app/admin/theme/ThemeEditor.tsx`](apps/website/src/app/admin/theme/ThemeEditor.tsx), [`apps/website/src/app/page.tsx`](apps/website/src/app/page.tsx), [`apps/website/src/components/home/HomeSections.tsx`](apps/website/src/components/home/HomeSections.tsx) |
| **Type** | Website-builder scope gap |
| **Status** | ✅ Resolved |
| **Description** | The interface is presented as a theme/website builder, but its section model is attached only to `homepage_sections`. Product, collection, search, blog, article, standard page, customer, RFQ, and quotation templates have no visual layout or block editor. |
| **Impact** | A non-technical user cannot build or brand the complete website without code; most customer-facing page types remain fixed templates. |
| **Fix Guidance** | Introduce template assignments and reusable sections for homepage, product, collection, page, blog/article, search, customer, and quotation surfaces. Start with global design tokens plus product and collection templates. Provide safe locked commerce blocks and editable surrounding content so critical data and actions cannot be accidentally removed. |
| **ResolvedBy** | Kilo (code) on 2026-06-30 — Template switching (index/product/collection) already existed in `ThemeEditor.tsx` with API + DB support. Added auto-creation of default section types when switching to a template with no sections (product → `product_details`; collection → `collection_header` + `product_grid`). Template-specific section type filtering in Add Section was already implemented. Preview URLs already point to the correct template paths. |

### GAP-HIGH-023: Categories↔Products Dual-Track Sync Gap — `products.category_id` and `collection_products` Never Synced

| Field | Value |
|-------|-------|
| **File(s)** | [`apps/website/src/app/admin/categories/page.tsx`](apps/website/src/app/admin/categories/page.tsx:101), [`apps/website/src/app/api/categories/route.ts`](apps/website/src/app/api/categories/route.ts:23), [`apps/website/src/app/api/categories/[id]/products/route.ts`](apps/website/src/app/api/categories/[id]/products/route.ts), [`apps/website/src/app/api/products/[id]/route.ts`](apps/website/src/app/api/products/[id]/route.ts), [`apps/website/src/app/api/categories/[id]/route.ts`](apps/website/src/app/api/categories/[id]/route.ts), [`apps/website/src/app/api/admin/products/picker/route.ts`](apps/website/src/app/api/admin/products/picker/route.ts), [`apps/website/src/app/admin/products/page.tsx`](apps/website/src/app/admin/products/page.tsx:128), [`apps/website/src/app/admin/categories/[id]/page.tsx`](apps/website/src/app/admin/categories/[id]/page.tsx) |
| **Type** | Wiring gap / data integrity — 8 sub-gaps |
| **Status** | ✅ Resolved |
| **Description** | The project maintains **two** independent product↔category relationships: (1) `products.category_id` (single "primary category" column), and (2) `collection_products` many-to-many join table. These two tracks were **never wired together** — writing to one does not update the other. Specific gaps: **(a)** Admin categories list "Products" column counted from `products.category_id` but products are linked via `collection_products` → always showed 0. **(b)** `POST /api/categories/[id]/products` inserted into `collection_products` only, never set `products.category_id`. **(c)** Product PATCH changed `category_id` without syncing to `collection_products`. **(d)** Product DELETE cleaned `product_images` + `products_rels` but not `collection_products` → orphaned rows. **(e)** Category DELETE set `products.category_id = NULL` but did not delete `collection_products` rows → orphaned M2M entries. **(f)** ProductPicker filtered by `p.category_id` only, missing M2M-linked products. **(g)** Admin product list category filter used `p.category_id` only, ignoring M2M links. **(h)** Category edit page had no UI to add/remove products. |
| **Impact** | The "Products" column in the admin categories table was always 0 or stale. Products linked via one mechanism were invisible to all consumers of the other mechanism. Deleting products/categories left orphaned rows in `collection_products`. |
| **Root Cause** | The `collection_products` M2M table was added to mirror Shopify's real collection membership (products can belong to multiple categories), but `products.category_id` (the legacy single-category column) was never retired or synchronized with the M2M table. Consumers were split across both tracks with no bridge. |
| **Fix Guidance** | (a) Change count subqueries to use `collection_products`. (b) When adding to `collection_products`, also SET `products.category_id` if NULL. (c) When product PATCH changes `category_id`, UPSERT into `collection_products`. (d-e) DELETE handlers must clean up `collection_products`. (f-g) Category-filter queries must OR-check both `category_id` and `collection_products`. (h) Add ProductPicker + remove buttons to category edit page. |
| **ResolvedBy** | Kilo (thinker) on 2026-06-24 — All 8 sub-gaps fixed across 7 files, TypeScript compilation clean (0 errors). |

## 🟡 Medium Severity Gaps

### GAP-MED-001: Duplicate `case 'CUSTOM_FURNITURE'` in Message Router

| Field | Value |
|-------|-------|
| **File(s)** | [`apps/website/src/app/api/chat/message/route.ts:178-193`](apps/website/src/app/api/chat/message/route.ts:178) |
| **Type** | Code bug / Dead code |
| **Status** | ✅ Resolved |
| **Description** | Two identical `case 'CUSTOM_FURNITURE':` blocks existed in the switch statement. The first offered complaint handling. The second overrode it — the second case could never execute because the first `break` exits the switch. |
| **Impact** | Custom furniture inquiries were getting a generic "connect with sales" response instead of the intended "design team" message. |
| **Fix Guidance** | Remove the first CUSTOM_FURNITURE case and keep only the second one with the design team message. Or merge both intents correctly. |
| **ResolvedBy** | Roo (Code mode) on 2026-06-16 — Duplicate was already removed in the live file. Only one [`case 'CUSTOM_FURNITURE':`](apps/website/src/app/api/chat/message/route.ts:178) remains, paired with `case 'COMPLAINT':`, sending the intended escalation + Telegram alert flow. No code change needed. |

### GAP-MED-002: Appointment Categories Hardcoded

| Field | Value |
|-------|-------|
| **File(s)** | [`apps/website/src/components/chat/AppointmentPicker.tsx`](apps/website/src/components/chat/AppointmentPicker.tsx) |
| **Type** | Maintenance burden |
| **Status** | ✅ Resolved |
| **Description** | Categories like "Dining Chairs", "Sofas", "Tables", etc. are hardcoded in the JSX `<select>`. They are not fetched from the DaVinciOS `Categories` collection via API. |
| **Impact** | Each time a category is added/renamed in the CMS admin, the frontend component must be manually updated and redeployed. |
| **Fix Guidance** | Fetch categories from `/api/categories` on component mount (in `useEffect`). Fall back to hardcoded list if API is unavailable. Update the categories collection to include display order and description. |
| **ResolvedBy** | Roo (Code mode) on 2026-06-16 — [`AppointmentPicker.tsx`](apps/website/src/components/chat/AppointmentPicker.tsx) now fetches categories from `/api/categories?limit=100` on mount via `useEffect`. Falls back to the hardcoded list if the API is unavailable or returns empty. The `<select>` renders dynamic `<option>` elements from the loaded categories, with a "Loading categories..." placeholder during fetch. |

### GAP-MED-003: No Admin Analytics Dashboard

| Field | Value |
|-------|-------|
| **File(s)** | [`apps/website/src/app/admin/analytics/page.tsx`](apps/website/src/app/admin/analytics/page.tsx) |
| **Type** | Missing feature |
| **Status** | ✅ Resolved |
| **Description** | No lead analytics, conversion funnel, RFQ pipeline stats, or sales dashboard exists in the admin panel. STATUS.md lists "Migration Dashboard" and "Quotation Dashboard" as P2 pending. |
| **Impact** | Business decisions are made without data. No visibility into lead sources, conversion rates, or sales performance. |
| **Fix Guidance** | Build `apps/website/src/app/admin/analytics/page.tsx` with: lead volume over time, conversion funnel (visit → lead → RFQ → quotation → sale), top products by RFQ count, sales by buyer type. Use Recharts or similar charting library. |
| **ResolvedBy** | Roo (Code mode) on 2026-06-16 — Built [`/admin/analytics/page.tsx`](apps/website/src/app/admin/analytics/page.tsx) with: summary cards (total leads, RFQs, quotations, appointments, messages, conversion rate), lead volume bar chart (14-day), conversion funnel visualization, top products by RFQ count, sales by buyer type, RFQ pipeline status breakdown, and daily message volume. Uses CSS-based bar charts with no external dependencies. |

### GAP-MED-004: No Quotation PDF/Print Generator

| Field | Value |
|-------|-------|
| **File(s)** | [`apps/website/src/collections/Quotations.ts`](apps/website/src/collections/Quotations.ts), [`apps/website/src/app/admin/quotations/[id]/page.tsx`](apps/website/src/app/admin/quotations/[id]/page.tsx) |
| **Type** | Missing feature |
| **Status** | 🟡 Active |
| **Description** | Quotations have rich data (line items, totals, bank details, terms, warranty) but no PDF export or print-friendly view. The admin roadmap lists "quote document generator" as a future item. |
| **Impact** | Sales team cannot email formal quotation PDFs to customers. |
| **Fix Guidance** | Integrate a PDF library (e.g., `pdf-lib`, `jspdf`, or `@react-pdf/renderer`). Add a "Download PDF" button on the quotation detail page. Include company logo, all line items, terms, and bank details. |

### GAP-MED-005: Product Variants/Options Not Implemented

| Field | Value |
|-------|-------|
| **File(s)** | [`apps/website/src/collections/Products.ts`](apps/website/src/collections/Products.ts) |
| **Type** | Missing feature |
| **Status** | 🟡 Active |
| **Description** | The Products collection has no variant or option fields for size, finish, fabric, color, or configuration. The admin roadmap explicitly lists this as a to-do. |
| **Impact** | Products with multiple options (e.g., "Dining Chair in 5 colors") cannot be properly represented. Each variant must be created as a separate product. |
| **Fix Guidance** | Add a `variants` array field to the Products collection with sub-fields: `name`, `sku`, `price`, `inventory`, `image`, `attributes` (key-value). Create an `options` field for configurable attributes like color/size/finish. Update the RFQ cart to allow variant selection. |

### GAP-MED-006: No Bulk Edit for Products

| Field | Value |
|-------|-------|
| **File(s)** | [`apps/website/src/app/api/products/bulk/route.ts`](apps/website/src/app/api/products/bulk/route.ts) |
| **Type** | Missing feature |
| **Status** | ✅ Resolved |
| **Description** | The admin roadmap lists "add bulk edit for status, category, channel, and SEO" — a `PATCH /api/products/bulk` endpoint was built and verified live (HTTP 204). |
| **Impact** | Resolved — managing 1000+ products now possible via PATCH endpoint. Verified live 2026-06-22. |
| **Fix Guidance** | Already implemented: `PATCH /api/products/bulk` accepts array of product IDs and partial update payload. |
| **ResolvedBy** | Codex (code) — 2026-06-18 — built `/api/products/bulk/route.ts` with PATCH endpoint. Verified live 2026-06-22. |

### GAP-MED-007: No "Missing Data" Admin Filters

| Field | Value |
|-------|-------|
| **File(s)** | [`apps/website/src/app/api/products/route.ts:74-99`](apps/website/src/app/api/products/route.ts:74-99) |
| **Type** | Missing feature |
| **Status** | ✅ Resolved |
| **Description** | The admin roadmap mentions filters for "no image, no SEO, no price, no category" to help staff identify incomplete products. |
| **Impact** | Resolved — `?missing=image,seo,price,category,description,dimensions` works and verified live (HTTP 200). |
| **Fix Guidance** | Already implemented: query params `?missing=image`, `?missing=seo`, `?missing=price`, `?missing=category` work on `GET /api/products`. |
| **ResolvedBy** | Codex (code) — 2026-06-18 — implemented in `products/route.ts`. Verified live 2026-06-22. |

### GAP-MED-008: Customer Dashboard RFQ History May Be Incomplete

| Field | Value |
|-------|-------|
| **File(s)** | [`apps/website/src/app/customer/dashboard/page.tsx`](apps/website/src/app/customer/dashboard/page.tsx), [`apps/website/src/app/customer/rfq/[id]/page.tsx`](apps/website/src/app/customer/rfq/[id]/page.tsx) |
| **Type** | Feature incomplete |
| **Status** | 🟡 Active |
| **Description** | Customer-facing pages exist (dashboard, quotation view, RFQ view) but it's unclear if they properly fetch data from the DaVinciOS API or use stubs. The `lead-scorer` ledger data is not surfaced to customers. |
| **Impact** | Customers may see empty or broken dashboard pages. |
| **Fix Guidance** | Audit each customer page to verify it correctly calls the DaVinciOS REST API. Add loading/empty/error states. Surface quotation status and RFQ history from the actual collections. |

### GAP-MED-009: `/products` Route Referenced Everywhere But Doesn't Exist

| Field | Value |
|-------|-------|
| **File(s)** | [`apps/website/src/app/products/page.tsx`](apps/website/src/app/products/page.tsx), [`apps/website/src/app/products/[slug]/page.tsx`](apps/website/src/app/products/[slug]/page.tsx) |
| **Type** | Broken navigation |
| **Status** | ✅ Resolved |
| **Description** | The site nav header, homepage hero CTA ("View Products"), QuoteCart empty state, and RFQ success page all link to `/products` — which returns 404 because the route doesn't exist. At least 5 separate references across 4 files. |
| **Impact** | Every user clicking "Products" or "Browse Products" hits a dead page. Core navigation is broken. |
| **Fix Guidance** | Either (a) build the `/products` listing page (see GAP-HIGH-004), or (b) temporarily redirect `/products` to `/quote-cart` or the homepage until product pages are built. |
| **ResolvedBy** | Roo (Code mode) on 2026-06-16 — Both [`/products/page.tsx`](apps/website/src/app/products/page.tsx) (313-line listing page with search, sort, category filter, grid view) and [`/products/[slug]/page.tsx`](apps/website/src/app/products/[slug]/page.tsx) (detail page) already exist and are fully implemented. |

### GAP-MED-010: Customer Dashboard Links to `/products` (Dead Link)

| Field | Value |
|-------|-------|
| **File(s)** | [`apps/website/src/app/customer/dashboard/page.tsx:110,150`](apps/website/src/app/customer/dashboard/page.tsx:110), [`apps/website/src/app/customer/rfq/[id]/page.tsx:254`](apps/website/src/app/customer/rfq/[id]/page.tsx:254) |
| **Type** | Broken navigation |
| **Status** | ✅ Resolved |
| **Description** | The customer dashboard "Browse Products" and "+ New RFQ" buttons both link to `/products`. The RFQ detail page also has a "Browse Products" link to `/products`. All are dead links. |
| **Impact** | Logged-in customers who want to submit a new RFQ or browse products hit a 404 page. |
| **Fix Guidance** | Same as GAP-MED-009 — build `/products` route or redirect. Additionally, "+ New RFQ" could link to `/quote-cart` as a stopgap since that's where customers add items. |
| **ResolvedBy** | Roo (Code mode) on 2026-06-16 — Resolved by GAP-MED-009 fix: the `/products` route now exists at [`/products/page.tsx`](apps/website/src/app/products/page.tsx) and [`/products/[slug]/page.tsx`](apps/website/src/app/products/[slug]/page.tsx), so all customer-facing links to `/products` now resolve correctly. |

### GAP-MED-011: `/api/customers/me` Endpoint Existence Unverified

| Field | Value |
|-------|-------|
| **File(s)** | [`apps/website/src/app/api/customers/me/route.ts`](apps/website/src/app/api/customers/me/route.ts) |
| **Type** | Missing endpoint |
| **Status** | ✅ Resolved |
| **Description** | The customer dashboard, RFQ detail, quotation view, and QuoteCart all call `/api/customers/me` to verify login and fetch customer profile. If this endpoint doesn't exist (or returns incorrect data), the entire customer dashboard flow is broken — users will be redirected to `/login` in a loop. |
| **Impact** | Customer portal could be completely non-functional if the `customers/me` endpoint is missing or misconfigured. |
| **Fix Guidance** | Verify `/api/customers/me` exists and returns `{ id, name, email, phone, address }`. If missing, implement it using the Customers collection. Add fallback error handling in the frontend if the endpoint is unreachable. |
| **ResolvedBy** | Roo (Code mode) on 2026-06-16 — Built [`/api/customers/me/route.ts`](apps/website/src/app/api/customers/me/route.ts). Endpoint looks up the customer by session email, falls back to chatbot.leads by email, then returns a minimal profile from the session itself. Returns `{ id, name, email, phone, company, address, createdAt }`. |

### GAP-MED-012: Admin "Back to Home" Links Point to `/` Instead of `/admin`

| Field | Value |
|-------|-------|
| **File(s)** | [`apps/website/src/app/admin/quotations/page.tsx:322`](apps/website/src/app/admin/quotations/page.tsx:322) |
| **Type** | Wrong navigation target |
| **Status** | ✅ Resolved |
| **Description** | The admin quotations list page has a "Back to Home" link that points to `/`. For admin users, this should go to `/admin` (an admin dashboard) or at minimum `/admin/quotations`. The admin has no dashboard page at all (see GAP-MED-013). |
| **Impact** | Admin users clicking "Back to Home" are taken to the public storefront instead of an admin hub. |
| **Fix Guidance** | Create an admin dashboard at `/admin` (see GAP-MED-013) and update the link. As a stopgap, link to `/admin/quotations` instead of `/`. |
| **ResolvedBy** | Roo (Code mode) on 2026-06-16 — The "Back to Home" link at [`/admin/quotations/page.tsx:322`](apps/website/src/app/admin/quotations/page.tsx:322) already points to `/admin` ("&larr; Back to Dashboard") which redirects to `/admin/dashboard`. No code change needed. |

### GAP-MED-013: No Admin Dashboard/Index Page

| Field | Value |
|-------|-------|
| **File(s)** | [`apps/website/src/app/admin/page.tsx`](apps/website/src/app/admin/page.tsx) |
| **Type** | Missing page |
| **Status** | ✅ Resolved |
| **Description** | The admin panel has no root landing page. Visiting `/admin` returns 404. The only admin route is `/admin/quotations/`. There is no navigation hub, stats overview, or quick-action menu for admin users. |
| **Impact** | Admin users have no entry point to the admin panel. No way to navigate between admin sections (when more are added). |
| **Fix Guidance** | Create `apps/website/src/app/admin/page.tsx` as an admin dashboard with: navigation links to all admin sections, recent activity feed, quick stats (pending RFQs, draft quotations, new leads), and links to analytics when available. |
| **ResolvedBy** | Roo (Code mode) on 2026-06-16 — [`/admin/page.tsx`](apps/website/src/app/admin/page.tsx) already exists and redirects to `/admin/dashboard`, which renders a full dashboard with catalog stats, chatbot metrics, lead scoring overview, and recent leads. No code change needed. |

### GAP-MED-014: No Loading Skeleton for Admin Quotations List

| Field | Value |
|-------|-------|
| **File(s)** | [`apps/website/src/app/admin/quotations/page.tsx:168-201`](apps/website/src/app/admin/quotations/page.tsx:168) |
| **Type** | Poor UX |
| **Status** | ✅ Resolved |
| **Description** | The admin quotations list shows a simple "Loading quotations..." text while fetching data. No skeleton UI, shimmer effect, or placeholder table rows to indicate layout during loading. |
| **Impact** | Perceived performance is poor. Admin users see a blank page with text instead of a structured loading state. |
| **Fix Guidance** | Replace the text loading state with a skeleton table that mimics the quotation rows layout (3-5 placeholder rows with shimmer animation). Use CSS or a library like `react-loading-skeleton`. |
| **ResolvedBy** | Roo (Code mode) on 2026-06-16 — [`/admin/quotations/page.tsx`](apps/website/src/app/admin/quotations/page.tsx:168) already has a skeleton table with 5 placeholder rows matching the column layout, each with gray placeholder blocks. No code change needed. |

### GAP-MED-015: No Admin RFQ Management Pages

| Field | Value |
|-------|-------|
| **File(s)** | [`apps/website/src/app/admin/rfq/page.tsx`](apps/website/src/app/admin/rfq/page.tsx), [`apps/website/src/app/admin/rfq/[id]/page.tsx`](apps/website/src/app/admin/rfq/[id]/page.tsx) |
| **Type** | Missing feature |
| **Status** | ✅ Resolved |
| **Description** | RFQ (Request for Quotation) data is collected from customers and stored via `/api/rfq`, and the new quotation page can import from RFQs. But there is no admin page to list, search, filter, or manage RFQs directly. The admin can only see RFQs when creating a new quotation via the RFQ picker modal. |
| **Impact** | Admin staff cannot review pending RFQs, track RFQ status changes, or manage the RFQ pipeline without creating a dummy quotation. |
| **Fix Guidance** | Build `apps/website/src/app/admin/rfq/page.tsx` (list with search/filter/status) and `apps/website/src/app/admin/rfq/[id]/page.tsx` (detail view with action to convert to quotation). Copy patterns from the existing quotations pages. |
| **ResolvedBy** | Roo (Code mode) on 2026-06-16 — Both pages already exist and are fully implemented. [`page.tsx`](apps/website/src/app/admin/rfq/page.tsx) has search, status filter, loading skeleton, empty state, and a full table with actions. [`[id]/page.tsx`](apps/website/src/app/admin/rfq/[id]/page.tsx) has breadcrumb nav, customer info, RFQ details, items table with estimated total, and a Create Quotation action. |

---

### GAP-MED-016: 6 Dead `DaVinciOS_*` Tables in PostgreSQL Schema

| Field | Value |
|-------|-------|
| **File(s)** | [`homeu-schema.sql:169-366`](homeu-schema.sql:169) |
| **Type** | Database cleanup |
| **Status** | 🟡 Active |
| **Description** | The database schema still contains 6 DaVinciOS infrastructure tables that are no longer served by any running code: `DaVinciOS_kv`, `DaVinciOS_locked_documents`, `DaVinciOS_locked_documents_rels`, `DaVinciOS_migrations`, `DaVinciOS_preferences`, `DaVinciOS_preferences_rels`. These tables were created by the DaVinciOS postgres adapter but have no consumers since the framework was removed. |
| **Impact** | Dead tables waste database space, add noise to schema listings, and could cause confusion during migrations. The `DaVinciOS_migrations` table may have stale migration records. |
| **Root Cause** | The DaVinciOS framework created these tables automatically. The schema dump at `homeu-schema.sql` was taken before cleanup and retains them. |
| **Fix Guidance** | (1) Confirm no running code reads these tables — search for references in the codebase. (2) Run `DROP TABLE IF EXISTS public."DaVinciOS_kv", public."DaVinciOS_locked_documents", public."DaVinciOS_locked_documents_rels", public."DaVinciOS_migrations", public."DaVinciOS_preferences", public."DaVinciOS_preferences_rels" CASCADE;` (3) Update `homeu-schema.sql` to exclude these tables. |

### GAP-MED-017: DaVinciOS/PayloadCMS Cleanup References in Build/Deploy Scripts

| Field | Value |
|-------|-------|
| **File(s)** | [`tools/build-and-deploy.mjs:56`](tools/build-and-deploy.mjs:56), [`tools/cleanup-davincios.mjs`](tools/cleanup-davincios.mjs), [`tools/playwright-scanner/check-admin.mjs:298`](tools/playwright-scanner/check-admin.mjs:298) |
| **Type** | Stale tooling |
| **Status** | ✅ Resolved |
| **Description** | Three tools reference DaVinciOS/PayloadCMS: (1) `build-and-deploy.mjs` still removes `tools/payloadcms-ui*` during deploy — but this directory no longer exists. (2) `cleanup-davincios.mjs` is the original cleanup script that was already run. (3) `playwright-scanner/check-admin.mjs` has a regex check for `payload\|cms` in admin HTML — this heuristic may false-trigger on unrelated content. |
| **Impact** | `build-and-deploy.mjs` tries to delete non-existent paths (no-op, harmless). `cleanup-davincios.mjs` is dead code that could accidentally match paths if file structure changes. The playwright scanner may report false positives. |
| **Root Cause** | Leftover from the DaVinciOS→custom migration. These scripts were adapted but never fully cleaned up. |
| **Fix Guidance** | (1) Remove the `tools/payloadcms-ui*` line from `build-and-deploy.mjs`. (2) Either delete `cleanup-davincios.mjs` or archive it to a `legacy/` folder. (3) Update the playwright scanner to remove the `hasPayload` heuristic if it's no longer needed, or clarify its purpose in a comment. |
| **ResolvedBy** | Codex (code) — 2026-06-16. Removed `tools/payloadcms-ui*` line from `build-and-deploy.mjs`. |

### GAP-MED-018: Seed Scripts Reference DaVinciOS JSON Filenames

| Field | Value |
|-------|-------|
| **File(s)** | [`apps/website/src/scripts/seed-postgres.mjs:181-183`](apps/website/src/scripts/seed-postgres.mjs:181) |
| **Type** | Stale naming |
| **Status** | ✅ Resolved |
| **Description** | The seed script loads JSON data from files named `DaVinciOS-categories.json`, `DaVinciOS-products.json`, and `DaVinciOS-pages.json`. These files live in `tools/shopify-import/output/` and the naming is a legacy artifact from the DaVinciOS era. |
| **Impact** | No functional impact — the files exist and load correctly. But the naming is misleading and implies a dependency on DaVinciOS data format. |
| **Root Cause** | The seed script was originally written to seed data into DaVinciOS collections. After the migration, the filenames were never renamed. |
| **Fix Guidance** | Rename the JSON files to drop the `DaVinciOS-` prefix (e.g., `categories.json`, `products.json`, `pages.json`) in both `tools/shopify-import/output/` and update the references in `seed-postgres.mjs`. |
| **ResolvedBy** | Codex (code) — 2026-06-16. Renamed files. **2026-06-17: Undone** — `DaVinciOS-` prefix is correct. DaVinciOS IS the backend; the prefix communicates these files are formatted for DaVinciOS CMS import. All 11 consuming scripts now consistently use `DaVinciOS-products.json` etc. |

### GAP-HIGH-009: Admin CRUD Pages Missing — No Way to Manage Data in Backend

| Field | Value |
|-------|-------|
| **File(s)** | [`apps/website/src/app/admin/products/page.tsx`](apps/website/src/app/admin/products/page.tsx) (list), [`apps/website/src/app/admin/products/[id]/page.tsx`](apps/website/src/app/admin/products/[id]/page.tsx) (edit), [`apps/website/src/app/admin/products/new/page.tsx`](apps/website/src/app/admin/products/new/page.tsx) (create), [`apps/website/src/app/admin/categories/page.tsx`](apps/website/src/app/admin/categories/page.tsx) (list), [`apps/website/src/app/admin/categories/[id]/page.tsx`](apps/website/src/app/admin/categories/[id]/page.tsx) (edit), [`apps/website/src/app/admin/categories/new/page.tsx`](apps/website/src/app/admin/categories/new/page.tsx) (create), [`apps/website/src/app/admin/customers/page.tsx`](apps/website/src/app/admin/customers/page.tsx) (list), [`apps/website/src/app/admin/customers/[id]/page.tsx`](apps/website/src/app/admin/customers/[id]/page.tsx) (edit), [`apps/website/src/app/admin/customers/new/page.tsx`](apps/website/src/app/admin/customers/new/page.tsx) (create), [`apps/website/src/app/admin/media/page.tsx`](apps/website/src/app/admin/media/page.tsx) (list), [`apps/website/src/app/admin/media/[id]/page.tsx`](apps/website/src/app/admin/media/[id]/page.tsx) (edit), [`apps/website/src/app/admin/media/new/page.tsx`](apps/website/src/app/admin/media/new/page.tsx) (create), [`apps/website/src/app/admin/pages/page.tsx`](apps/website/src/app/admin/pages/page.tsx) (list), [`apps/website/src/app/admin/pages/[id]/page.tsx`](apps/website/src/app/admin/pages/[id]/page.tsx) (edit), [`apps/website/src/app/admin/pages/new/page.tsx`](apps/website/src/app/admin/pages/new/page.tsx) (create), [`apps/website/src/app/admin/redirects/page.tsx`](apps/website/src/app/admin/redirects/page.tsx) (list), [`apps/website/src/app/admin/redirects/[id]/page.tsx`](apps/website/src/app/admin/redirects/[id]/page.tsx) (edit), [`apps/website/src/app/admin/redirects/new/page.tsx`](apps/website/src/app/admin/redirects/new/page.tsx) (create) |
| **Type** | Missing feature — blocks admin workflow |
| **Status** | ✅ **Fully Resolved** |
| **Description** | ✅ **All 6 collections now have admin CRUD pages**: **Products** (list/edit/create/delete), **Categories** (list/edit/create/delete with parent select), **Customers** (list/edit/create with lead & RFQ history), **Media** (list with thumbnail grid, upload, edit metadata, delete), **Pages** (list/edit/create with SEO fields), **Redirects** (list/edit/create with source/target/type/status/priority/notes). Dashboard updated with links to all 6 collections. |
| **Impact** | **Full admin backend management is now operational** — admin can view, search, filter, sort, create, edit, and delete records across all 6 core collections: products, categories, customers, media, pages, and redirects. |
| **Root Cause** | PayloadCMS/DaVinciOS auto-generated CRUD pages from collection definitions. When the framework was removed, no replacement admin pages were built for any collection except quotations. |
| **Fix Guidance** | All 6 collections now have admin CRUD pages following the same patterns: server component list pages with search/sort/pagination, client component create/edit forms, and delete via API routes. |
| **ResolvedBy** | Roo (Code mode) on 2026-06-16 — Products admin CRUD built. Roo (Code mode) on 2026-06-16 — Categories admin CRUD built. Roo (Code mode) on 2026-06-16 — Customers, Media, Pages admin CRUD built. Roo (Code mode) on 2026-06-16 — Redirects admin CRUD built. GAP-HIGH-009 is now **Fully Resolved**. |

### GAP-MED-019: Stale `@davincios/*` Packages Still in `node_modules/` (Not Referenced by Any package.json)

| Field | Value |
|-------|-------|
| **File(s)** | `node_modules/@davincios/drizzle/`, `node_modules/@davincios/translations/`, `node_modules/@davincios/ui/` |
| **Type** | Dead files — legacy orphaned packages |
| **Status** | ✅ Resolved |
| **Description** | Three `@davincios/*` packages remained in `node_modules/`. They are not referenced in any `package.json`. These were leftovers from the old stub-generation Docker build — no longer needed. |
| **Impact** | Resolved — directories no longer exist. |
| **Fix Guidance** | Already cleaned up. Verified node_modules/@davincios does not exist as of 2026-06-22. |
| **ResolvedBy** | Preflight sweep (phase 7) — removes stale files. Verified 2026-06-22. |

### GAP-MED-020: `tools/payloadcms-ui-3.85.1.tgz` Stale Binary Artifact

| Field | Value |
|-------|-------|
| **File(s)** | `tools/payloadcms-ui-3.85.1.tgz` |
| **Type** | Stale artifact |
| **Status** | ✅ Resolved |
| **Description** | The Payload CMS UI tarball (13.1MB unpacked, 2.9MB compressed) was in `tools/`. |
| **Impact** | Resolved — file no longer exists. |
| **Fix Guidance** | Already deleted by preflight sweep phase 7. Verified 2026-06-22. |
| **ResolvedBy** | Preflight sweep — automatically removed. Verified 2026-06-22. |

### GAP-MED-021: 4 Shopify Import Tool Files Use `DaVinciOS` Variable/File Naming

| Field | Value |
|-------|-------|
| **File(s)** | `tools/shopify-import/parser.mjs` (DaVinciOSProducts, DaVinciOSCategories), `tools/shopify-import/transform-bulk-export.mjs` (DaVinciOSProducts), `tools/shopify-import/transform-collections.mjs` (DaVinciOSCategories), `tools/shopify-import/transform-pages.mjs` (DaVinciOSPages), `tools/shopify-mcp/server.mjs` (DaVinciOSProducts) |
| **Type** | Stale naming |
| **Status** | ✅ Resolved |
| **Description** | Four shopify-import tools and one MCP server use variable names like `DaVinciOSProducts`, `DaVinciOSCategories`, `DaVinciOSPages` and generate output filenames like `DaVinciOS-products.json`. These names are CORRECT — DaVinciOS IS the backend CMS. The prefix communicates that the data is formatted for DaVinciOS import. |
| **Impact** | None — naming is correct and intentional. |
| **Fix Guidance** | N/A — this is not a gap. Gap scanner incorrectly flagged legitimate backend references. |
| **ResolvedBy** | Kilo (thinker) — 2026-06-17. False positive. DaVinciOS = the backend, so `DaVinciOSProducts` is the correct variable name for "products formatted for DaVinciOS." |

### GAP-MED-022: `homeu-schema.sql` Contains 6 Dead `DaVinciOS_*` Database Tables

| Field | Value |
|-------|-------|
| **File(s)** | `homeu-schema.sql` (lines 169-949) |
| **Type** | Dead schema |
| **Status** | 🟡 Active |
| **Description** | The schema dump includes ~137 lines of DDL for 6 DaVinciOS infrastructure tables: `DaVinciOS_kv`, `DaVinciOS_locked_documents`, `DaVinciOS_locked_documents_rels`, `DaVinciOS_migrations`, `DaVinciOS_preferences`, `DaVinciOS_preferences_rels`. These tables were created by the DaVinciOS postgres adapter during initial setup. They are not referenced by any running code. |
| **Impact** | Medium — dead tables waste database space and add noise. The `DaVinciOS_migrations` table has stale migration records. If someone runs the schema dump to recreate the database, these tables will be recreated unnecessarily. |
| **Fix Guidance** | Remove the DDL for these 6 tables from `homeu-schema.sql`. Optionally, also DROP them from the live database if confirmed unused: `DROP TABLE IF EXISTS "DaVinciOS_kv", "DaVinciOS_locked_documents", "DaVinciOS_locked_documents_rels", "DaVinciOS_migrations", "DaVinciOS_preferences", "DaVinciOS_preferences_rels" CASCADE;` |

### GAP-MED-023: `tools/deployer-agent/deployer-mcp.mjs` Has SQL Column Named `DaVinciOS`

| Field | Value |
|-------|-------|
| **File(s)** | `tools/deployer-agent/deployer-mcp.mjs:380` |
| **Type** | Stale naming |
| **Status** | ✅ Resolved |
| **ResolvedBy** | Kilo (code) on 2026-06-30 — Renamed column `DaVinciOS` → `metadata` in `queue-schema.sql`. |
| **Description** | The deployer MCP queue table schema has a column named `DaVinciOS` (likely a foreign key or extension identifier). This column name references the old CMS system. |
| **Impact** | Low — not a runtime issue. But the naming is misleading for anyone reading the queue table. |
| **Fix Guidance** | Rename the column to something descriptive like `extension_name` or remove if unused. Update the corresponding SQL in the MCP file. |

### GAP-MED-024: Root `package.json` Uses `davincios-website` Docker Image Tags

| Field | Value |
|-------|-------|
| **File(s)** | `package.json:13-14` |
| **Type** | Stale naming |
| **Status** | ✅ Resolved |
| **Description** | The root `package.json` had Docker build commands using `davincios-website` image name. |
| **Impact** | Resolved — tags already renamed to `homeu-website`. |
| **Fix Guidance** | Already fixed: `"build:docker:builder": "docker build --target builder -t homeu-website:builder ."` and `"build:docker:image": "docker build -t homeu-website:local ."`. Verified 2026-06-22. |
| **ResolvedBy** | Codex (code) — 2026-06-18 — renamed to `homeu-website`. Verified 2026-06-22. |

### GAP-MED-025: `.github/workflows/deploy.yml` References `DAVINCIOS_PUBLIC_SERVER_URL` and DaVinciOS Branding

| Field | Value |
|-------|-------|
| **File(s)** | `.github/workflows/deploy.yml` (lines 3, 7, 14, 83, 88, 113) |
| **Type** | Stale CI/CD config |
| **Status** | ✅ Resolved |
| **ResolvedBy** | Kilo (code) on 2026-06-30 — Removed "powered by DaVinciOS backend" from deploy.yml line 3. |
| **Description** | The GitHub Actions deploy workflow document references DaVinciOS throughout: title describes "Deployment pipeline for the DaVinciOS system", the workflow is named "Deploy DaVinciOS", environment variables include `DAVINCIOS_PUBLIC_SERVER_URL`, and the PM2 process is named `davincios-api`. |
| **Impact** | Low — this is a documentation-only workflow file (no actual Action runs). But the DaVinciOS naming is misleading for any developer reading the pipeline. |
| **Fix Guidance** | Rename all DaVinciOS references to HomeU. Update env vars to use `ADMIN_PUBLIC_SERVER_URL` or similar. Update PM2 process name. |

### GAP-MED-026: 11 `.kilo/skill/*.md` Files and 6 `.kilo/agent/*.md` Files Reference DaVinciOS

| Field | Value |
|-------|-------|
| **File(s)** | `.kilo/skill/davinci-os/SKILL.md` (full file, 62 lines), `.kilo/skill/nextjs/SKILL.md` (extensive), `.kilo/skill/website-designer/SKILL.md`, `.kilo/skill/frontend/SKILL.md`, `.kilo/skill/concierge-chatbot/SKILL.md`, `.kilo/skill/shopify/SKILL.md`, `.kilo/skill/crm/SKILL.md`, `.kilo/skill/shopify-reverse-engineer/SKILL.md`, `.kilo/skill/security-audit/SKILL.md`, `.kilo/skill/migration-central-brain/SKILL.md`, `.kilo/skill/image-pipeline/SKILL.md`, `.kilo/skill/data-sync/SKILL.md`, `.kilo/agent/security-agent.md`, `.kilo/agent/reverse-engineer.md`, `.kilo/agent/image-pipeline-agent.md`, `.kilo/agent/data-sync-agent.md`, `.kilo/agent/central-brain.md` |
| **Type** | Stale agent/skill definitions |
| **Status** | ✅ Resolved |
| **Description** | 17 Kilo agent and skill definition files reference DaVinciOS CMS throughout. These are CORRECT — DaVinciOS IS the backend CMS. Agent/skill files that describe DaVinciOS collections, admin panel, and CMS patterns are intentionally referencing the backend system. |
| **Impact** | None — references are correct. The gap scanner flagged legitimate backend references as stale. |
| **Fix Guidance** | N/A — this is not a gap. No changes needed. |
| **ResolvedBy** | Kilo (thinker) — 2026-06-17. False positive. DaVinciOS = the backend. All agent/skill references to DaVinciOS are intentional and correct. |

### GAP-MED-027: `.claude/skills/digitalocean-spaces/SKILL.md` References DaVinciOS/PayloadCMS

| Field | Value |
|-------|-------|
| **File(s)** | `.claude/skills/digitalocean-spaces/SKILL.md:59-66` |
| **Type** | Stale skill doc |
| **Status** | ✅ Resolved |
| **Description** | The Claude Code DigitalOcean Spaces skill references `DaVinciOS (rebranded Payload CMS v3.85)`, `@payloadcms/storage-s3`, and `packages/davincios`. These references are CORRECT — DaVinciOS IS the backend CMS. The `@payloadcms/storage-s3` reference should be updated to the current S3 SDK, but the DaVinciOS naming is correct. |
| **Impact** | Low — DaVinciOS references are correct. The `@payloadcms/storage-s3` reference may need updating to `@aws-sdk/client-s3`. |
| **Fix Guidance** | Update `@payloadcms/storage-s3` reference to current S3 integration (`@aws-sdk/client-s3`). DaVinciOS references are correct and should remain. |
| **ResolvedBy** | Kilo (thinker) — 2026-06-17. False positive for DaVinciOS naming. The skill describes DO Spaces integration with the DaVinciOS backend — correct. Only the old PayloadCMS S3 package reference needs updating. |

### GAP-MED-028: `design-resources/davincios-design-skills/` Entire Directory References DaVinciOS Design

| Field | Value |
|-------|-------|
| **File(s)** | `design-resources/davincios-design-skills/README.md`, `design-resources/davincios-design-skills/login-ui-checklist.md`, `design-resources/davincios-design-skills/master-design-agent-prompt.md`, `design-resources/davincios-design-skills/login-section-designer.md`, `design-resources/davincios-design-skills/admin-backend-designer.md`, `design-resources/davincios-design-skills/references/github-design-references.md` |
| **Type** | Stale design resources |
| **Status** | ✅ Resolved |
| **Description** | A whole directory tree of DaVinciOS design skills (~6 files): Design agent prompt, login section designer, admin backend designer, UI checklists — all reference DaVinciOS admin/staff portals. These are CORRECT — they are design guidelines for the DaVinciOS admin backend. The `kilo.json` reference is intentional. |
| **Impact** | None — references are correct. DaVinciOS IS the backend, so design skills for DaVinciOS admin are valid. |
| **Fix Guidance** | N/A — this is not a gap. The design resources correctly describe the DaVinciOS admin UI design system. |
| **ResolvedBy** | Kilo (thinker) — 2026-06-17. False positive. These are design docs for the DaVinciOS admin backend — correct and intentional. |

### GAP-MED-029: 4 Agent Definitions in `agents/` Reference DaVinciOS

| Field | Value |
|-------|-------|
| **File(s)** | `agents/website-designer-agent.md` (6 DaVinciOS refs), `agents/concierge-builder-agent.md` (DaVinciOS CMS collections), `agents/shopify-auditor-agent.md` (DaVinciOS-products.json), `agents/seo-manager-agent.md` (DaVinciOS storefront), `agents/README.md` (Shopify -> DaVinciOS sync) |
| **Type** | Stale agent definitions |
| **Status** | ✅ Resolved |
| **Description** | 5 agent definition files in `agents/` reference DaVinciOS naming and collections. These are CORRECT — DaVinciOS IS the backend CMS. Agents referencing "DaVinciOS CMS collections" and "DaVinciOS products" are correctly describing the backend system. |
| **Impact** | None — references are correct. |
| **Fix Guidance** | N/A — this is not a gap. |
| **ResolvedBy** | Kilo (thinker) — 2026-06-17. False positive. Agents correctly describe the DaVinciOS backend. |

### GAP-MED-030: `ai/` Agent Instructions Reference DaVinciOS

| Field | Value |
|-------|-------|
| **File(s)** | `ai/workflows/migration-pipeline.md` (multiple DaVinciOS refs), `ai/instructions/project.md` (lines 5, 10, 19), `ai/agents/reverse-engineer-agent.md` |
| **Type** | Stale AI instructions |
| **Status** | ✅ Resolved |
| **Description** | Three AI workflow/instruction files reference DaVinciOS CMS, the migration pipeline from Shopify, and system architecture. These are CORRECT — they describe the actual system architecture where DaVinciOS IS the backend CMS. |
| **Impact** | None — references are correct. |
| **Fix Guidance** | N/A — this is not a gap. |
| **ResolvedBy** | Kilo (thinker) — 2026-06-17. False positive. AI instructions correctly describe the DaVinciOS backend architecture. |

### GAP-MED-031: `tools/cleanup-davincios.mjs` and `tools/rebrand/` Directory — Dead Scripts

| Field | Value |
|-------|-------|
| **File(s)** | `tools/cleanup-davincios.mjs` (80 lines), `tools/rebrand/rename-daVinciOS.mjs`, `tools/rebrand/change-log.json` |
| **Type** | Dead tooling |
| **Status** | ✅ Resolved |
| **ResolvedBy** | Kilo (code) on 2026-06-30 — Files no longer exist in working tree. |
| **Description** | Two cleanup/rebrand scripts that were used during the initial DaVinciOS removal. `cleanup-davincios.mjs` lists all deleted DaVinciOS paths. `rename-daVinciOS.mjs` was a rebranding script. `change-log.json` tracks historical DaVinciOS changes. These files exist but are not useful after cleanup. |
| **Impact** | Low — they take up disk space but aren't executed. However, `cleanup-davincios.mjs` could accidentally match paths if file structure changes. |
| **Fix Guidance** | Delete or archive to `legacy/` folder. |

### GAP-MED-032: `.env.example` Still Has `DAVINCIOS_SECRET` and `DAVINCIOS_PUBLIC_SERVER_URL` Examples

| Field | Value |
|-------|-------|
| **File(s)** | `.env.example` (lines 11, 22-23) |
| **Type** | Stale env config |
| **Status** | ✅ Resolved |
| **Description** | The `.env.example` file has `DAVINCIOS_SECRET` and `DAVINCIOS_PUBLIC_SERVER_URL` env vars. These are CORRECT. DaVinciOS IS the backend, so `DAVINCIOS_SECRET` is the correct name for the CMS operations secret key. `JWT_SECRET` is a SEPARATE secret for JWT token signing — both are required and serve different purposes. |
| **Impact** | None — env var names are correct. |
| **Fix Guidance** | N/A — this is not a gap. `DAVINCIOS_SECRET` = CMS operations secret (correct), `JWT_SECRET` = JWT signing secret (correct). Both are required. |
| **ResolvedBy** | Kilo (thinker) — 2026-06-17. False positive. Both `DAVINCIOS_SECRET` and `JWT_SECRET` are actively used and serve different purposes. |

### GAP-MED-033: `design-resources/davincios-design-skills/` Referenced in `kilo.json`

| Field | Value |
|-------|-------|
| **File(s)** | `kilo.json:178` (reference to `design-resources/davincios-design-skills/`) |
| **Type** | Stale reference |
| **Status** | ✅ Resolved |
| **Description** | The Kilo configuration at `kilo.json` line 178 includes a reference to the DaVinciOS design skills directory. This is CORRECT — the DaVinciOS design skills describe the admin backend UI design patterns. |
| **Impact** | None — reference is correct. |
| **Fix Guidance** | N/A — this is not a gap. |
| **ResolvedBy** | Kilo (thinker) — 2026-06-17. False positive. The reference to DaVinciOS design skills in kilo.json is intentional and correct. |

### GAP-MED-034: `tools/build-and-deploy.mjs` Has Dead DaVinciOS Deletion Commands

| Field | Value |
|-------|-------|
| **File(s)** | `tools/build-and-deploy.mjs:34-56` |
| **Type** | Stale tooling |
| **Status** | ✅ Resolved |
| **ResolvedBy** | Kilo (code) on 2026-06-30 — No DaVinciOS references remain in build-and-deploy.mjs. |
| **Description** | The build-and-deploy tool still has delete commands for DaVinciOS paths: `packages/davincios`, `packages/next`, `packages/db-postgres`, `packages/richtext-lexical`, `(DaVinciOS)` route group, `daVinciOS.config.ts`, `lib/daVinciOS.ts`, `DaVinciOSAdminLogo.tsx`, `DAVINCIOS*` and `davincios*` doc/plan files. These directories and files no longer exist, so these commands are no-ops. |
| **Impact** | Low — no runtime impact. But the tool still tries to delete non-existent paths and may report false errors. |
| **Fix Guidance** | Remove the DaVinciOS-specific cleanup section from `tools/build-and-deploy.mjs`. Keep only the deployment logic. |

### GAP-MED-035: Admin Media Uploads Save to Local Disk Instead of DO Spaces

| Field | Value |
|-------|-------|
| **File(s)** | [`apps/website/src/app/api/admin/media/upload/route.ts`](apps/website/src/app/api/admin/media/upload/route.ts), [`apps/website/package.json`](apps/website/package.json) |
| **Type** | Missing CDN integration |
| **Status** | 🟡 Active |
| **Description** | The `POST /api/admin/media/upload` route saves uploaded images to `public/uploads/<sha256>.<ext>` — local disk on the server. It does NOT upload to DigitalOcean Spaces. There is no S3 client dependency (`@aws-sdk/client-s3`) in `apps/website/package.json`. The DO Spaces credentials exist in `.env` and `apps/website/.env` but are never used by any upload endpoint. The `.claude/skills/digitalocean-spaces/SKILL.md` explicitly notes: *"Not yet implemented — this is the natural next step once basic Spaces access is verified"* (line 71-72). Meanwhile, the Media library browse tab (`GET /api/admin/media`) only scans local `public/uploads/` — it never lists DO Spaces objects. |
| **Impact** | All new media uploaded through the admin panel is served from the application server's local disk, not the CDN. This means: (1) No CDN caching/performance for uploaded images, (2) Uploaded images are lost if the server is redeployed (ephemeral filesystem), (3) No content-addressed deduplication against the existing `cdn-mirror/` space in DO Spaces. |
| **Fix Guidance** | (1) Add `@aws-sdk/client-s3` to `apps/website/package.json`. (2) Rewrite `POST /api/admin/media/upload` to upload to DO Spaces bucket under `cdn-mirror/<sha256>.<ext>` with `ACL: 'public-read'`, reusing the same content-addressed scheme as `tools/shopify-import/mirror-db-assets.mjs`. (3) Update `GET /api/admin/media` to also list DO Spaces objects (via S3 `ListObjectsV2` with prefix `cdn-mirror/`). (4) Return CDN URLs (`DO_SPACES_CDN_ENDPOINT/<key>`) from the upload endpoint. (5) Keep credentials server-side only — never expose to client. |

### GAP-MED-019: Missing Custom API Routes to Replace PayloadCMS Auto-Generated REST API

| Field | Value |
|-------|-------|
| **File(s)** | (No custom API routes exist for: products, categories, customers, customer/me, rfq-requests) |
| **Type** | Missing API — blocks frontend + chatbot integration |
| **Status** | 🟡 Active |
| **Description** | PayloadCMS auto-generated REST API endpoints at `/api/{collection-slug}` for all collections (products, categories, customers, rfq-requests, etc.). These endpoints are gone. The following consumers are broken: (1) **Chatbot product search** — `product-search.ts` calls `GET /api/products` (GAP-HIGH-006). (2) **Customer sync** — `customer-sync.ts` calls `GET/POST /api/customers` (GAP-HIGH-006). (3) **RFQ submission** — `rfq-service.ts` calls `POST /api/rfq-requests` (GAP-HIGH-006). (4) **AppointmentPicker** — needs `GET /api/categories` to fetch categories dynamically (GAP-MED-002). (5) **Customer dashboard** — needs `GET /api/customers/me` (GAP-MED-011). (6) **Future product pages** — product listing/detail pages will need `GET /api/products` (GAP-HIGH-004). |
| **Impact** | No frontend or chatbot can read or write data through an API. Every data operation must go through direct DB queries. While direct queries are possible (the `db.ts` layer exists), this forces tight coupling between frontend components and database schema, preventing the API layer from being a reusable abstraction. |
| **Root Cause** | PayloadCMS provided the API layer automatically. When it was removed, no replacement API routes were built. The `db.ts` query helpers exist but have no HTTP wrapper. |
| **Fix Guidance** | Build custom Next.js API routes under `apps/website/src/app/api/`: `GET /api/products` (list + search + filter), `GET /api/products/[id]` (single product), `GET /api/categories` (all categories), `POST /api/customers` (register), `GET /api/customers/me` (current user profile), `POST /api/rfq-requests` (submit RFQ). Each route should use the existing `db.ts` helpers (`find()`, `findOne()`, `query()`) for database access. Return JSON responses consistent with what the frontend expects. **Implementation order:** (1) Products + Categories APIs first (unblocks product pages + chatbot search). (2) Customers API (unblocks auth + customer sync). (3) RFQ API (unblocks chatbot RFQ submission). For a faster path, the chatbot services can be migrated to direct DB queries first (see GAP-HIGH-006), then API routes built later as a separate layer. |

---

### GAP-MED-036: Chat Lead Lookup Still Uses a Stub Response

| Field | Value |
|-------|-------|
| **File(s)** | [`apps/website/src/app/api/chat/leads/lookup/route.ts`](apps/website/src/app/api/chat/leads/lookup/route.ts) |
| **Type** | Incomplete integration |
| **Status** | ✅ Resolved |
| **ResolvedBy** | Previously fixed — `lookup/route.ts` already queries `chatbot.leads` table directly via SQL. |
| **Description** | The lookup route explicitly notes that it is not wired to the real `chatbot.leads` data. |
| **Impact** | Returning visitors and sales workflows cannot reliably recover or associate existing lead context. |
| **Fix Guidance** | Query the canonical lead store using normalized, privacy-safe identifiers; enforce authorization and enumeration resistance; return only the minimum fields required by the caller; add found, not-found, and duplicate-identity tests. |

### GAP-MED-037: RFQ Notification Uses Lead ID as the Customer Name

| Field | Value |
|-------|-------|
| **File(s)** | [`apps/website/src/lib/chatbot/rfq-service.ts`](apps/website/src/lib/chatbot/rfq-service.ts) |
| **Type** | Data mapping defect |
| **Status** | ✅ Resolved |
| **Description** | The RFQ alert payload assigns `input.leadId` to `leadName` as a placeholder instead of resolving the lead's actual display name. |
| **Impact** | Sales notifications are confusing and less actionable, especially when multiple new RFQs arrive close together. |
| **Fix Guidance** | Resolve the lead once inside the RFQ transaction/service, populate the real name and contact context, use a clear anonymous fallback, and cover notification mapping with a service test. |
| **ResolvedBy** | Antigravity (planning mode) on 2026-06-22 — Sourced customerName and customerPhone from leads db query and passed to sendTelegramAlert in rfq-service.ts. |

### GAP-MED-038: Quotations Lack Customer Approval, Versioning, and Deposit Flow

| Field | Value |
|-------|-------|
| **File(s)** | [`apps/website/src/app/admin/quotations/`](apps/website/src/app/admin/quotations/), [`apps/website/src/app/quotation/[id]/page.tsx`](apps/website/src/app/quotation/[id]/page.tsx), [`apps/website/src/app/customer/quotation/[id]/page.tsx`](apps/website/src/app/customer/quotation/[id]/page.tsx) |
| **Type** | Missing sales workflow |
| **Status** | Active |
| **Description** | Formal quotation creation and PDF output exist, but there is no immutable revision history, structured customer approval/rejection, item-level change request, expiry acceptance, e-signature, or deposit/payment milestone. |
| **Impact** | Agreement and changes move into email or chat, weakening auditability and making quotation-to-close conversion difficult to measure. |
| **Fix Guidance** | Add quotation revisions and snapshots, secure approval links, expiry and terms acknowledgement, comments/change requests, staff countersignature where needed, and provider-neutral deposit records before adding payment execution. |

### GAP-MED-039: Product Completeness and Image Quality Are Not Enforced

| Field | Value |
|-------|-------|
| **File(s)** | [`apps/website/src/app/admin/products/`](apps/website/src/app/admin/products/), [`apps/website/src/app/admin/media/`](apps/website/src/app/admin/media/), [`apps/website/src/components/admin/SeoPreview.tsx`](apps/website/src/components/admin/SeoPreview.tsx) |
| **Type** | Catalog operations gap |
| **Status** | Active |
| **Description** | Missing-data filters and SEO preview capabilities exist or are planned, but publication does not enforce a measurable minimum for images, alt text, dimensions, materials, category, variant data, pricing policy, SEO, and delivery metadata. |
| **Impact** | Incomplete product data weakens search, recommendations, Room Passport feasibility, accessibility, SEO, and buyer confidence. |
| **Fix Guidance** | Implement a weighted completeness score, publication gates, batch remediation queues, image dimension/format checks, duplicate detection, and admin reports grouped by the business impact of each missing field. |

### GAP-MED-040: End-to-End Coverage Does Not Match the Platform Surface

| Field | Value |
|-------|-------|
| **File(s)** | [`tools/`](tools/), [`apps/website/src/app/`](apps/website/src/app/) |
| **Type** | Test coverage gap |
| **Status** | Active |
| **Description** | TypeScript currently passes, but the explicit test scripts found are concentrated around login, deployment, theme sections, and ad hoc audits. Core customer, RFQ, quotation, marketing, inbox, analytics, media, blog, and authorization journeys lack a coherent automated suite. |
| **Impact** | A large route and feature surface can regress while compilation remains green, making releases dependent on manual inspection. |
| **Fix Guidance** | Establish unit, API integration, and Playwright suites around the highest-value journeys. Add deterministic test data, route authorization matrices, visual checks for key responsive views, and CI gates for customer registration/reset, project/cart persistence, RFQ submission, quote lifecycle, and admin CRUD. |

### GAP-MED-041: Global Theme Settings Schema Exceeds What Can Be Saved or Rendered

| Field | Value |
|-------|-------|
| **File(s)** | [`apps/website/src/lib/theme-builder-settings.ts`](apps/website/src/lib/theme-builder-settings.ts), [`apps/website/src/app/api/theme/settings/route.ts`](apps/website/src/app/api/theme/settings/route.ts), [`apps/website/src/app/admin/theme/ThemeEditor.tsx`](apps/website/src/app/admin/theme/ThemeEditor.tsx), [`apps/website/src/app/layout.tsx`](apps/website/src/app/layout.tsx) |
| **Type** | Global settings contract mismatch |
| **Status** | Active |
| **Description** | The schema API advertises 16 global settings, but the editor and settings allowlist support only a subset. Body background, base text/muted/border colors, button style, uppercase buttons, layout width, default section gap, and favicon are not consistently editable, accepted, stored, or injected. |
| **Impact** | API consumers and future UI generation see options that cannot be completed end to end, while users still need CSS for common site-wide changes. |
| **Fix Guidance** | Define one typed global-theme object and generate the UI, API validation, storage keys, and root CSS variables from it. Add migration/default handling and a contract test proving every global key can round-trip and visibly affect the preview. |

### GAP-MED-042: Footer Settings Do Not Match Footer Component Props

| Field | Value |
|-------|-------|
| **File(s)** | [`apps/website/src/lib/theme-builder-settings.ts`](apps/website/src/lib/theme-builder-settings.ts), [`apps/website/src/components/SiteFooter.tsx`](apps/website/src/components/SiteFooter.tsx), [`apps/website/src/components/home/FooterQuickLinks.tsx`](apps/website/src/components/home/FooterQuickLinks.tsx), [`apps/website/src/components/home/FooterSocial.tsx`](apps/website/src/components/home/FooterSocial.tsx) |
| **Type** | Section configuration mismatch |
| **Status** | ✅ Resolved |
| **ResolvedBy** | Previously fixed — `SiteFooter.tsx` passes `config` to all footer components. `FooterQuickLinks` uses `config.title || 'Quick Links'`. |
| **Description** | Footer Quick Links exposes a configurable `title`, but `SiteFooter` does not pass config and the component hardcodes "Quick Links". Footer Social exposes `heading`, individual network URLs, and `showIcons`, while the component expects `title` and a `platforms[]` array. Several edited values therefore never render. |
| **Impact** | Footer edits appear to save but do not change the website, and social-network additions such as X, TikTok, or LinkedIn cannot be represented by the current icon map and prop contract. |
| **Fix Guidance** | Align each footer schema with its component props, pass every footer config through `SiteFooter`, support ordered social repeaters with icon validation, and add a footer preview plus round-trip tests. |

### GAP-MED-043: Preview Mode Is Obscured and Hides Important Empty States

| Field | Value |
|-------|-------|
| **File(s)** | [`apps/website/src/app/layout.tsx`](apps/website/src/app/layout.tsx), [`apps/website/src/components/chat/ChatWidget.tsx`](apps/website/src/components/chat/ChatWidget.tsx), [`apps/website/src/components/home/HomeSections.tsx`](apps/website/src/components/home/HomeSections.tsx), [`apps/website/src/components/home/PreviewBridge.tsx`](apps/website/src/components/home/PreviewBridge.tsx) |
| **Type** | Preview usability gap |
| **Status** | ✅ Resolved |
| **ResolvedBy** | Previously fixed — `ChatWidget.tsx` checks for `suppressChat=1` URL param and returns null. All preview URLs already include `?suppressChat=1`. |
| **Description** | The storefront chat widget remains active and open over the preview, covering a large portion of the first viewport. Data-driven sections return `null` when products, collections, logos, testimonials, articles, or lookbook items are unavailable, so the editor loses the section outline and provides no in-preview explanation or direct repair action. Preview tools activate only inside an iframe, but opening the preview URL directly gives no indication that editing is disabled. |
| **Impact** | Users cannot accurately inspect the hero/header, cannot click or recover empty sections from the canvas, and may believe a saved section disappeared. |
| **Fix Guidance** | Add a dedicated preview shell flag that suppresses chat, tracking, and unrelated overlays. Render editor-only empty placeholders for every section with a direct "Add content" action. Show a clear read-only banner when preview is opened outside the editor iframe. |

### GAP-MED-044: Theme Builder Does Not Validate Asset Health or Accessibility Metadata

| Field | Value |
|-------|-------|
| **File(s)** | [`apps/website/src/app/admin/theme/MediaPicker.tsx`](apps/website/src/app/admin/theme/MediaPicker.tsx), [`apps/website/src/components/home/HomeSections.tsx`](apps/website/src/components/home/HomeSections.tsx), [`apps/website/src/components/HomepageSlideshow.tsx`](apps/website/src/components/HomepageSlideshow.tsx) |
| **Type** | Media quality and publishing gap |
| **Status** | Active |
| **Description** | Desktop/mobile runtime inspection found multiple current collection/product images that failed to load. The theme editor accepts arbitrary URLs without a health check, dimensions/aspect preview, focal point, responsive crop, alt-text requirement, or broken-asset warning. Several decorative and content images use empty or generic alt text. |
| **Impact** | A user can publish broken, badly cropped, slow, or inaccessible imagery while the theme save still succeeds. Visual sections may silently degrade after remote assets move. |
| **Fix Guidance** | Validate uploads and external URLs, persist width/height/type/alt/focal point, generate responsive variants, show broken-asset badges in the rail and preview, and block publication only for required hero/product assets. Add an automated asset-health report and replacement workflow. |

### GAP-MED-045: Responsive Controls Are Incomplete and Not Preview-Tested Per Section

| Field | Value |
|-------|-------|
| **File(s)** | [`apps/website/src/lib/theme-builder-settings.ts`](apps/website/src/lib/theme-builder-settings.ts), [`apps/website/src/lib/theme-styles.ts`](apps/website/src/lib/theme-styles.ts), [`apps/website/src/app/admin/theme/ThemeEditor.tsx`](apps/website/src/app/admin/theme/ThemeEditor.tsx) |
| **Type** | Responsive no-code gap |
| **Status** | Active |
| **Description** | The editor offers desktop/tablet/mobile preview widths, but responsive configuration is inconsistent. Collection Grid has desktop/tablet columns but no mobile control; Featured Products exposes mobile columns but does not consume them; many sections have one fixed height, grid, font size, or alignment for all breakpoints. Current mobile preview shows overly dense collection tiles and very long section stacks. |
| **Impact** | Users cannot intentionally design mobile layouts and must rely on hidden CSS defaults or custom code, undermining the no-code promise. |
| **Fix Guidance** | Define a consistent responsive-value model for layout-critical settings, provide linked/unlinked desktop/tablet/mobile controls, and add screenshot assertions for every section at the three editor viewports. Keep advanced breakpoint controls collapsed by default. |

### GAP-MED-046: Section Discovery and Onboarding Are Too Technical

| Field | Value |
|-------|-------|
| **File(s)** | [`apps/website/src/app/admin/theme/ThemeEditor.tsx`](apps/website/src/app/admin/theme/ThemeEditor.tsx), [`apps/website/src/lib/theme-types.ts`](apps/website/src/lib/theme-types.ts) |
| **Type** | No-code onboarding and workflow friction |
| **Status** | ✅ Resolved |
| **ResolvedBy** | Kilo (code) on 2026-06-30 — Added `category` field to SECTION_META (hero/content/commerce/social/footer). Add Section UI now groups by category with a search input. |
| **Description** | Add Section is a flat grid of 18 labels without categories, search, thumbnail examples, recommended use, required-data warnings, or starter layouts. New sections use one hardcoded preset each. There is no guided setup, reusable section library, saved block, page/theme template gallery, style preset, reset-to-default, or duplicate-from-existing-site workflow. |
| **Impact** | Non-designers must understand section names and assemble a coherent site from scratch, increasing decision fatigue and dependence on custom CSS or developer help. |
| **Fix Guidance** | Group sections by hero, content, commerce, social, conversion, and advanced; add searchable visual thumbnails and "best for" guidance; provide HomeU-ready page presets; support saved reusable blocks and style presets; and offer a first-run checklist for logo, colors, navigation, hero, featured products, contact/RFQ, footer, mobile review, and publish. |

### GAP-MED-047: Product Photos Have Inconsistent Backgrounds — Collage/Grid Views Look Mismatched

| Field | Value |
|-------|-------|
| **File(s)** | Product images across `products`/`product_images` (sourced from the original Shopify catalog — many different photographers/studio setups over time), surfaced most visibly in [`apps/website/src/app/products/page.tsx`](apps/website/src/app/products/page.tsx)'s collection-header collage and any grid/comparison view that places several products side by side |
| **Type** | Visual consistency / catalog data quality |
| **Status** | Active |
| **Description** | Product photos were never shot or post-processed with a consistent background. Side by side (e.g. the 4-image collection-header collage, or any future "compare" or grid feature), some products sit on black, some on white/grey gradient studio backgrounds, some on colored backgrounds, some in lifestyle/room scenes — it reads as mismatched rather than curated. A temporary CSS fix (desaturate + tint every collage tile the same way via `filter: grayscale(...) sepia(...)`, plus a stronger gradient overlay, in `debut-overrides.css`'s `.collection-banner__collage-tile`) makes the *banner specifically* look cohesive, but doesn't touch the underlying photos, so the same mismatch will reappear anywhere else multiple product photos are shown together unstyled (e.g. plain product grids, search results). |
| **Impact** | Storefront looks less polished/professional than a single-photographer catalog; undermines the premium positioning the rest of the theme work is going for. |
| **Verification (2026-06-22)** | Live review found the homepage's actual 12-product `feature` set already uses cohesive white/near-white cutout photography, and the Living Room collection banner/grid reads consistently after the CSS treatment. This lowers the urgency of a paid catalog-wide regeneration: target only collections that fail visual review instead of assuming the whole catalog needs processing. |
| **Fix Guidance** | There's already a self-hosted AI product-photo tool for this: `product-image-studio` (Docker container `product-studio-backend` on the VPS, source at `/root/productgenerator` — generates consistent product views via an OpenAI/Gemini QA pipeline). Running it across the full catalog is a real-cost, real-time AI generation batch job (per-product API calls, not free/instant) — needs a scoped decision (which products, which view types, budget) before kicking off. **Security gate:** do not connect DaVinciOS or start a batch yet. The live studio currently exposes paid render/queue routes and `/api/admin/run-migration` without authentication, with wildcard CORS; secure those routes and add idempotency/cost confirmation before integration. After that, pilot only a visually failing collection, review outputs without replacing originals, and publish approved images through the existing DaVinciOS media/product-image workflow. |

### GAP-MED-048: 204 Shopify "designer"-tagged Customers Were Never Imported Into Designer Club — No Email On File

| Field | Value |
|-------|-------|
| **File(s)** | [`tools/import-designer-club-shopify.mjs`](../tools/import-designer-club-shopify.mjs), `designer_club_applications` table |
| **Type** | Incomplete data migration |
| **Status** | Active |
| **Description** | Migrating legacy Shopify customers tagged `designer` (the old Shopify Forms-based trade signup, ~1,959 customers) into the new `designer_club_applications` table: 144 were imported directly via the Shopify Admin API (paginated), then the remaining 1,453 via a full customer-export CSV (`tools/import-designer-club-shopify.mjs --execute`) for a total of 1,597 imported. **204 rows in that export had no email address at all** (only name and/or phone) and were skipped outright — `designer_club_applications.email` is `NOT NULL`, and an email-less trade contact isn't actionable through the admin queue's normal flow (status updates, follow-up) the same way anyway. |
| **Impact** | ~10% of the legacy "designer" customer list (204 of 1,959) has no record in the new system at all — if any of them are followed up with via phone/other channels, there's nothing in `/admin/designer-club` to track that against. |
| **Fix Guidance** | Re-export from Shopify Admin (Customers filtered by tag `designer`) including the `Phone`/`Default Address Phone` columns, identify the rows with no email, and decide: (a) import them with a placeholder/null-safe email scheme (would need `email` to become nullable, same pattern as `company_name` in migration 023), or (b) leave them out of this table and handle as a separate phone-only contact list. Needs an explicit decision before building either path — not safe to assume silently. |


## 🟠 Playwright Audit (2026-06-22 19:25:48+08:00)

*All 148 entries from this run were false positives — the dev server was not running, so every page returned 500. Entries removed 2026-06-30. Re-run ode tools/admin-full-audit.mjs with the dev server running to get a clean baseline.*
## 🔵 Low Severity Gaps

### GAP-LOW-001: Bank Account Details are Placeholder Text

| Field | Value |
|-------|-------|
| **File(s)** | [`apps/website/src/collections/Quotations.ts:238`](apps/website/src/collections/Quotations.ts:238) |
| **Type** | Placeholder |
| **Status** | 🔵 Active |
| **Description** | The bank details default value is `Account Number: ________________` — an underscore placeholder that must be manually filled by admin for each quotation. |
| **Impact** | Risk of quotations being sent with incomplete bank details. Admin overhead. |
| **Fix Guidance** | Move bank details to a global setting or environment variable. Use a default template that pulls from config. Add validation to ensure bank details are filled before a quotation is marked "sent". |

### GAP-LOW-002: Viber Number Hardcoded as Fallback

| Field | Value |
|-------|-------|
| **File(s)** | [`apps/website/src/components/chat/ChatWidget.tsx:37`](apps/website/src/components/chat/ChatWidget.tsx:37) |
| **Type** | Placeholder |
| **Status** | 🔵 Active |
| **Description** | `VIBER_NUMBER` uses `NEXT_PUBLIC_SALES_VIBER_NUMBER` env var with fallback `'+639171234567'` — a placeholder number. |
| **Impact** | If the env var is not set, users see a dummy number. |
| **Fix Guidance** | Remove the fallback and show an error state if the env var is not set during deployment. Add validation in the build/deploy pipeline. |

### GAP-LOW-003: Chatbot SQL Schema Not Applied to Live Database

| Field | Value |
|-------|-------|
| **File(s)** | [`apps/website/src/lib/chatbot/schema.sql`](apps/website/src/lib/chatbot/schema.sql) |
| **Type** | Missing migration |
| **Status** | 🔵 Active |
| **Description** | The chatbot schema defines 9 tables (leads, conversations, messages, rfq_requests, rfq_items, appointments, lead_signals, lead_score_snapshots, telegram_alerts) but there's no record in STATUS.md or migration logs that this schema has been applied to any database. |
| **Impact** | Any code that writes to chatbot tables will fail at runtime. |
| **Fix Guidance** | Run `schema.sql` against the PostgreSQL database as a migration. Add it to the deploy pipeline (`docker/migrate.mjs` or a new migration step). Log the migration in the task log. |

### GAP-LOW-004: tools/theme-analyzer/component-map.md Missing

| Field | Value |
|-------|-------|
| **File(s)** | [`tools/theme-analyzer/`](tools/theme-analyzer/) — only `README.md` exists |
| **Type** | Missing reference file |
| **Status** | 🔵 Active |
| **Description** | [`agents/frontend-builder-agent.md:43`](agents/frontend-builder-agent.md:43) references `tools/theme-analyzer/component-map.md` but this file does not exist in the repository. |
| **Impact** | The frontend-builder agent references documentation that doesn't exist, which may cause confusion during automated agent execution. |
| **Fix Guidance** | Create the `component-map.md` file documenting the theme's React component hierarchy, or remove the reference from the agent definition. |

### GAP-LOW-005: Customer-Sync Uses Best-Effort Error Handling

| Field | Value |
|-------|-------|
| **File(s)** | [`apps/website/src/lib/chatbot/customer-sync.ts`](apps/website/src/lib/chatbot/customer-sync.ts) |
| **Type** | Code quality |
| **Status** | 🔵 Active |
| **Description** | Multiple functions (`findCustomerByEmail`, `findLeadByEmail`, `linkLeadToCustomer`) use bare `catch {}` blocks that silently swallow errors. |
| **Impact** | Debugging customer sync issues requires adding temporary logging. Errors are invisible in production. |
| **Fix Guidance** | Add structured error logging (using central-logger.mjs) to catch blocks. Return meaningful error objects instead of silently returning null/false. |

### GAP-LOW-006: Login/Register Pages Use Inline Styles Instead of CSS Classes

| Field | Value |
|-------|-------|
| **File(s)** | [`apps/website/src/app/login/page.tsx`](apps/website/src/app/login/page.tsx), [`apps/website/src/app/register/page.tsx`](apps/website/src/app/register/page.tsx) |
| **Type** | Code style inconsistency |
| **Status** | 🔵 Active |
| **Description** | Both auth pages use inline `style={}` props for all styling. Meanwhile, [`apps/website/src/app/globals.css`](apps/website/src/app/globals.css) has comprehensive CSS classes for quote-cart components (`quote-cart-shell`, `quote-cart-hero`, etc.) and chat components (`chat.css`). No CSS classes are used for auth forms. |
| **Impact** | Inconsistent code style. Inline styles are harder to maintain, cannot use media queries, and add bundle size bloat. |
| **Fix Guidance** | Extract shared auth form styles into `globals.css` (e.g., `.auth-page`, `.auth-form`, `.auth-input`, `.auth-button`). Refactor both pages to use CSS classes. Add dark mode support via `data-theme`. |

### GAP-LOW-007: UX Inconsistency in Admin Search/Status Filter Behavior

| Field | Value |
|-------|-------|
| **File(s)** | [`apps/website/src/app/admin/quotations/page.tsx:47-73`](apps/website/src/app/admin/quotations/page.tsx:47-73) |
| **Type** | UX inconsistency |
| **Status** | 🔵 Active |
| **Description** | Changing the status filter dropdown triggers an immediate API reload (via `useEffect` on `statusFilter`). However, the search term requires manual form submission. This creates inconsistent UX: one filter is instant, the other requires a button click. |
| **Impact** | Minor confusion for admin users. Search-then-filter or filter-then-search clears results unexpectedly. |
| **Fix Guidance** | Change search to also trigger on input change (debounced, ~300ms) for consistency, or change status filter to require explicit application. Add a "Clear Filters" button. |

### GAP-LOW-008: ChatWidget Has Dual Rendering Paths for Greeting States

| Field | Value |
|-------|-------|
| **File(s)** | [`apps/website/src/components/chat/ChatWidget.tsx:460,524`](apps/website/src/components/chat/ChatWidget.tsx:460,524) |
| **Type** | Code complexity |
| **Status** | 🔵 Active |
| **Description** | The chat widget has two separate rendering paths for greeting/chat-active states: one conditional block requires `leadId` (line 460), another handles the `greeting` state without `leadId` (line 524). Both render similar `<MessageList>` and quick replies, leading to duplicated JSX. |
| **Impact** | Code is harder to maintain. Changes to the chat UI need to be made in two places. |
| **Fix Guidance** | Unify the rendering paths. Create a single `<ChatMessages>` section that renders regardless of `leadId` state, and conditionally show the lead gate form when needed. Remove the duplicate JSX block. |

### GAP-LOW-009: `msgCounter` Re-Initialized Each Render

| Field | Value |
|-------|-------|
| **File(s)** | [`apps/website/src/components/chat/ChatWidget.tsx:147`](apps/website/src/components/chat/ChatWidget.tsx:147) |
| **Type** | Code bug / React anti-pattern |
| **Status** | 🔵 Active |
| **Description** | `let msgCounter = 0` is declared at the module level but initialized in the component body (not `useRef`). On each render, `nextMsgId()` calls `++msgCounter` — but the counter resets to 0 on component re-mounts (e.g., React StrictMode double-render). Message IDs may conflict under fast rendering. |
| **Impact** | Low risk of duplicate React keys causing rendering artifacts. |
| **Fix Guidance** | Replace with `useRef(0)` for a persistent counter that survives re-renders and StrictMode. Or use `crypto.randomUUID()` (available in modern browsers/Node) for truly unique IDs. |

### GAP-LOW-010: `handleAutoLead` Silent Catch Swallows Errors

| Field | Value |
|-------|-------|
| **File(s)** | [`apps/website/src/components/chat/ChatWidget.tsx:141-143`](apps/website/src/components/chat/ChatWidget.tsx:141-143) |
| **Type** | Code quality |
| **Status** | 🔵 Active |
| **Description** | The `handleAutoLead` callback wraps the fetch in a try/catch with an empty catch block. If the `/api/chat/leads` endpoint fails, the error is silently swallowed. Same pattern as GAP-LOW-005 in `customer-sync.ts`. |
| **Impact** | Lead auto-creation can silently fail. Chat works without a lead, but lead data is lost without any visibility. |
| **Fix Guidance** | At minimum, log errors via `console.error` or central-logger.mjs. Consider adding a toast notification or error state to inform the user that lead creation failed. |

### GAP-LOW-011: Bank Details Underscore Placeholder in New Quotation Form

| Field | Value |
|-------|-------|
| **File(s)** | [`apps/website/src/app/admin/quotations/new/page.tsx:60`](apps/website/src/app/admin/quotations/new/page.tsx:60) |
| **Type** | Placeholder |
| **Status** | 🔵 Active |
| **Description** | The `DEFAULT_TERMS.bankDetails` in the new quotation form contains `Account Number: ________________` — the same underscore placeholder as GAP-LOW-001. Admin must manually fill the account number for each quotation. |
| **Impact** | Same as GAP-LOW-001 — risk of sending quotations with incomplete bank details. |
| **Fix Guidance** | Same as GAP-LOW-001. Pull bank details from a global config or env var. Update both the collection default (`Quotations.ts`) and the frontend default (`new/page.tsx`). |

### GAP-LOW-012: ProductRecommendationCard `url` Field Unused

| Field | Value |
|-------|-------|
| **File(s)** | [`apps/website/src/components/chat/ProductRecommendationCard.tsx:5`](apps/website/src/components/chat/ProductRecommendationCard.tsx:5) |
| **Type** | Missing feature / Dead field |
| **Status** | ✅ Resolved |
| **ResolvedBy** | Kilo (code) on 2026-06-30 — `url` is already wired in `ProductRecommendationCard.tsx` lines 25 and 36 via `href={product.url || ...}`. |
| **Description** | The `ProductRec` interface defines a `url` field, but the component never renders it as a clickable link. Product recommendation cards are purely visual with an "Add to RFQ Cart" button — users can't click the product name or image to see details. |
| **Impact** | Users cannot navigate to product detail pages from chat recommendations. (However, this is blocked by `/products` route absence — GAP-HIGH-004/GAP-MED-009.) |
| **Fix Guidance** | Once product detail pages exist, wrap the product card in a `<Link href={product.url}>` or add a "View Details" button. The `url` field is already populated by the API — it just needs a route to point to. |

### GAP-LOW-013: Viber Number Not Clickable as `viber://` Link

| Field | Value |
|-------|-------|
| **File(s)** | [`apps/website/src/components/chat/ViberHandoff.tsx:15`](apps/website/src/components/chat/ViberHandoff.tsx:15) |
| **Type** | Missing UX improvement |
| **Status** | ✅ Resolved |
| **ResolvedBy** | Kilo (code) on 2026-06-30 — `ViberHandoff.tsx:17` already renders `viber://chat` link. No plain-text display found. |
| **Description** | The Viber number is displayed as plain text. It should be a clickable `viber://chat?number=+639171234567` link or `tel:+639171234567` link for mobile users. |
| **Impact** | Users must manually copy the number and open Viber. Adds friction to the handoff flow. |
| **Fix Guidance** | Wrap the Viber number in an `<a href={`viber://chat?number=${viberNumber.replace(/[^0-9]/g, '')}`}>` tag. Add a fallback `tel:` link for devices without Viber. Add a "Copy to Clipboard" button as secondary option. |

### GAP-LOW-014: Admin Quotations Edit Page Has No Delete/Archive Action

| Field | Value |
|-------|-------|
| **File(s)** | [`apps/website/src/app/admin/quotations/[id]/page.tsx`](apps/website/src/app/admin/quotations/[id]/page.tsx) |
| **Type** | Missing UI action |
| **Status** | ✅ Resolved |
| **ResolvedBy** | Kilo (code) on 2026-06-30 — Delete button exists at `quotations/[id]/page.tsx` line 653. Back link at line 565 goes to `/admin/quotations`. |
| **Description** | The quotations list page (`page.tsx`) has a "Delete" button for each quotation. However, the individual quotation edit/detail page (`[id]/page.tsx`) has no delete or archive button. Admin must go back to the list to delete a quotation. |
| **Impact** | Minor inconvenience — admin can't delete a quotation while viewing/editing it. |
| **Fix Guidance** | Add a "Delete Quotation" button to the edit page (with confirmation dialog). Place it next to the "Mark as Sent" button, styled in red/outline style to prevent accidental clicks. |

### GAP-LOW-015: `/quotation/[id]` "Back to Home" Always Links to `/` Without Context

| Field | Value |
|-------|-------|
| **File(s)** | [`apps/website/src/app/quotation/[id]/page.tsx:120`](apps/website/src/app/quotation/[id]/page.tsx:120) |
| **Type** | Missing contextual navigation |
| **Status** | ✅ Resolved |
| **ResolvedBy** | Kilo (code) on 2026-06-30 — `quotation/[id]/page.tsx` lines 77-83 already has context-aware back links: "Back to Admin" for admin context, "Back to Dashboard" for customer context. |
| **Description** | The print-friendly quotation view page links "Back to Home" to `/`. This page is linked from both the admin panel (admin editing a quotation → "Preview") and the customer dashboard (customer viewing their quotation). Both contexts go to the same `/` destination, which is wrong for admin users. |
| **Impact** | Admin users clicking "Back to Home" from the quotation preview are taken to the public homepage instead of the admin panel. |
| **Fix Guidance** | Check `document.referrer` or add a query parameter (`?from=admin` or `?from=customer`) to the preview link. Render a context-appropriate back link: `/admin/quotations` for admin, `/customer/dashboard` for customers. |

### GAP-LOW-019: Homepage Slideshow Uses Hardcoded Shopify CDN URLs

| Field | Value |
|-------|-------|
| **File(s)** | [`apps/website/src/components/HomepageSlideshow.tsx:16-34`](apps/website/src/components/HomepageSlideshow.tsx) |
| **Type** | Stale CDN references |
| **Status** | ✅ Resolved |
| **ResolvedBy** | Previously fixed — zero `cdn.shopify` references remain in any TSX file. |
| **Description** | The `DEFAULT_SLIDES` array in `HomepageSlideshow.tsx` has 4 slides with images hardcoded to `cdn.shopify.com`: `b77cb11ff1.webp`, `A9ter5o3_1r4uc0l_hko.jpg`, `A9t5ka0y_1r4uc0v_hko.jpg`, `r1_480x480_a439cb88-4c92-45af-b585-1ff8c6a5cdc5.webp`. These should be migrated to DigitalOcean Spaces CDN URLs. This does not affect live admin-edited slideshows (which use the theme editor's `homepage_sections` config) — only the fallback/default slides. |
| **Impact** | If no homepage sections are configured, the fallback slideshow loads images from Shopify's CDN rather than the HomeU CDN. These are the only remaining `cdn.shopify.com` hardcoded image references in the frontend code. |
| **Fix Guidance** | (1) Download the 4 slide images from Shopify CDN. (2) Upload to DO Spaces under `cdn-mirror/` using `tools/shopify-import/mirror-db-assets.mjs` or manually via DO Spaces web console. (3) Replace the 4 URLs in `DEFAULT_SLIDES` with the DO Spaces CDN URLs. |

### GAP-LOW-020: Favicon Still Points to Shopify CDN

| Field | Value |
|-------|-------|
| **File(s)** | [`apps/website/src/data/site-config.json:28`](apps/website/src/data/site-config.json) |
| **Type** | Stale CDN reference |
| **Status** | ✅ Resolved |
| **ResolvedBy** | Previously fixed — `site-config.json` `shopifyUrl` field already points to DO Spaces CDN. Field name is a misnomer but URL is correct. |
| **Description** | The `favicon.shopifyUrl` in `site-config.json` points to `cdn.shopify.com/s/files/1/0559/7377/3476/shop_images/FAVICON.png`. The logo was already migrated to DO Spaces (`site-config.json:23`), but the favicon was not. |
| **Impact** | The favicon loads from Shopify's CDN. Minor dependency on a third-party CDN for a static asset that should be self-hosted. |
| **Fix Guidance** | (1) Download the favicon PNG from the Shopify URL. (2) Upload to DO Spaces under `cdn-mirror/` (or just place in `apps/website/public/`). (3) Update `site-config.json favicon.shopifyUrl` to the DO Spaces CDN URL or a local path. |

### GAP-LOW-021: Chat Image Uploads Save to Local Disk Instead of DO Spaces

| Field | Value |
|-------|-------|
| **File(s)** | [`apps/website/src/app/api/chat/upload-image/route.ts:44-51`](apps/website/src/app/api/chat/upload-image/route.ts) |
| **Type** | Missing CDN integration |
| **Status** | 🔵 Active |
| **Description** | The `POST /api/chat/upload-image` route saves uploaded images to `public/uploads/chat/<uuid>.<ext>` — local disk. Unlike admin product/media uploads which have a clear CDN target, chat uploads are transient (used for AI vision analysis then discarded). However, they still depend on the local filesystem which is ephemeral on containerized deployments. |
| **Impact** | Chat images are lost on server restart/container redeploy. The AI vision analysis still works during the same session, but images are not persisted for historical reference. Low severity because chat images are transient by design. |
| **Fix Guidance** | For durability: upload chat images to DO Spaces under a `chat-uploads/` prefix with a short TTL or periodic cleanup. For the MVP, this can stay local — add a warning log that files are ephemeral. Alternatively, use the `S3_ENDPOINT`/`S3_BUCKET` env vars already defined for chat uploads (`.env.example` lines 54-57). |

---

### GAP-LOW-016: Comments and Docs Still Referencing DaVinciOS

| Field | Value |
|-------|-------|
| **File(s)** | [`apps/website/src/scripts/seo-audit.mjs:10`](apps/website/src/scripts/seo-audit.mjs:10), [`apps/website/src/scripts/seed-seo-health.mjs:3`](apps/website/src/scripts/seed-seo-health.mjs:3), [`apps/website/src/scripts/seed-postgres.mjs:5-7`](apps/website/src/scripts/seed-postgres.mjs:5), [`docker/nginx.conf:85`](docker/nginx.conf:85) |
| **Type** | Documentation debt |
| **Status** | ✅ Resolved |
| **Description** | Multiple files contain comments and documentation that reference DaVinciOS: (1) `seo-audit.mjs` mentions "DaVinciOS global", (2) `seed-seo-health.mjs` mentions "DaVinciOS global (table: seo_health)", (3) `seed-postgres.mjs` has extensive comments about "DaVinciOS's Local API" and "DaVinciOS@3.85 / @next/env@16 ESM interop bug", (4) `docker/nginx.conf` comment says "Redirect root → /admin (DaVinciOS CMS login)". |
| **Impact** | Misleading documentation could confuse developers unfamiliar with the migration history. The nginx comment implies DaVinciOS is still running. |
| **Root Cause** | These files were created during the DaVinciOS era and never had their comments updated after the framework was removed. |
| **Fix Guidance** | Update all comments to remove DaVinciOS references. Replace with accurate descriptions (e.g., "SEO health global" instead of "DaVinciOS global", "admin login" instead of "DaVinciOS CMS login"). For `seed-postgres.mjs`, remove or rewrite the comment block about the DaVinciOS Local API bug since it's no longer relevant. |
| **ResolvedBy** | Codex (code) — 2026-06-16. Updated comments in seo-audit.mjs, seed-seo-health.mjs, seed-postgres.mjs, docker/nginx.conf, and Customers.ts. |

### GAP-LOW-017: Auth Module Has PayloadCMS PBKDF2 Fallback Code

| Field | Value |
|-------|-------|
| **File(s)** | [`apps/website/src/lib/auth.ts:109-114`](apps/website/src/lib/auth.ts:109) |
| **Type** | Legacy code |
| **Status** | ✅ Resolved |
| **Description** | The `authenticateAdmin()` function in `auth.ts` has a legacy fallback that attempts PBKDF2 password verification using PayloadCMS's hash+salt format. This code path executes if `password_hash` (bcrypt) is empty but `hash` and `salt` fields exist — which would only happen if old DaVinciOS user records are still in the database. |
| **Impact** | Low risk — the code is defensive and handles migration gracefully. However, it adds complexity, uses a bare `new Promise()` pattern, and references PayloadCMS. Once all user passwords have been migrated to bcrypt (via the `password_hash` column), this code becomes dead. |
| **Root Cause** | PayloadCMS used PBKDF2 with a separate salt for password hashing. When migrating to bcrypt (which embeds the salt), the old format was retained as a fallback for existing users. |
| **Fix Guidance** | (1) Verify all admin/staff users have their passwords migrated to bcrypt in the database. (2) Remove the PBKDF2 fallback block (lines 109-125) and the fallback comment on line 105. (3) Update the import to remove the dynamic `crypto` import. (4) Simplify the function by removing the dual-path return. |
| **ResolvedBy** | Codex (code) — 2026-06-16. Already resolved — auth.ts uses bcryptjs exclusively with no PBKDF2 fallback. |

### GAP-LOW-018: Customer Sync Comment Still References DaVinciOS API

| Field | Value |
|-------|-------|
| **File(s)** | [`apps/website/src/lib/chatbot/customer-sync.ts:5,28`](apps/website/src/lib/chatbot/customer-sync.ts:5) |
| **Type** | Documentation debt |
| **Status** | ✅ Resolved |
| **Description** | The `customer-sync.ts` file header comment says "Bridges the gap between chatbot leads and registered customer accounts (DaVinciOS customers collection)" and section comment says "Find existing customer by email via DaVinciOS API". These reference a system that no longer exists. |
| **Impact** | Misleading documentation for developers reading this file. |
| **Root Cause** | Comments were written when DaVinciOS was the backend. Never updated after migration. |
| **Fix Guidance** | Update comments to reference "customers table/collection" instead of "DaVinciOS customers collection" and "customer API/DB" instead of "DaVinciOS API". |
| **ResolvedBy** | Codex (code) — 2026-06-16. Already resolved — customer-sync.ts comments already reference "chatbot.leads" and "customers table" correctly. |

---

## ✅ Resolved Gaps

### GAP-RES-001: SEOHealth Global Import Missing

| Field | Value |
|-------|-------|
| **File(s)** | [`apps/website/src/globals/SEOHealth.ts`](apps/website/src/globals/SEOHealth.ts) |
| **Status** | ✅ Resolved |
| **Resolved By** | File exists at `apps/website/src/globals/SEOHealth.ts` and is properly imported in `daVinciOS.config.ts:12`. Previous gap analysis incorrectly flagged this as missing. |
| **Date** | Pre-2026-06-16 |

### GAP-RES-002: Missing Agent Tool Files

| Field | Value |
|-------|-------|
| **File(s)** | [`tools/migration-brain/brain.mjs`](tools/migration-brain/brain.mjs), [`tools/migration-brain/hermes-agent.mjs`](tools/migration-brain/hermes-agent.mjs), [`tools/seo-manager/run.mjs`](tools/seo-manager/run.mjs) |
| **Status** | ✅ Resolved |
| **Resolved By** | All three files exist in the repository. Previous gap analysis incorrectly flagged them as missing due to incomplete file listing. |
| **Date** | Pre-2026-06-16 |

### GAP-RES-003: Admin Quotations New Page Missing

| Field | Value |
|-------|-------|
| **File(s)** | [`apps/website/src/app/admin/quotations/new/page.tsx`](apps/website/src/app/admin/quotations/new/page.tsx) |
| **Status** | ✅ Resolved |
| **Resolved By** | File exists at the expected path. Admin quotations CRUD includes page.tsx, [id]/page.tsx, and new/page.tsx. |
| **Date** | Pre-2026-06-16 |

### GAP-RES-004: Analytics, Leads, Appointments, Reports, and Workflows Were Only Partially Wired

| Field | Value |
|-------|-------|
| **File(s)** | [`apps/website/src/app/admin/analytics/`](apps/website/src/app/admin/analytics/), [`apps/website/src/app/admin/collections/leads/`](apps/website/src/app/admin/collections/leads/), [`apps/website/src/app/admin/collections/appointments/`](apps/website/src/app/admin/collections/appointments/), [`apps/website/src/lib/chatbot/appointment-service.ts`](apps/website/src/lib/chatbot/appointment-service.ts), [`apps/website/src/lib/workflows.ts`](apps/website/src/lib/workflows.ts) |
| **Status** | ✅ Resolved |
| **Description** | The routes existed, but storefront analytics was not mounted, appointment requests returned synthetic success without an INSERT, detail pages searched UUIDs through text search/list endpoints, lead and appointment statuses were read-only, report controls had no handlers, and synthetic workflow tasks could appear updated without changing a database row. Runtime analytics/workflow tables were also outside the canonical migration chain. |
| **Resolved By** | Codex on 2026-06-21 — mounted storefront page-view and heartbeat trackers; excluded admin traffic from storefront analytics; added durable appointment INSERT plus direct authenticated lead/appointment GET+PATCH routes and status controls; added real CSV/JSON reports and persistent report preferences; added real workflow task creation and affected-row verification; added canonical migration `012_insights_workflows_runtime.sql`; and added `tools/test-admin-insights-wiring.mjs` (20 passing contracts). TypeScript, production build, and full preflight pass. |
| **Date** | 2026-06-21 |

---

### GAP-RES-005: RFQ Chat Tables Missing Locally; Facebook Inbox Webhook Wrote To Non-Existent Columns And Un-Defaulted IDs

| Field | Value |
|-------|-------|
| **File(s)** | local Postgres `_migrations` ledger; [`tools/migrate/migrations/005_add_rfq_chat.sql`](../tools/migrate/migrations/005_add_rfq_chat.sql); [`apps/website/src/app/api/webhooks/facebook/route.ts`](../apps/website/src/app/api/webhooks/facebook/route.ts); `inbox_channels`/`inbox_contacts`/`inbox_conversations`/`inbox_messages` tables |
| **Status** | ✅ Resolved |
| **Description** | (1) Local DB's `_migrations` table claimed `005_add_rfq_chat.sql` was applied, but the `rfq_chat_*`/`chatbot_backfill_log` tables did not actually exist locally — every RFQ-chat API call failed silently with "relation does not exist." (2) The new, uncommitted Facebook inbox webhook inserted into `inbox_contacts` using `external_sender_id`/`channel_id` (columns that don't exist — the real columns are `facebook_psid`/`source`) and into `inbox_messages` using a `channel` column that doesn't exist. (3) Deeper issue: `inbox_channels`, `inbox_contacts`, `inbox_conversations`, and `inbox_messages` are leftover PayloadCMS-era tables with `character varying` `id` columns and **no default** — IDs used to be generated by the old PayloadCMS runtime, which was removed (see "Framework removal" above). Any plain `INSERT` into these tables without an explicit `id` failed with a not-null violation. |
| **Resolved By** | Re-applied `005_add_rfq_chat.sql` against the local DB (idempotent `IF NOT EXISTS`). Rewrote the Facebook webhook route to use the real `inbox_contacts` schema (`facebook_psid`/`source`, contact identity is global not per-channel) and to store attachments/external message id/raw payload on `inbox_messages` instead of a nonexistent `channel` column. Added migration `014_inbox_id_defaults.sql` giving all four `inbox_*` `id` columns a `gen_random_uuid()::text` default so plain inserts work without the caller generating an ID. Verified end-to-end with a simulated webhook payload (channel → contact → conversation → message insert chain). TypeScript and quick preflight sweep pass. |
| **Date** | 2026-06-21 |

---

### GAP-RES-006: Unified No-Code Settings Platform — UI Saved Settings That No Runtime Code Ever Read, And Its Storage Table Didn't Exist

| Field | Value |
|-------|-------|
| **File(s)** | [`lib/app-config.ts`](../apps/website/src/lib/app-config.ts), [`api/admin/config/route.ts`](../apps/website/src/app/api/admin/config/route.ts), `admin/settings/{store,notifications,ai,cdn,urls}/page.tsx`, [`lib/chatbot/ai-provider.ts`](../apps/website/src/lib/chatbot/ai-provider.ts), [`lib/chatbot/telegram-client.ts`](../apps/website/src/lib/chatbot/telegram-client.ts), [`components/chat/ChatWidget.tsx`](../apps/website/src/components/chat/ChatWidget.tsx), [`api/chat/widget-config/route.ts`](../apps/website/src/app/api/chat/widget-config/route.ts) |
| **Status** | ✅ Resolved |
| **Description** | A prior session built a full unified settings registry (DB-first, env-fallback) plus new Store/Notifications/AI/CDN/URLs admin pages — replacing the old Store/Notifications pages, which were server components with no API, hardcoded values, and dead Save buttons. Two things were still broken: (1) `"DaVinciOS_kv"` — the key-value table every part of this system (plus the pre-existing Email/Social settings and the Facebook webhook verify-token lookup) reads and writes — did not exist in the local DB at all, despite being defined in the `001_initial_schema.sql` baseline that the migration ledger claims is applied (same drift pattern as GAP-RES-005's `rfq_chat_*` tables). Every save would have silently no-op'd. (2) Even with the table fixed, **nothing in the runtime read the saved values** — `getAIProvider()` and `sendTelegramAlert()` only read `process.env`, and the storefront `ChatWidget` (a client component) read `NEXT_PUBLIC_*` env vars baked in at build time — so an admin saving an AI provider, Telegram bot token, or Viber number through the new pages would see "Saved!" but nothing would actually change. The own test script for this work (`test-admin-settings-e2e.mjs`) also didn't run: it was `.mjs` with TypeScript type annotations (invalid syntax), and asserted the *old* broken state rather than testing the new code. Also found a stray duplicate `014_unified_config.sql` migration that collided in number with `014_inbox_id_defaults.sql` (GAP-RES-005) and seeded fake defaults via `current_setting('app.*')`, a Postgres GUC that nothing ever sets — it would have silently frozen wrong literal defaults into the KV store, masking real env-configured values. |
| **Resolved By** | Added migration `015_davincios_kv.sql` to create the missing `"DaVinciOS_kv"` table. Deleted the broken `014_unified_config.sql` (unnecessary — `loadNamespace()` already resolves DB > env > default correctly per read without pre-seeding). Made `getAIProvider()` async and DB-aware (cache invalidated by `resetAIProvider()`, now called from the config PUT route on save). Wired `sendTelegramAlert()` and the chat message route's Viber number to `loadNamespace('messaging')`. Added public `GET /api/chat/widget-config` and rewired `ChatWidget` to fetch it at mount instead of reading build-time env vars, including a real `enableChat` kill switch (previously defined but never consumed). Rewrote `test-admin-settings-e2e.mjs` as a valid, passing static-wiring audit (23/23) matching the `test-admin-insights-wiring.mjs` pattern. TypeScript and full preflight pass; both wiring-audit scripts pass (20/20 + 23/23). |
| **Date** | 2026-06-21 |

---

### GAP-RES-007: Admin Media Upload Wrote To The Container's Ephemeral Disk, Not DigitalOcean Spaces — Files Would Vanish On Every Deploy

| Field | Value |
|-------|-------|
| **File(s)** | [`api/admin/media/upload/route.ts`](../apps/website/src/app/api/admin/media/upload/route.ts) (new: [`lib/do-spaces.ts`](../apps/website/src/lib/do-spaces.ts)), [`lib/app-config.ts`](../apps/website/src/lib/app-config.ts), [`admin/settings/cdn/page.tsx`](../apps/website/src/app/admin/settings/cdn/page.tsx) |
| **Status** | ✅ Resolved |
| **Description** | Follow-up from GAP-RES-006: the CDN/Storage settings page saves DO Spaces credentials, but nothing read them — investigating *why* turned up a more serious bug than "settings are inert." The "Upload a new file" path of `<MediaPicker>` (`POST /api/admin/media/upload`) — despite its own doc comment claiming it uploads "straight to DigitalOcean Spaces" and registers the file in the `media` index — actually wrote the file to `public/uploads/` on the **container's local filesystem** via `fs.writeFile`, and never inserted a `media` row at all. `docker-compose.yml`'s `website` service has no volume mount for that path, so every uploaded file is destroyed the next time the container is rebuilt — which happens on every single deploy. This was lucky timing rather than already-broken in production: a check of the live `media` table found 0 of 1,705 rows pointing at `/uploads/...` (all are real DO Spaces CDN URLs), meaning the feature had not yet been used for a real upload before this was caught. |
| **Resolved By** | Added `lib/do-spaces.ts` — an `@aws-sdk/client-s3` wrapper (added as a real dependency to `apps/website/package.json`, mirroring the working pattern already used by `tools/shopify-import/mirror-db-assets.mjs`) that reads credentials via `loadNamespace('cdn')`, DB-first with env fallback, cache invalidated by `resetSpacesClient()` on save. Added a `doSpacesRegion` field to `CdnConfig` and the CDN settings page (previously missing — the region can't be reliably parsed back out of the bucket-prefixed endpoint string). Rewrote the upload route to hash the file once (no random salt), check `media` for an existing row by `sha256` (true dedupe, matching its own doc comment), upload to Spaces under `uploads/{sha256}.{ext}`, and insert the `media` row. Verified with real production DO Spaces credentials: PUT, public GET via the CDN URL, and DELETE all succeeded, plus a full local dry run of the dedupe-check → upload → insert → dedupe-check-again sequence. Also fixed an unrelated pre-existing TypeScript syntax error (`new PerformanceObserver?.()`, invalid optional-chain-from-new) in `components/WebVitalsTracker.tsx` that was blocking the preflight gate. TypeScript, full preflight, and production build all pass; `test-admin-settings-e2e.mjs` extended to 23/23. |
| **Date** | 2026-06-21 |

---

---

## 2026-06-20 Comprehensive Feature Audit Baseline

The audit verified that HomeU already has a broad operating platform. New work should extend or connect these capabilities instead of recreating them.

| Capability | Existing Surface |
|------------|------------------|
| Storefront and discovery | Product catalog and detail pages, collections, search, recommendations, navigation, homepage sections, SEO metadata, blogs, and pages |
| Consultation and sales | RFQ cart, RFQ submission, admin RFQ management, quotation management, PDF generation, appointments, and customer-facing quotation views |
| Customer experience | Registration, login, activation, password-reset UI, account, addresses, dashboard, RFQ history, quotation history, and cart synchronization |
| AI concierge | Product discovery, recommendations, lead capture, image upload, conversation persistence, appointment scheduling, RFQ creation, Viber handoff, and Telegram alerts |
| DaVinciOS administration | Dashboard and CRUD surfaces for products, categories, collections, customers, media, pages, redirects, blogs, users, settings, navigation, and theme editing |
| Analytics and operations | Live visitors, traffic, leads, product interest, funnel/pipeline, reports, workflows, health/readiness endpoints, activity, and deployment tooling |
| Growth applications | Campaigns, contacts, segments, templates, email inbox, central inbox, Instagram posts/grids, newsletter capture, and webhook support |
| Platform tooling | Shopify import/export, crawler and visual audits, SEO audit, migration runner, CDN migration, preflight checks, deployer agent, nightly QA, and learning layer |

### Verified Audit Notes

- The website workspace TypeScript check passed on 2026-06-20.
- The repository status and gap matrices contain stale descriptions of features that now exist; live routes and implementations must remain the source of truth when resolving older gaps.
- Compilation success is not behavioral verification. Automated tests cover only a small portion of the customer, sales, growth, and administration surface.
- Existing enabling capabilities are fragmented across discovery, RFQ, quotation, inbox, analytics, and AI experiences; the next product advantage comes from connecting them into one persistent project loop.

### Current Market Signals

- [Wayfair Muse](https://www.aboutwayfair.com/category/company-news/wayfair-introduces-new-ai-powered-tool-muse-to-inspire-and-personalize-the-home-shopping-experience) uses generative AI for visual, personalized home-shopping inspiration.
- [Wayfair Professional My Projects](https://www.aboutwayfair.com/category/company-news/my-projects-wayfair-professionals-new-project-management-tool) brings product sourcing, task tracking, approvals, and communication into a project workspace.
- [Wayfair Agent Co-Pilot](https://www.aboutwayfair.com/careers/tech-blog/agent-co-pilot-wayfairs-gen-ai-assistant-for-digital-sales-agents) assists sales agents during personalized customer support.
- [Shopify Sidekick](https://www.shopify.com/magic) positions AI as an operational commerce assistant for building and growing a store.

The market gap HomeU can own is the combination of inspiration, real-catalog grounding, room and delivery feasibility, collaborative project decisions, RFQ and quotation workflow, and measurable human-assisted closing in one Philippine furniture experience.

### Room Passport Delivery Sequence

1. Close CRIT-004 and HIGH-010 through HIGH-012 before adding new authentication-dependent workflows.
2. Complete product variants/options under GAP-MED-005 and catalog quality under GAP-MED-039.
3. Define canonical project, room, item, collaborator, event, RFQ-version, and quotation-version data contracts.
4. Implement a living-room Room Passport MVP: photo, editable measurements, style, budget, and three catalog-grounded bundles.
5. Add deterministic fit, clearance, access, budget, variant, availability, and explainable confidence checks.
6. Add customer/designer collaboration, approvals, saved versions, and one-click project-to-RFQ conversion.
7. Add the sales co-pilot, consent-aware follow-up automations, and discovery-to-won-revenue attribution.

### Theme Builder Audit Scorecard

Audited 2026-06-20 using static schema-to-consumer tracing, the repository Playwright theme audit, live API calls, TypeScript, and desktop/mobile screenshots against the local database-backed storefront.

| Area | Result | Evidence |
|------|--------|----------|
| Section registration | Pass | All 22 section types exist in metadata and the canonical settings registry |
| Storefront renderers | Pass with gaps | All 18 body section types have renderer branches; four footer types have components |
| Current live composition | Pass | 13 database sections returned: nine enabled body sections plus four footer sections |
| API availability | Pass | Settings schema, theme settings, section list/create/update/delete/reorder routes respond and TypeScript passes |
| Preview bridge | Structurally present | Select, inline text, image, product, insert, and reorder message handlers exist; behavioral coverage remains incomplete |
| Typed form controls | Fail | `DynamicSettingsForm` is unused; compatibility adapter degrades modern controls to text/number fields |
| Setting-to-output contract | Fail | Many advertised section and global settings have no visible renderer/style/API effect |
| Save and recovery safety | Fail | Mutation responses are not checked consistently; import is destructive and non-transactional |
| Footer contract | Fail | Quick Links and Social schema keys do not match component props/usage |
| Responsive rendering | Partial | No horizontal overflow at 1440px or 390px, but controls and mobile layouts are incomplete |
| Visual asset health | Fail | Multiple current collection/product images failed during desktop/mobile runtime inspection |
| Complete website editing | Fail | Builder covers homepage, global header/navigation, and footer only; other page templates are fixed |

The existing Playwright audit reported 113 passes, one timeout, and five warnings. The timeout is an audit-harness issue: it waits for `networkidle` on a storefront with ongoing analytics/live-visitor traffic. DOM-based inspection returned HTTP 200 and rendered successfully. The stronger issue is that the audit checks existence and broad key references, not whether every control round-trips and visibly changes its own section.

### Theme Builder Repair Order

1. Make import/publish/revisions atomic and show real save errors (GAP-HIGH-020).
2. Replace the compatibility form with the typed dynamic form (GAP-HIGH-019).
3. Establish and test the setting-to-output contract; hide unfinished controls (GAP-HIGH-021).
4. Align global and footer schemas with storage and components (GAP-MED-041, GAP-MED-042).
5. Create a clean editor preview shell with repairable empty states (GAP-MED-043).
6. Add asset validation and consistent responsive controls (GAP-MED-044, GAP-MED-045).
7. Add visual section discovery, starter templates, and guided onboarding (GAP-MED-046).
8. Expand from homepage editing to product and collection templates, then other page types (GAP-HIGH-022).

---

## 📊 Summary

| Priority | Active Count | Key Items |
|----------|-------------|-----------|
| 🔴 Critical | 0 | — |
| 🟠 High | 10 | Existing 10 items minus CRIT-004, HIGH-010, HIGH-011 (all already fixed in code, gap log was stale) |
| 🟡 Medium | 24 | (was 28) minus MED-006 (bulk edit), MED-007 (missing filters), MED-019 (stale packages), MED-020 (payloadcms-ui.tgz), MED-024 (docker tags) — all verified already resolved |
| 🔵 Low | 20 | Bank placeholder, Viber placeholder, Schema migration pending, component-map.md missing, Bare catch blocks, Inline auth styles, UX inconsistency, Dual rendering paths, msgCounter reset, Silent catch, Product URL unused, Viber not clickable, No delete on edit page, Contextual back-link, Admin login branding (DaVinciOS logo class), E2e test Turbopack patterns, Stale homeu.ph domain references, **Slideshow Shopify CDN URLs**, **Favicon Shopify CDN URL**, **Chat uploads local disk** |
| ✅ Resolved | 48 | All 42 prior + CRIT-004 (OTP), HIGH-010 (JWT), HIGH-011 (password reset), MED-006 (bulk edit), MED-007 (missing filters), MED-019 (stale packages), MED-020 (payloadcms-ui.tgz), MED-024 (docker tags) — all verified 2026-06-22 |
| **Total** | **102** | **54 active + 48 resolved** |

---

## Phase 2 Implementation Plan

> **Goal:** Resolve all compilation-blocking errors, wire critical data persistence, and build missing core pages for a functional MVP storefront.
> **Target:** 50 active gaps → 20 active gaps (resolve 30)
> **Owner:** Roo (Kilo Code) + Agent Team
> **Timeline:** Phases executed sequentially

### Phase 2-A: Fix TypeScript Compilation Errors (P0 — Build Blocker)

| Step | Gap(s) | Action | Files | Expected Outcome |
|------|--------|--------|-------|-----------------|
| A1 | GAP-HIGH-007 | ✅ Resolved — [`SEOHealth.ts`](apps/website/src/globals/SEOHealth.ts) already imports `GlobalConfig` from `'../types/davincios'`. Stub type exists in [`davincios.d.ts`](apps/website/src/types/davincios.d.ts). | [`apps/website/src/globals/SEOHealth.ts`](apps/website/src/globals/SEOHealth.ts) | SEOHealth.ts compiles ✅ |
| A2 | GAP-HIGH-008 | ✅ Resolved — [`davincios.d.ts`](apps/website/src/types/davincios.d.ts) already exists with `CollectionConfig` and `GlobalConfig` stub types. | All 8 collection files + SEOHealth.ts | All collection files compile ✅ |
| A3 | GAP-HIGH-008 | ✅ Resolved — All 8 collection files already import `CollectionConfig` from `'../types/davincios'`. SEOHealth.ts imports `GlobalConfig` from same path. | All 8 collection files + SEOHealth.ts | `satisfies` clause resolves ✅ |
| A4 | GAP-HIGH-005 | ✅ Resolved — Hook already used `findOne('categories', { id: categoryId })` from `@/lib/db`. No change needed. | [`apps/website/src/collections/Products.ts:35`](apps/website/src/collections/Products.ts:35) | Products collection compiles and runs ✅ |
| A5 | GAP-HIGH-006 | ✅ Resolved — All 4 chatbot service files already use direct DB queries. No HTTP calls remain. | [`customer-sync.ts`](apps/website/src/lib/chatbot/customer-sync.ts), [`rfq-service.ts`](apps/website/src/lib/chatbot/rfq-service.ts), [`product-search.ts`](apps/website/src/lib/chatbot/product-search.ts), [`route.ts`](apps/website/src/app/api/rfq/submit/route.ts) | Chatbot services work without DaVinciOS API ✅ |

**Acceptance Criteria:**
- ✅ `npm run build` (or `tsc --noEmit`) succeeds with zero errors — All compilation blockers resolved
- ✅ All collections export valid objects — Types defined, `satisfies` clauses resolve
- ✅ Chatbot services can read/write data via DB layer — No HTTP calls remaining

### Phase 2-B: Wire Critical Data Persistence (P0 — Data Loss)

| Step | Gap(s) | Action | Files | Expected Outcome |
|------|--------|--------|-------|-----------------|
| B1 | GAP-CRIT-001 | ✅ Resolved — [`db.ts`](apps/website/src/lib/chatbot/db.ts) implements `insertLead()` and `insertConversation()`. [`leads/route.ts`](apps/website/src/app/api/chat/leads/route.ts) already calls both. | [`apps/website/src/app/api/chat/leads/route.ts`](apps/website/src/app/api/chat/leads/route.ts) | Lead data persists across restarts ✅ |
| B2 | GAP-CRIT-002 | ✅ Resolved — [`db.ts`](apps/website/src/lib/chatbot/db.ts) implements `insertMessage()`. [`message/route.ts`](apps/website/src/app/api/chat/message/route.ts) already calls it for both visitor and bot messages. | [`apps/website/src/app/api/chat/message/route.ts`](apps/website/src/app/api/chat/message/route.ts) | Chat history survives refresh ✅ |
| B3 | GAP-LOW-003 | Run chatbot schema migration against PostgreSQL | [`apps/website/src/lib/chatbot/schema.sql`](apps/website/src/lib/chatbot/schema.sql) | All 9 chatbot tables exist |

**Acceptance Criteria:**
- ✅ Leads created via chatbot appear in DB after server restart
- ✅ Chat messages are queryable from `chatbot.messages`
- Schema migration is repeatable (idempotent)
- ⏳ B3 (schema migration) still pending

### Phase 2-C: Build Missing Admin Pages (P1 — Admin Workflow)

| Step | Gap(s) | Action | Files | Expected Outcome |
|------|--------|--------|-------|-----------------|
| C1 | GAP-MED-013 | Create admin dashboard landing page with stats + nav | [`apps/website/src/app/admin/page.tsx`](apps/website/src/app/admin/page.tsx) | `/admin` renders dashboard |
| C2 | GAP-MED-015 | Create admin RFQ list + detail pages | [`apps/website/src/app/admin/rfq/page.tsx`](apps/website/src/app/admin/rfq/page.tsx), [`apps/website/src/app/admin/rfq/[id]/page.tsx`](apps/website/src/app/admin/rfq/[id]/page.tsx) | Admin can manage RFQs |
| C3 | GAP-MED-012 | Fix "Back to Home" to link to `/admin` | [`apps/website/src/app/admin/quotations/page.tsx:294`](apps/website/src/app/admin/quotations/page.tsx:294) | Back navigation correct |
| C4 | GAP-MED-014 | Add loading skeleton to admin quotations list | [`apps/website/src/app/admin/quotations/page.tsx:170-173`](apps/website/src/app/admin/quotations/page.tsx:170-173) | Skeleton loading state |

**Acceptance Criteria:**
- `/admin` shows navigation hub with links to quotations, RFQ, analytics
- Admin can list, view, and manage RFQs
- Loading states use skeleton UI

### Phase 2-D: Build Product Pages (P1 — Storefront Blocker)

| Step | Gap(s) | Action | Files | Expected Outcome |
|------|--------|--------|-------|-----------------|
| D1 | GAP-HIGH-004, GAP-MED-009 | Create `/products` listing page with search + category filter | [`apps/website/src/app/products/page.tsx`](apps/website/src/app/products/page.tsx) | Products page renders |
| D2 | GAP-HIGH-004 | Create `/products/[slug]` detail page | [`apps/website/src/app/products/[slug]/page.tsx`](apps/website/src/app/products/[slug]/page.tsx) | Product detail renders |
| D3 | GAP-MED-019 | Build `GET /api/products` + `GET /api/products/[id]` API routes | [`apps/website/src/app/api/products/route.ts`](apps/website/src/app/api/products/route.ts), [`apps/website/src/app/api/products/[id]/route.ts`](apps/website/src/app/api/products/[id]/route.ts) | Products API available |
| D4 | GAP-MED-019 | Build `GET /api/categories` API route | [`apps/website/src/app/api/categories/route.ts`](apps/website/src/app/api/categories/route.ts) | Categories API available |

**Acceptance Criteria:**
- `/products` shows paginated product grid with category filter
- `/products/[slug]` shows full product details
- Chatbot product search works via new API routes

### Phase 2-E: Activate Chatbot Notifications (P2 — Sales Enablement)

| Step | Gap(s) | Action | Files | Expected Outcome |
|------|--------|--------|-------|-----------------|
| E1 | GAP-HIGH-002 | ✅ Resolved — [`leads/route.ts`](apps/website/src/app/api/chat/leads/route.ts) calls `sendTelegramAlert()` with NEW_LEAD. [`message/route.ts`](apps/website/src/app/api/chat/message/route.ts) calls it with ESCALATION. [`rfq-service.ts`](apps/website/src/lib/chatbot/rfq-service.ts) calls it with RFQ_SUBMITTED. | [`apps/website/src/app/api/chat/leads/route.ts`](apps/website/src/app/api/chat/leads/route.ts), [`apps/website/src/app/api/rfq/submit/route.ts`](apps/website/src/app/api/rfq/submit/route.ts) | Sales gets real-time notifications ✅ |
| E2 | GAP-HIGH-003 | Build simple admin lead scoring dashboard widget | [`apps/website/src/app/admin/dashboard/page.tsx`](apps/website/src/app/admin/dashboard/page.tsx) | Lead scores visible to admin |

**Acceptance Criteria:**
- ✅ Telegram alert fires on new lead creation
- ✅ Telegram alert fires on RFQ submission
- ⏳ Admin dashboard shows lead score summary — E2 still pending

### Phase 2-F: Clean Up DaVinciOS Remnants (P3 — Code Quality)

| Step | Gap(s) | Action | Files | Expected Outcome |
|------|--------|--------|-------|-----------------|
| F1 | GAP-MED-016 | Drop 6 dead `DaVinciOS_*` tables from schema | [`homeu-schema.sql`](homeu-schema.sql) | Clean database schema |
| F2 | GAP-MED-017, GAP-MED-034 | Update/delete build/scan tools to remove DaVinciOS references | [`tools/build-and-deploy.mjs`](tools/build-and-deploy.mjs), [`tools/cleanup-davincios.mjs`](tools/cleanup-davincios.mjs), [`tools/playwright-scanner/check-admin.mjs`](tools/playwright-scanner/check-admin.mjs) | Clean tooling |
| F3 | GAP-MED-018, GAP-MED-021 | Rename JSON files, update seed scripts, update shopify import tools | [`tools/shopify-import/output/`](tools/shopify-import/output/), [`tools/shopify-import/parser.mjs`](tools/shopify-import/parser.mjs), [`tools/shopify-import/transform-*.mjs`](tools/shopify-import/), [`tools/shopify-mcp/server.mjs`](tools/shopify-mcp/server.mjs), [`apps/website/src/scripts/seed-postgres.mjs`](apps/website/src/scripts/seed-postgres.mjs) | Clean seed data & tools |
| F4 | GAP-MED-032 | Update `.env.example` to use new env var names | [`.env.example`](.env.example) | Clean env example |
| F5 | GAP-MED-024 | Update root `package.json` Docker image names | [`package.json:13-14`](package.json) | Clean package.json |
| F6 | GAP-MED-025 | Update `.github/workflows/deploy.yml` branding | [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) | Clean CI/CD docs |
| F7 | GAP-MED-026 | Update/delete 17 agent/skill files with DaVinciOS refs | `.kilo/skill/*.md` (11 files), `.kilo/agent/*.md` (6 files) | Clean agent definitions |
| F8 | GAP-MED-027 | Update `.claude/skills/digitalocean-spaces/SKILL.md` | [`.claude/skills/digitalocean-spaces/SKILL.md`](.claude/skills/digitalocean-spaces/SKILL.md) | Clean Claude skill |
| F9 | GAP-MED-028, GAP-MED-033 | Delete or rewrite `design-resources/davincios-design-skills/`, update `kilo.json` | `design-resources/davincios-design-skills/`, [`kilo.json:178`](kilo.json) | Clean design resources |
| F10 | GAP-MED-029 | Update 5 agent definitions in `agents/` | [`agents/website-designer-agent.md`](agents/website-designer-agent.md), [`agents/concierge-builder-agent.md`](agents/concierge-builder-agent.md), [`agents/shopify-auditor-agent.md`](agents/shopify-auditor-agent.md), [`agents/seo-manager-agent.md`](agents/seo-manager-agent.md), [`agents/README.md`](agents/README.md) | Clean agent defs |
| F11 | GAP-MED-030 | Update 3 AI workflow/instruction files | [`ai/workflows/migration-pipeline.md`](ai/workflows/migration-pipeline.md), [`ai/instructions/project.md`](ai/instructions/project.md), [`ai/agents/reverse-engineer-agent.md`](ai/agents/reverse-engineer-agent.md) | Clean AI instructions |
| F12 | GAP-MED-031 | Delete `tools/cleanup-davincios.mjs` and `tools/rebrand/` | `tools/cleanup-davincios.mjs`, `tools/rebrand/` | Clean tooling |
| F13 | GAP-MED-022 | Remove dead DaVinciOS table DDL from `homeu-schema.sql` | [`homeu-schema.sql`](homeu-schema.sql) | Clean schema |
| F14 | GAP-MED-023 | Update deployer MCP SQL column name | [`tools/deployer-agent/deployer-mcp.mjs:380`](tools/deployer-agent/deployer-mcp.mjs) | Clean MCP |

**Acceptance Criteria:**
- No DaVinciOS references remain in code or comments
- Dead tables removed from schema
- Seed scripts reference clean filenames
- All agent/skill/design/AI files updated to HomeU naming

---

## Categories and Instagram Audit — 2026-06-23

### GAP-HIGH-023: Categories Admin Masks Catalog Errors as an Empty Database

| Field | Value |
|-------|-------|
| **File(s)** | [`apps/website/src/app/admin/categories/page.tsx`](apps/website/src/app/admin/categories/page.tsx), [`apps/website/src/app/api/categories/route.ts`](apps/website/src/app/api/categories/route.ts) |
| **Type** | Data completeness / error handling |
| **Status** | ✅ Resolved |
| **Description** | Production contains 83 categories and 524 categorized products, but both list queries swallowed database exceptions and rendered “No categories.” The public API also returned page length as total and always reported zero product counts. |
| **Impact** | A transient schema/query failure looked like lost catalog data, while category consumers received misleading counts. |
| **ResolvedBy** | Codex on 2026-06-23 — forced dynamic rendering, surfaced catalog errors, logged query failures, and returned true category/product totals. |

### GAP-HIGH-024: Instagram App Has No Production Schema or Working Sync

| Field | Value |
|-------|-------|
| **File(s)** | [`tools/migrate/migrations/034_instagram_feed_runtime.sql`](tools/migrate/migrations/034_instagram_feed_runtime.sql), [`apps/website/src/app/api/admin/instagram/sync/route.ts`](apps/website/src/app/api/admin/instagram/sync/route.ts), [`apps/website/src/app/admin/apps/instagram/page.tsx`](apps/website/src/app/admin/apps/instagram/page.tsx) |
| **Type** | Missing schema / incomplete feature |
| **Status** | ✅ Resolved |
| **Description** | Production had no Instagram post/grid/cell tables. “Connect Instagram” and “Sync Now” had no handlers, product search parsed the wrong response key, category tagging had state but no UI, and the app never read saved social credentials. |
| **Impact** | Every Instagram API route failed in production and the admin page could not import or publish a functional feed. |
| **ResolvedBy** | Codex on 2026-06-23 — added the idempotent schema, Graph API sync/status route, working settings controls, dynamic product/category tagging, moderation queue, and published-feed filtering. |

### WIRING-HIGH-001: Instagram Webhook Creates Unrenderable Rows Without Authenticating Meta

| Field | Value |
|-------|-------|
| **File(s)** | [`apps/website/src/app/api/webhooks/instagram/route.ts`](apps/website/src/app/api/webhooks/instagram/route.ts), [`apps/website/src/lib/instagram-sync.ts`](apps/website/src/lib/instagram-sync.ts) |
| **Type** | Webhook security / API-to-DB wiring |
| **Status** | ✅ Resolved |
| **Description** | The webhook used a hardcoded fallback token, accepted unsigned POSTs, and inserted only a media ID despite `image_url` being required. |
| **Impact** | Spoofed requests could reach the ingestion path, while legitimate notifications failed or produced unusable posts. |
| **ResolvedBy** | Codex on 2026-06-23 — loads admin-saved verification credentials, verifies `x-hub-signature-256`, fetches media details from Meta, and upserts moderation-ready posts. |

---

## Discovery Log

| Date | Gap ID | Discovered By | Notes |
|------|--------|---------------|-------|
| 2026-06-20 | GAP-HIGH-019 through GAP-HIGH-022 | Codex theme-builder audit | Typed form is bypassed, mutations/import are unsafe, many settings are inert, and editing scope stops at homepage/header/footer |
| 2026-06-20 | GAP-MED-041 through GAP-MED-046 | Codex theme-builder audit | Global/footer contracts, preview usability, asset health, responsive controls, and onboarding gaps |
| 2026-06-20 | GAP-CRIT-004 | Codex comprehensive feature audit | Admin OTP generation returns the OTP to the requester and logs it |
| 2026-06-20 | GAP-HIGH-010 through GAP-HIGH-012 | Codex comprehensive feature audit | JWT fallback secret, undelivered password reset, and incomplete API security controls/regression coverage |
| 2026-06-20 | GAP-HIGH-013 through GAP-HIGH-018 | Codex product and market audit | Persistent project, feasibility, trade, lifecycle, attribution, and Room Passport opportunities |
| 2026-06-20 | GAP-MED-036 through GAP-MED-040 | Codex comprehensive feature audit | Lead lookup, RFQ notification mapping, quote lifecycle, catalog quality, and end-to-end coverage gaps |
| 2026-06-16 | GAP-CRIT-001 | System Analysis | Manual review of leads route — commented MVP shortcut |
| 2026-06-16 | GAP-CRIT-002 | System Analysis | Messages route has no DB writes |
| 2026-06-16 | GAP-HIGH-001 | System Analysis | QuoteCart.tsx uses localStorage exclusively |
| 2026-06-16 | GAP-HIGH-002 | System Analysis | Telegram client file exists but no callers |
| 2026-06-16 | GAP-HIGH-003 | System Analysis | Ledger/scoring system has no consumer |
| 2026-06-16 | GAP-HIGH-004 | System Analysis + STATUS.md | No products listing/detail page routes exist |
| 2026-06-16 | GAP-MED-001 | Code review | Two identical case blocks in switch statement |
| 2026-06-16 | GAP-MED-002 | Code review | Hardcoded categories in AppointmentPicker |
| 2026-06-16 | GAP-MED-003 | STATUS.md + admin page listing | No analytics routes exist |
| 2026-06-16 | GAP-MED-004 | Admin roadmap + Quotations.ts review | No PDF generation |
| 2026-06-16 | GAP-MED-005 | Admin roadmap + Products.ts review | No variant fields |
| 2026-06-16 | GAP-MED-006 | Admin roadmap | No bulk edit API/UI |
| 2026-06-16 | GAP-MED-007 | Admin roadmap | No missing-data filters |
| 2026-06-16 | GAP-MED-008 | Route listing review | Customer pages exist but functionality unverified |
| 2026-06-16 | GAP-MED-009 | Frontend audit | `/products` linked from layout, homepage, QuoteCart, success page — all 404 |
| 2026-06-16 | GAP-MED-010 | Frontend audit | Customer dashboard/RFQ pages link to `/products` |
| 2026-06-16 | GAP-MED-011 | Frontend audit | 4 components depend on `/api/customers/me` — existence unverified |
| 2026-06-16 | GAP-MED-012 | Frontend audit | Admin "Back to Home" links to `/` instead of `/admin` |
| 2026-06-16 | GAP-MED-013 | Frontend audit | No `admin/page.tsx` exists |
| 2026-06-16 | GAP-MED-014 | Frontend audit | Admin quotations list has no loading skeleton |
| 2026-06-16 | GAP-MED-015 | Frontend audit | No admin RFQ management pages exist |
| 2026-06-16 | GAP-LOW-001 | Quotations.ts line 238 review | Underscore placeholder for account number |
| 2026-06-16 | GAP-LOW-002 | ChatWidget.tsx line 37 review | Fallback dummy Viber number |
| 2026-06-16 | GAP-LOW-003 | schema.sql + STATUS.md review | Schema never migrated |
| 2026-06-16 | GAP-LOW-004 | Agent definition cross-reference | component-map.md referenced but missing |
| 2026-06-16 | GAP-LOW-005 | Code review | Bare catch blocks in customer-sync.ts |
| 2026-06-16 | GAP-LOW-006 | Frontend audit | Login/register use inline styles, no CSS classes |
| 2026-06-16 | GAP-LOW-007 | Frontend audit | Status filter immediate vs search requires submit |
| 2026-06-16 | GAP-LOW-008 | Frontend audit | ChatWidget dual rendering paths for greeting states |
| 2026-06-16 | GAP-LOW-009 | Frontend audit | `msgCounter` re-initialized each render (useRef needed) |
| 2026-06-16 | GAP-LOW-010 | Frontend audit | `handleAutoLead` silent catch swallows errors |
| 2026-06-16 | GAP-LOW-011 | Frontend audit | Bank placeholder in new quotation form DEFAULT_TERMS |
| 2026-06-16 | GAP-LOW-012 | Frontend audit | ProductRecommendationCard `url` field unused |
| 2026-06-16 | GAP-LOW-013 | Frontend audit | Viber number not clickable as viber:// link |
| 2026-06-16 | GAP-LOW-014 | Frontend audit | Admin quotation edit page has no delete action |
| 2026-06-16 | GAP-LOW-015 | Frontend audit | Quotation view "Back to Home" lacks context |
| 2026-06-16 | GAP-HIGH-005 | PayloadCMS/DaVinciOS remnants audit | ✅ Fixed — Hook already migrated to `findOne()` from `@/lib/db`. No code change needed. |
| 2026-06-16 | GAP-HIGH-006 | PayloadCMS/DaVinciOS remnants audit | 4 chatbot service files call DaVinciOS REST API endpoints that no longer exist |
| 2026-06-16 | GAP-MED-016 | PayloadCMS/DaVinciOS remnants audit | 6 dead `DaVinciOS_*` tables in PostgreSQL schema |
| 2026-06-16 | GAP-MED-017 | PayloadCMS/DaVinciOS remnants audit | 3 build/scan tools reference DaVinciOS/PayloadCMS |
| 2026-06-16 | GAP-MED-018 | PayloadCMS/DaVinciOS remnants audit | Seed scripts load DaVinciOS-named JSON files |
| 2026-06-16 | GAP-LOW-016 | PayloadCMS/DaVinciOS remnants audit | 4 files have comments/docs referencing DaVinciOS |
| 2026-06-16 | GAP-LOW-017 | PayloadCMS/DaVinciOS remnants audit | Auth module has PayloadCMS PBKDF2 fallback code |
| 2026-06-16 | GAP-LOW-018 | PayloadCMS/DaVinciOS remnants audit | customer-sync.ts comments reference DaVinciOS API |
| 2026-06-16 | GAP-HIGH-007 | Compilation audit | SEOHealth.ts imports `GlobalConfig` from `@davincios/cms` — package not installed, blocks build |
| 2026-06-16 | GAP-HIGH-008 | Compilation audit | All collection files use `satisfies CollectionConfig`/`GlobalConfig` without type definitions — blocks build |
| 2026-06-16 | GAP-MED-019 | Compilation audit | No custom API routes to replace PayloadCMS auto-generated REST API — blocks frontend + chatbot integration |
| 2026-06-16 | GAP-HIGH-009 | Manual audit | Admin CRUD pages missing for all collections — products, customers, categories, media, pages, redirects have zero admin management UI |
| 2026-06-16 | GAP-MED-020 | Comprehensive repo crawl | Stale `@davincios/*` packages still in `node_modules/` |
| 2026-06-16 | GAP-MED-021 | Comprehensive repo crawl | `tools/payloadcms-ui-3.85.1.tgz` stale artifact |
| 2026-06-16 | GAP-MED-022 | Comprehensive repo crawl | 4 shopify import tools use `DaVinciOS` variable naming |
| 2026-06-16 | GAP-MED-023 | Comprehensive repo crawl | `homeu-schema.sql` has 6 dead `DaVinciOS_*` tables |
| 2026-06-16 | GAP-MED-024 | Comprehensive repo crawl | Deployer MCP SQL column named `DaVinciOS` |
| 2026-06-16 | GAP-MED-025 | Comprehensive repo crawl | Root `package.json` uses `davincios-website` docker tags |
| 2026-06-16 | GAP-MED-026 | Comprehensive repo crawl | GitHub Actions deploy.yml has DaVinciOS branding |
| 2026-06-16 | GAP-MED-027 | Comprehensive repo crawl | 17 `.kilo/` agent/skill files reference DaVinciOS |
| 2026-06-16 | GAP-MED-028 | Comprehensive repo crawl | `.claude/skills/digitalocean-spaces/SKILL.md` outdated |
| 2026-06-16 | GAP-MED-029 | Comprehensive repo crawl | `design-resources/davincios-design-skills/` entire directory, `kilo.json` reference |
| 2026-06-16 | GAP-MED-030 | Comprehensive repo crawl | 5 `agents/*.md` agent definitions reference DaVinciOS |
| 2026-06-16 | GAP-MED-031 | Comprehensive repo crawl | 3 `ai/` AI workflow/instruction files reference DaVinciOS |
| 2026-06-16 | GAP-MED-032 | Comprehensive repo crawl | `tools/cleanup-davincios.mjs` and `tools/rebrand/` dead scripts |
| 2026-06-16 | GAP-MED-033 | Comprehensive repo crawl | `.env.example` still has `DAVINCIOS_SECRET` and `DAVINCIOS_PUBLIC_SERVER_URL` |
| 2026-06-16 | GAP-MED-034 | Comprehensive repo crawl | `kilo.json:178` references dead design-resources path |
| 2026-06-16 | GAP-MED-035 | Comprehensive repo crawl | `tools/build-and-deploy.mjs` has dead DaVinciOS deletion commands |
| 2026-06-19 | GAP-MED-035 | CDN media wiring audit | Admin media uploads save to local disk, not DO Spaces |
| 2026-06-19 | GAP-LOW-019 | CDN media wiring audit | Homepage slideshow uses hardcoded Shopify CDN URLs |
| 2026-06-19 | GAP-LOW-020 | CDN media wiring audit | Favicon still points to Shopify CDN |
| 2026-06-19 | GAP-LOW-021 | CDN media wiring audit | Chat image uploads save to local disk, not DO Spaces |

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-06-22 | **Logged and verified GAP-MED-047: inconsistent product photo backgrounds** — Claude applied a free collage treatment (desaturate/tint plus overlay). Follow-up live review found the homepage's 12 featured products and the Living Room collection already read cohesively, so catalog-wide paid regeneration is not justified. The existing `product-image-studio` was confirmed healthy, but its paid render/queue and migration routes are unauthenticated with wildcard CORS; DaVinciOS integration is blocked until that service is secured, then any generation should begin as a review-only pilot for one visibly failing collection. | Claude / Codex |
| 2026-06-21 | **Fixed admin media upload writing to ephemeral container disk instead of DO Spaces** — Resolved RES-007: the "Upload a new file" path in the media picker wrote to `public/uploads/` on the website container's filesystem (no volume mount — destroyed on every deploy) despite its own docs claiming it used DigitalOcean Spaces, and never registered the file in the `media` table. Added `lib/do-spaces.ts`, wired it to the admin-configured CDN settings (added the missing `doSpacesRegion` field), rewrote the route to do real sha256 dedupe + Spaces upload + `media` row insert, and verified PUT/GET/DELETE against real production credentials. | Claude |
| 2026-06-21 | **Unified no-code settings platform finished and wired to runtime** — Resolved RES-006: added the missing `"DaVinciOS_kv"` table (`015_davincios_kv.sql`), removed a broken duplicate migration that seeded fake defaults via an unset Postgres GUC, made the AI provider and Telegram alert sender read admin-saved settings instead of only env vars, gave the storefront chat widget a real public config endpoint (fixing a dead `enableChat` toggle and Viber number that previously only existed in `NEXT_PUBLIC_*` build-time env vars), and replaced a non-functional TypeScript-in-`.mjs` test with a passing 18-check wiring audit. | Claude |
| 2026-06-21 | **RFQ chat local migration drift + Facebook inbox webhook schema fix** — Resolved RES-005: re-applied `005_add_rfq_chat.sql` against the local DB (tables were missing despite the migration ledger claiming they'd run), rewrote the Facebook webhook to match the real `inbox_contacts`/`inbox_messages` schema, and added `014_inbox_id_defaults.sql` so the leftover PayloadCMS-era `inbox_*` tables generate their own `id` again now that the framework that used to do it is gone. Verified end-to-end with a simulated webhook insert chain; TypeScript and preflight pass. | Claude |
| 2026-06-21 | **Admin insights wiring repair** — Resolved RES-004 across storefront analytics, live visitors, durable appointment booking, direct lead/appointment detail and status updates, authenticated report exports/preferences, workflow task creation/update integrity, and canonical runtime migrations. Added 20 contract checks; TypeScript, production build, and preflight pass. | Codex |
| 2026-06-20 | **Complete no-code theme-builder audit** - Verified 22 registered section types, 18 body renderers, four footer components, 13 current database sections, API availability, and passing TypeScript. Added 10 active gaps covering typed editor controls, mutation/import safety, inert settings, full-site template scope, global/footer contracts, preview usability, media health, responsive controls, and onboarding. Added audit scorecard and repair order. Summary updated to 62 active + 36 resolved. | Codex |
| 2026-06-20 | **Comprehensive feature, market, and product-gap audit** - Added 15 active gaps: OTP disclosure (critical); authentication, customer recovery, API security, persistent projects, room feasibility, trade workflows, follow-up automation, attribution, and Room Passport (high); lead lookup, RFQ mapping, quotation lifecycle, catalog quality, and E2E coverage (medium). Added the verified feature baseline, current market signals, and Room Passport delivery sequence. Summary updated to 52 active + 36 resolved. | Codex |
| 2026-06-17 | **False-positive sweep corrected** — 9 medium gaps marked resolved (false positives): MED-021 (DaVinciOS variable naming correct), MED-026 (17 agent/skill files correct), MED-027 (Claude DO-Spaces skill correct), MED-028 (design resources correct), MED-029 (agent definitions correct), MED-030 (AI instructions correct), MED-032 (.env.example DAVINCIOS_SECRET correct — separate from JWT_SECRET), MED-033 (kilo.json ref correct). MED-018 rationale corrected (DaVinciOS- prefix restored). **DaVinciOS IS the backend CMS.** The gap scanner incorrectly flagged legitimate backend references as stale. Summary updated: 33 active (0 critical, 0 high, 16 medium, 17 low) + 36 resolved. Also undid Codex's file rename sweep — restored `DaVinciOS-products.json` etc. across 11 files. | Kilo (thinker) |
| 2026-06-16 | Initial gap analysis created (22 entries: 19 active, 3 resolved) | System |
| 2026-06-16 | Frontend audit completed — added 17 new gaps (7 medium, 10 low) covering storefront, admin panel, and chat widget components. Total: 39 entries (36 active, 3 resolved) | System |
| 2026-06-16 | PayloadCMS/DaVinciOS remnants audit — added 8 new gaps (2 high, 3 medium, 3 low) covering compilation blockers, missing API endpoints, dead DB tables, stale tooling, and documentation debt. Total: 47 entries (44 active, 3 resolved) | System |
| 2026-06-16 | Compilation audit + Phase 2 Implementation Plan — added 3 new gaps (2 high, 1 medium) covering compilation errors and missing API routes. Phase 2 plan defined with 6 sub-phases (A-F) targeting resolution of 30 gaps. Total: 50 entries (47 active, 3 resolved) | System |
| 2026-06-16 | Comprehensive repo crawl — full `rg` / `ripgrep` audit of entire codebase for Payload CMS / DaVinciOS references. Found 82 items across agents, skills, tools, docs, configs, node_modules, schemas, and design resources. Added 16 new medium gaps (MED-020 through MED-035) plus low fixes for comments. Updated Phase 2-F with 14 cleanup steps. Total: 69 entries (66 active, 3 resolved) | System |
| 2026-06-16 | ✅ **GAP-MED-017** resolved — removed `payloadcms-ui*` line from `build-and-deploy.mjs`. Renamed all `DaVinciOS-*.json` output files to clean names and updated all consuming scripts. Total: 50 entries (45 active, 5 resolved) | Codex |
| 2026-06-16 | ✅ **GAP-LOW-016** resolved — updated DaVinciOS comments in seo-audit.mjs, seed-seo-health.mjs, seed-postgres.mjs, docker/nginx.conf, Customers.ts. ✅ **GAP-LOW-017** resolved — auth.ts already uses bcryptjs, no PBKDF2 fallback present. ✅ **GAP-LOW-018** resolved — customer-sync.ts comments already clean. Added error logging to 3 bare catch blocks. Total: 50 entries (42 active, 8 resolved) | Codex |
| 2026-06-16 | **Phase 2-C: Products admin CRUD built** — ✅ `apps/website/src/app/admin/products/page.tsx` (list with search/filter/pagination), `apps/website/src/app/admin/products/[id]/page.tsx` (edit form), `apps/website/src/app/admin/products/new/page.tsx` (create form). Dashboard Products count link updated from `/admin/collections/products` to `/admin/products`. GAP-HIGH-009 updated to reflect Products ✅ resolved. Total: 50 entries (41 active, 9 resolved) | Codex |
| 2026-06-16 | **Gap verification sweep** — Audited all 6 compilation-blocking and critical gaps against live code. Found all already resolved: ✅ **CRIT-001** (leads insert in route.ts + db.ts), ✅ **CRIT-002** (messages insert in message/route.ts + db.ts), ✅ **HIGH-006** (4 chatbot services use direct DB, no HTTP calls), ✅ **HIGH-002** (Telegram alerts wired to leads, messages, rfq routes), ✅ **HIGH-007** (SEOHealth.ts imports from local types/davincios, not @davincios/cms), ✅ **HIGH-008** (davincios.d.ts exists, all 8 collections import CollectionConfig/GlobalConfig). Updated GAP_LOG.md status, Summary counts (55 active, 14 resolved), and Phase 2 plan to reflect resolved state. Total: 69 entries (55 active, 14 resolved) | Roo (Code mode) |
| 2026-06-16 | ✅ **GAP-MED-001** resolved — duplicate `case 'CUSTOM_FURNITURE'` already removed from message router. Only one case remains, paired with COMPLAINT. Summary updated (54 active, 15 resolved) | Roo (Code mode) |
| 2026-06-19 | **CDN media wiring audit** — Added 4 new gaps (1 medium, 3 low) covering the DO Spaces CDN not being wired for admin uploads, slideshow Shopify URLs, favicon Shopify URL, and chat uploads to local disk. Products/categories bulk migration to DO Spaces was ✅ done, but live upload pipeline and a few frontend assets still bypass the CDN. Summary updated (37 active, 36 resolved) | Roo (Debug mode) |
| 2026-06-19 | **Featured pieces product curator** — Added new "curated" source mode for `featured_products` section, visual ProductPicker modal with category filter tabs, search, and multi-select. Created API endpoint `/api/admin/products/picker`, `ProductPicker.tsx` component, and wired in-preview product click → picker flow. Updated HomeSections renderer, theme-schemas, ThemeEditor, PreviewBridge, and admin exports. ✅ Resolved GAP-MED-FEATURED-PICKER. Summary updated (37 active, 37 resolved) | SuperRoo (Code mode) |
| 2026-06-21 | **Admin Settings E2E Audit** — Audited all 6 settings pages. Found 2 fully broken (Store, Notifications), 1 wired but with incomplete features (System/Security), 1 navigation bug (tab active state). Added: Social Channels settings page + API + FB Messenger webhook + E2E test script. Summary updated (66 active, 37 resolved) | SuperRoo (Code mode) |
| 2026-06-23 | **Theme customizer slideshow controls and cleanup** — Wired slides overlay opacity/color, button style mapping, responsive mobile image swaps, custom text alignment, and min/max heights. Removed obsolete `theme-schemas.ts` and updated nightly QA checks. Resolved GAP-HIGH-019. | Antigravity |
