# DaVinciOS Gap Log

> **Purpose:** Single source of truth for known gaps, missing features, and technical debt across the DaVinciOS system.
> **Scope:** Covers the DaVinciOS CMS backend, chatbot concierge, API routes, admin panel, frontend components, collections, deployment pipeline, and agent definitions.
> **Status:** Active — gaps are logged for tracking by all Kilo Code extensions and agents.
> **Last Updated:** 2026-06-16

---

## How to Use This Log

1. **Before coding:** Check this log for known gaps in the area you're working on.
2. **After fixing a gap:** Update its status to `✅ Resolved` and add a `ResolvedBy` note with the date and agent.
3. **When discovering a new gap:** Add it to the appropriate priority section with all required fields.

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
| **Status** | 🔴 Active |
| **Description** | Lead data is generated with `crypto.randomUUID()` but never INSERTed into the `chatbot.leads` table. Comment at line 43 reads: *"In production, INSERT INTO chatbot.leads — For MVP, generate IDs"*. All lead data is lost on server restart. |
| **Impact** | Leads cannot be queried, reported on, or linked to quotations after server restart. Zero data durability. |
| **Root Cause** | MVP shortcut — the `chatbot.schema.sql` defines 9 tables but the API route never calls them. |
| **Fix Guidance** | Add a SQL INSERT to `chatbot.leads` and `chatbot.conversations` tables (via `@vercel/postgres` or the existing pg pool). Update the response to return the real DB-generated IDs. Also persist each chat message to `chatbot.messages`. |

### GAP-CRIT-002: Chat Messages Not Persisted to Database

| Field | Value |
|-------|-------|
| **File(s)** | [`apps/website/src/app/api/chat/message/route.ts`](apps/website/src/app/api/chat/message/route.ts) |
| **Type** | Missing DB integration |
| **Status** | 🔴 Active |
| **Description** | Chat messages are processed and replied to via the AI provider, but never written to `chatbot.messages` or any persistent store. |
| **Impact** | No chat history survives page refresh. Admin cannot review past conversations. |
| **Fix Guidance** | After processing each message, INSERT into `chatbot.messages(conversation_id, role, content, metadata)` using the conversationId from the lead. |

---

## 🟠 High Severity Gaps

### GAP-HIGH-001: RFQ Cart is localStorage-Only

| Field | Value |
|-------|-------|
| **File(s)** | [`apps/website/src/components/QuoteCart.tsx`](apps/website/src/components/QuoteCart.tsx) |
| **Type** | Missing server-side persistence |
| **Status** | 🟠 Active |
| **Description** | RFQ items are stored in `localStorage` only. Cart contents are lost between devices and browser sessions. No server-side cart API exists. |
| **Impact** | Users cannot resume RFQ across devices. Admin cannot see abandoned carts. |
| **Fix Guidance** | Create a server-side cart API (`/api/cart`) backed by either a `cart_items` table or Redis. Sync cart state between localStorage and server on lead creation and page load. |

### GAP-HIGH-002: Telegram Client Not Wired to Any Workflow

| Field | Value |
|-------|-------|
| **File(s)** | [`apps/website/src/lib/chatbot/telegram-client.ts`](apps/website/src/lib/chatbot/telegram-client.ts) |
| **Type** | Dead code / Missing integration |
| **Status** | 🟠 Active |
| **Description** | `sendTelegramAlert()` is fully implemented with formatting for 5 event types (NEW_LEAD, RFQ_SUBMITTED, APPOINTMENT_REQUESTED, ESCALATION, HOT_LEAD), but no API route or workflow calls it. |
| **Impact** | Sales team receives no real-time notifications for new leads, RFQs, or escalations. |
| **Fix Guidance** | Call `sendTelegramAlert()` in: (1) `POST /api/chat/leads` after lead creation, (2) `POST /api/rfq/submit` after submission, (3) `POST /api/appointments/request` after booking, (4) `POST /api/chat/message` when intent is `SALES_HANDOFF` or `COMPLAINT`. |

### GAP-HIGH-003: Lead Scoring Ledger Exists But Never Consumed

