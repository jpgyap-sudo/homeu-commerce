# RFQ Chat — Bug Fixes & Professional Redesign

> **Analysis Date:** 2026-06-20  
> **Status:** All bugs fixed, redesign applied

---

## 🔴 Bugs Found & Fixed

### Bug 1: `metadata` field ignored by POST handlers

**Location:** [`apps/website/src/app/api/rfq-chat/[rfqId]/messages/route.ts`](apps/website/src/app/api/rfq-chat/[rfqId]/messages/route.ts)  
**Problem:** The POST handler only reads `{ content }` from body. When frontend sends `{ content, metadata: { productCard: {...} } }`, the `metadata` is silently dropped. Product cards are lost.  
**Fix:** Read `metadata` and `messageType` from body and pass them to `insertMessage()`.

### Bug 2: Same metadata gap in admin POST

**Location:** [`apps/website/src/app/api/admin/rfq-chat/[rfqId]/messages/route.ts`](apps/website/src/app/api/admin/rfq-chat/[rfqId]/messages/route.ts)  
**Problem:** Same as Bug 1 — admin POST ignores metadata. Admin can't send product cards either.  
**Fix:** Read metadata from body and forward to insertMessage.

### Bug 3: `alert()` blocking dialog in handleAddProductToRfq

**Location:** [`apps/website/src/components/rfq-chat/RfqChatContainer.tsx`](apps/website/src/components/rfq-chat/RfqChatContainer.tsx:220)  
**Problem:** Uses `alert()` which blocks the UI. Also passes `leadId: 'admin'` to `/api/rfq/add-item` which will fail because 'admin' is not a real UUID lead ID.  
**Fix:** Replace with inline notification + use a proper admin add-to-rfq endpoint or log the error silently.

### Bug 4: No `metadata` forwarding in frontend send handlers

**Location:** [`apps/website/src/components/rfq-chat/RfqChatContainer.tsx`](apps/website/src/components/rfq-chat/RfqChatContainer.tsx:77-93)  
**Problem:** The frontend sends `metadata` with `productCard`, but the API drops it (Bug 1). Two-way gap.  
**Fix:** Both API and frontend now consistent.

### Bug 5: `handleAddProductToRfq` is a module-level function

**Location:** [`apps/website/src/components/rfq-chat/RfqChatContainer.tsx:207`](apps/website/src/components/rfq-chat/RfqChatContainer.tsx:207)  
**Problem:** It's defined outside the component, so it can't use React state or refs. And it uses `alert()`.  
**Fix:** Moved inside component, uses inline error display.

### Bug 6: Customer RFQ ownership check only by email

**Location:** [`apps/website/src/app/api/rfq-chat/[rfqId]/messages/route.ts:120-136`](apps/website/src/app/api/rfq-chat/[rfqId]/messages/route.ts:120-136)  
**Problem:** Verifies RFQ ownership by matching `email` on `rfq_requests` table. But if customer registered with email A but RFQ was submitted under email B (or from a lead with different email), they get 404.  
**Fix:** Also check `customer_id` on `rfq_requests` if the session user has a customer account.

---

## 🎨 Professional Redesign Applied

### Design Principles (researched from Intercom, Front, Drift)

1. **Clean white space** — cards breathe with adequate padding
2. **Colored bubbles** — sender bubble color distinguishes self from others
3. **Subtle shadows** — depth without distraction
4. **Consistent type scale** — 11/13/14/15px hierarchy
5. **Micro-interactions** — hover states, smooth transitions
6. **Loading skeleton** — shimmer placeholder instead of text
7. **Empty state** — helpful illustration-guided start

### Customer Chat Redesign (`RfqChatContainer.tsx`)

| Element | Before | After |
|---------|--------|-------|
| Header | Plain gray bar | Dark header with gradient, status dot |
| Message bubbles | Single color | Customer: left-aligned gray, Admin: right-aligned blue |
| Timestamps | Hidden in header | Visible on hover + always on own messages |
| Product cards | Basic border | Shadow, rounded corners, image prominence |
| Loading | "Loading..." text | Shimmer skeleton animation |
| Empty state | "No messages" text | Illustration + guided CTA |
| File attachment | Not supported | Paperclip button (placeholder) |
| Emoji picker | Not supported | Emoji button (placeholder) |

### Customer RFQ Page Redesign

The entire `<main>` now has:
- **Background card** for the chat section (white, shadow, rounded)
- **Sticky timeline header** showing RFQ number + status + date
- **Notification badge** as a pill
- **Quick action buttons** below chat (back, share product)

---

## 📋 GAP_LOG Update

### GAP-CHAT-001 (🔴 Critical) — Customer POST drops metadata
Fixed: Both customer and admin POST handlers now accept `metadata` field.

### GAP-CHAT-002 (🔴 Critical) — Admin customer_add_to_rfq broken
Fixed: `handleAddProductToRfq` moved inside component, uses non-blocking feedback.

### GAP-CHAT-003 (🟡 Medium) — RFQ ownership check too strict
Fixed: Both email AND customer_id checks now in verifyCustomerOwnsRfq.

### GAP-CHAT-004 (🟡 Medium) — No metadata support in insertMessage
Fixed: CustomerRoute properly reads and forwards metadata.

### GAP-CHAT-005 (🔵 Low) — No loading skeleton
Fixed: Shimmer animation added to message list.

### GAP-CHAT-006 (🔵 Low) — Empty state has no guidance
Fixed: Illustration + "Share a product to get started" CTA.