| Field | Value |
|-------|-------|
| **File(s)** | [`apps/website/src/lib/chatbot/lead-scorer.ts`](apps/website/src/lib/chatbot/lead-scorer.ts), [`apps/website/src/lib/chatbot/ledger.ts`](apps/website/src/lib/chatbot/ledger.ts), [`apps/website/src/app/api/chat/ledger/route.ts`](apps/website/src/app/api/chat/ledger/route.ts) |
| **Type** | Feature incomplete |
| **Status** | 🟠 Active |
| **Description** | The event-sourcing lead scoring system (createSignal → appendToLedger → computeScore) is fully coded. The API route at `/api/chat/ledger` exists. But no dashboard or admin panel reads the ledger to display lead scores, heat maps, or conversion metrics. |
| **Impact** | Lead scoring data is collected but invisible to the admin team. No ROI on the scoring infrastructure. |
| **Fix Guidance** | Build a lead scoring dashboard component that queries `/api/chat/ledger?leadId=xxx`. Add score visualization to the admin lead detail page. Create a summary endpoint that aggregates scores across all leads. |

### GAP-HIGH-004: Product Listing and Detail Pages Incomplete

| Field | Value |
|-------|-------|
| **File(s)** | (No `products/` or `collections/` page route exists under `apps/website/src/app/`) |
| **Type** | Missing frontend pages |
| **Status** | 🟠 Active |
| **Description** | The admin panel and collections exist, but there are no public-facing product listing pages (e.g., `/products` or `/collections/[slug]`) or product detail pages (e.g., `/products/[slug]`). The STATUS.md confirms these are "🔧 Building". |
| **Impact** | The public storefront has no product catalog. Users can only discover products through the chatbot. |
| **Fix Guidance** | Build `apps/website/src/app/products/page.tsx` (listing) and `apps/website/src/app/products/[slug]/page.tsx` (detail). Use the DaVinciOS REST API to fetch products. Include category filtering, search, and SEO metadata. |

---

## 🟡 Medium Severity Gaps

### GAP-MED-001: Duplicate `case 'CUSTOM_FURNITURE'` in Message Router

| Field | Value |
|-------|-------|
| **File(s)** | [`apps/website/src/app/api/chat/message/route.ts:167-180`](apps/website/src/app/api/chat/message/route.ts:167) |
| **Type** | Code bug / Dead code |
| **Status** | 🟡 Active |
| **Description** | Two identical `case 'CUSTOM_FURNITURE':` blocks exist in the switch statement. The first (line 167) offers complaint handling. The second (line 175) overrides it — the second case will never execute because the first `break` exits the switch. |
| **Impact** | Custom furniture inquiries get a generic "connect with sales" response instead of the intended "design team" message. |
| **Fix Guidance** | Remove the first CUSTOM_FURNITURE case (lines 167-173) and keep only the second one (lines 175-180) with the design team message. Or merge both intents correctly. |

### GAP-MED-002: Appointment Categories Hardcoded

| Field | Value |
|-------|-------|
| **File(s)** | [`apps/website/src/components/chat/AppointmentPicker.tsx:73-81`](apps/website/src/components/chat/AppointmentPicker.tsx:73) |
| **Type** | Maintenance burden |
| **Status** | 🟡 Active |
| **Description** | Categories like "Dining Chairs", "Sofas", "Tables", etc. are hardcoded in the JSX `<select>`. They are not fetched from the DaVinciOS `Categories` collection via API. |
| **Impact** | Each time a category is added/renamed in the CMS admin, the frontend component must be manually updated and redeployed. |
| **Fix Guidance** | Fetch categories from `/api/categories` on component mount (in `useEffect`). Fall back to hardcoded list if API is unavailable. Update the categories collection to include display order and description. |

### GAP-MED-003: No Admin Analytics Dashboard

| Field | Value |
|-------|-------|
| **File(s)** | (No analytics page route exists under `apps/website/src/app/admin/`) |
| **Type** | Missing feature |
| **Status** | 🟡 Active |
| **Description** | No lead analytics, conversion funnel, RFQ pipeline stats, or sales dashboard exists in the admin panel. STATUS.md lists "Migration Dashboard" and "Quotation Dashboard" as P2 pending. |
| **Impact** | Business decisions are made without data. No visibility into lead sources, conversion rates, or sales performance. |
| **Fix Guidance** | Build `apps/website/src/app/admin/analytics/page.tsx` with: lead volume over time, conversion funnel (visit → lead → RFQ → quotation → sale), top products by RFQ count, sales by buyer type. Use Recharts or similar charting library. |

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
| **File(s)** | [`apps/website/src/app/api/products/`](apps/website/src/app/api/products/) |
| **Type** | Missing feature |
| **Status** | 🟡 Active |
| **Description** | The admin roadmap lists "add bulk edit for status, category, channel, and SEO" but no bulk operations API or UI exists. |
| **Impact** | Managing 1000+ products requires editing each one individually. |
| **Fix Guidance** | Add a `PATCH /api/products/bulk` endpoint accepting an array of product IDs and a partial update payload. Add bulk action toolbar in the admin products list view. |

### GAP-MED-007: No "Missing Data" Admin Filters

| Field | Value |
|-------|-------|
| **File(s)** | [`apps/website/src/app/api/products/`](apps/website/src/app/api/products/) |
| **Type** | Missing feature |
| **Status** | 🟡 Active |
| **Description** | The admin roadmap mentions filters for "no image, no SEO, no price, no category" to help staff identify incomplete products. Not implemented. |
| **Impact** | Products with missing data slip through. SEO health suffers. |
| **Fix Guidance** | Add query params to the products API: `?missing=image`, `?missing=seo`, `?missing=price`, `?missing=category`. Add corresponding filter UI in admin products list. |

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
| **File(s)** | [`apps/website/src/app/layout.tsx:35`](apps/website/src/app/layout.tsx:35), [`apps/website/src/app/page.tsx:8`](apps/website/src/app/page.tsx:8), [`apps/website/src/components/QuoteCart.tsx:279`](apps/website/src/components/QuoteCart.tsx:279), [`apps/website/src/app/quote-cart/page.tsx:257`](apps/website/src/app/quote-cart/page.tsx) |
| **Type** | Broken navigation |
| **Status** | 🟡 Active |
| **Description** | The site nav header, homepage hero CTA ("View Products"), QuoteCart empty state, and RFQ success page all link to `/products` — which returns 404 because the route doesn't exist. At least 5 separate references across 4 files. |
| **Impact** | Every user clicking "Products" or "Browse Products" hits a dead page. Core navigation is broken. |
| **Fix Guidance** | Either (a) build the `/products` listing page (see GAP-HIGH-004), or (b) temporarily redirect `/products` to `/quote-cart` or the homepage until product pages are built. |

### GAP-MED-010: Customer Dashboard Links to `/products` (Dead Link)

| Field | Value |
|-------|-------|
| **File(s)** | [`apps/website/src/app/customer/dashboard/page.tsx:110,150`](apps/website/src/app/customer/dashboard/page.tsx:110), [`apps/website/src/app/customer/rfq/[id]/page.tsx:254`](apps/website/src/app/customer/rfq/[id]/page.tsx:254) |
| **Type** | Broken navigation |
| **Status** | 🟡 Active |
| **Description** | The customer dashboard "Browse Products" and "+ New RFQ" buttons both link to `/products`. The RFQ detail page also has a "Browse Products" link to `/products`. All are dead links. |
| **Impact** | Logged-in customers who want to submit a new RFQ or browse products hit a 404 page. |
| **Fix Guidance** | Same as GAP-MED-009 — build `/products` route or redirect. Additionally, "+ New RFQ" could link to `/quote-cart` as a stopgap since that's where customers add items. |

### GAP-MED-011: `/api/customers/me` Endpoint Existence Unverified

| Field | Value |
|-------|-------|
| **File(s)** | [`apps/website/src/app/customer/dashboard/page.tsx:44`](apps/website/src/app/customer/dashboard/page.tsx:44), [`apps/website/src/app/customer/rfq/[id]/page.tsx:56`](apps/website/src/app/customer/rfq/[id]/page.tsx:56), [`apps/website/src/app/customer/quotation/[id]/page.tsx:58`](apps/website/src/app/customer/quotation/[id]/page.tsx:58), [`apps/website/src/components/QuoteCart.tsx:135`](apps/website/src/components/QuoteCart.tsx:135) |
| **Type** | Missing endpoint |
| **Status** | 🟡 Active |
| **Description** | The customer dashboard, RFQ detail, quotation view, and QuoteCart all call `/api/customers/me` to verify login and fetch customer profile. If this endpoint doesn't exist (or returns incorrect data), the entire customer dashboard flow is broken — users will be redirected to `/login` in a loop. |
| **Impact** | Customer portal could be completely non-functional if the `customers/me` endpoint is missing or misconfigured. |
| **Fix Guidance** | Verify `/api/customers/me` exists and returns `{ id, name, email, phone, address }`. If missing, implement it using the Customers collection. Add fallback error handling in the frontend if the endpoint is unreachable. |

### GAP-MED-012: Admin "Back to Home" Links Point to `/` Instead of `/admin`

| Field | Value |
|-------|-------|
| **File(s)** | [`apps/website/src/app/admin/quotations/page.tsx:294`](apps/website/src/app/admin/quotations/page.tsx:294) |
| **Type** | Wrong navigation target |
| **Status** | 🟡 Active |
| **Description** | The admin quotations list page has a "Back to Home" link that points to `/`. For admin users, this should go to `/admin` (an admin dashboard) or at minimum `/admin/quotations`. The admin has no dashboard page at all (see GAP-MED-013). |
| **Impact** | Admin users clicking "Back to Home" are taken to the public storefront instead of an admin hub. |
| **Fix Guidance** | Create an admin dashboard at `/admin` (see GAP-MED-013) and update the link. As a stopgap, link to `/admin/quotations` instead of `/`. |

### GAP-MED-013: No Admin Dashboard/Index Page

| Field | Value |
|-------|-------|
| **File(s)** | (No `apps/website/src/app/admin/page.tsx` exists — only `admin/quotations/`) |
| **Type** | Missing page |
| **Status** | 🟡 Active |
| **Description** | The admin panel has no root landing page. Visiting `/admin` returns 404. The only admin route is `/admin/quotations/`. There is no navigation hub, stats overview, or quick-action menu for admin users. |
| **Impact** | Admin users have no entry point to the admin panel. No way to navigate between admin sections (when more are added). |
| **Fix Guidance** | Create `apps/website/src/app/admin/page.tsx` as an admin dashboard with: navigation links to all admin sections, recent activity feed, quick stats (pending RFQs, draft quotations, new leads), and links to analytics when available. |

### GAP-MED-014: No Loading Skeleton for Admin Quotations List

| Field | Value |
|-------|-------|
| **File(s)** | [`apps/website/src/app/admin/quotations/page.tsx:170-173`](apps/website/src/app/admin/quotations/page.tsx:170-173) |
| **Type** | Poor UX |
| **Status** | 🟡 Active |
| **Description** | The admin quotations list shows a simple "Loading quotations..." text while fetching data. No skeleton UI, shimmer effect, or placeholder table rows to indicate layout during loading. |
| **Impact** | Perceived performance is poor. Admin users see a blank page with text instead of a structured loading state. |
| **Fix Guidance** | Replace the text loading state with a skeleton table that mimics the quotation rows layout (3-5 placeholder rows with shimmer animation). Use CSS or a library like `react-loading-skeleton`. |

### GAP-MED-015: No Admin RFQ Management Pages

| Field | Value |
|-------|-------|
| **File(s)** | (No `apps/website/src/app/admin/rfq/` routes exist) |
| **Type** | Missing feature |
| **Status** | 🟡 Active |
| **Description** | RFQ (Request for Quotation) data is collected from customers and stored via `/api/rfq`, and the new quotation page can import from RFQs. But there is no admin page to list, search, filter, or manage RFQs directly. The admin can only see RFQs when creating a new quotation via the RFQ picker modal. |
| **Impact** | Admin staff cannot review pending RFQs, track RFQ status changes, or manage the RFQ pipeline without creating a dummy quotation. |
| **Fix Guidance** | Build `apps/website/src/app/admin/rfq/page.tsx` (list with search/filter/status) and `apps/website/src/app/admin/rfq/[id]/page.tsx` (detail view with action to convert to quotation). Copy patterns from the existing quotations pages. |

---

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
| **Status** | 🔵 Active |
| **Description** | The `ProductRec` interface defines a `url` field, but the component never renders it as a clickable link. Product recommendation cards are purely visual with an "Add to RFQ Cart" button — users can't click the product name or image to see details. |
| **Impact** | Users cannot navigate to product detail pages from chat recommendations. (However, this is blocked by `/products` route absence — GAP-HIGH-004/GAP-MED-009.) |
| **Fix Guidance** | Once product detail pages exist, wrap the product card in a `<Link href={product.url}>` or add a "View Details" button. The `url` field is already populated by the API — it just needs a route to point to. |

### GAP-LOW-013: Viber Number Not Clickable as `viber://` Link

| Field | Value |
|-------|-------|
| **File(s)** | [`apps/website/src/components/chat/ViberHandoff.tsx:15`](apps/website/src/components/chat/ViberHandoff.tsx:15) |
| **Type** | Missing UX improvement |
| **Status** | 🔵 Active |
| **Description** | The Viber number is displayed as plain text. It should be a clickable `viber://chat?number=+639171234567` link or `tel:+639171234567` link for mobile users. |
| **Impact** | Users must manually copy the number and open Viber. Adds friction to the handoff flow. |
| **Fix Guidance** | Wrap the Viber number in an `<a href={`viber://chat?number=${viberNumber.replace(/[^0-9]/g, '')}`}>` tag. Add a fallback `tel:` link for devices without Viber. Add a "Copy to Clipboard" button as secondary option. |

### GAP-LOW-014: Admin Quotations Edit Page Has No Delete/Archive Action

| Field | Value |
|-------|-------|
| **File(s)** | [`apps/website/src/app/admin/quotations/[id]/page.tsx`](apps/website/src/app/admin/quotations/[id]/page.tsx) |
| **Type** | Missing UI action |
| **Status** | 🔵 Active |
| **Description** | The quotations list page (`page.tsx`) has a "Delete" button for each quotation. However, the individual quotation edit/detail page (`[id]/page.tsx`) has no delete or archive button. Admin must go back to the list to delete a quotation. |
| **Impact** | Minor inconvenience — admin can't delete a quotation while viewing/editing it. |
| **Fix Guidance** | Add a "Delete Quotation" button to the edit page (with confirmation dialog). Place it next to the "Mark as Sent" button, styled in red/outline style to prevent accidental clicks. |

### GAP-LOW-015: `/quotation/[id]` "Back to Home" Always Links to `/` Without Context

| Field | Value |
|-------|-------|
| **File(s)** | [`apps/website/src/app/quotation/[id]/page.tsx:120`](apps/website/src/app/quotation/[id]/page.tsx:120) |
| **Type** | Missing contextual navigation |
| **Status** | 🔵 Active |
| **Description** | The print-friendly quotation view page links "Back to Home" to `/`. This page is linked from both the admin panel (admin editing a quotation → "Preview") and the customer dashboard (customer viewing their quotation). Both contexts go to the same `/` destination, which is wrong for admin users. |
| **Impact** | Admin users clicking "Back to Home" from the quotation preview are taken to the public homepage instead of the admin panel. |
| **Fix Guidance** | Check `document.referrer` or add a query parameter (`?from=admin` or `?from=customer`) to the preview link. Render a context-appropriate back link: `/admin/quotations` for admin, `/customer/dashboard` for customers. |

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

---

## 📊 Summary

| Priority | Active Count | Key Items |
|----------|-------------|-----------|
| 🔴 Critical | 2 | Leads not persisted, Messages not persisted |
| 🟠 High | 4 | RFQ cart localStorage, Telegram dead code, Lead scoring unused, Product pages missing |
| 🟡 Medium | 15 | Duplicate case, Hardcoded categories, No analytics, No PDF quotes, No variants, No bulk edit, No missing-data filters, Customer dashboard incomplete, `/products` 404 everywhere, Admin back-links wrong, No admin dashboard, No loading skeleton, No admin RFQ pages, `/api/customers/me` unverified |
| 🔵 Low | 15 | Bank placeholder, Viber placeholder, Schema not applied, component-map.md missing, Bare catch blocks, Inline auth styles, UX inconsistency, Dual rendering paths, `msgCounter` reset, Silent catch, Bank placeholder in new form, Product URL unused, Viber not clickable, No delete on edit page, Contextual back-link missing |
| ✅ Resolved | 3 | SEOHealth exists, Agent tool files exist, Admin quotations page exists |
| **Total** | **39** | **36 active + 3 resolved** |

---

## Discovery Log

| Date | Gap ID | Discovered By | Notes |
|------|--------|---------------|-------|
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

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-06-16 | Initial gap analysis created (22 entries: 19 active, 3 resolved) | System |
| 2026-06-16 | Frontend audit completed — added 17 new gaps (7 medium, 10 low) covering storefront, admin panel, and chat widget components. Total: 39 entries (36 active, 3 resolved) | System |
