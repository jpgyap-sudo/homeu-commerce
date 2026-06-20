# Feature Pipeline — HomeU Commerce

> **Purpose:** Strategic feature initiatives extracted from the GAP_LOG.  
> These are NOT bugs — they are product features to be scoped and built.  
> **Last Updated:** 2026-06-20

---

## ✅ Completed Feature Initiatives

| Feature | Status | Files |
|---------|--------|-------|
| **Quotation Version Engine** | ✅ Built | [`quotation-versions.ts`](apps/website/src/lib/quotation-versions.ts), migration 004, versions API, revision-request API, auto-snapshot on PATCH |
| **Request Revision Flow** | ✅ Built | Customer clicks "Request Revision" → sends message → admin sees pending_revision → admin edits & resolves → version history recorded |
| **Price Formatting** | ✅ Built | [`format-utils.ts`](apps/website/src/lib/format-utils.ts) — formatPrice with commas, Inter font |
| **QuickRFQ Widget** | ✅ Built | [`QuoteCart.tsx`](apps/website/src/components/QuoteCart.tsx) — per-item notes, one-tap add |
| **Animated Gradient Logo** | ✅ Built | `.homeu-gradient-text` CSS class |
| **Section Animations** | ✅ Built | IntersectionObserver + CSS keyframes |
| **Runtime CSS Injection** | ✅ Built | Settings → scoped `<style>` per section |

---

## 🔜 Upcoming Feature Initiatives

### HIGH-013: Persistent Customer Project Workspace
A durable room/project workspace combining saved products, inspiration, measurements, budget, collaborators, and notes.

**Components needed:**
- `projects` table + project_members + project_rooms + project_items
- Anonymous → authenticated merge
- Share links + permissions + activity history
- Convert project → RFQ

**Effort:** Weeks

---

### HIGH-014: Room Fit & Delivery Feasibility Engine
Check product dimensions against room measurements, doorway access, budget, and availability before RFQ.

**Components needed:**
- Room measurement input + product dimension matching
- Deterministic fit rules with explainable warnings
- Staff override with recorded reasons

**Effort:** Weeks

---

### HIGH-015: Trade & Designer B2B Workspace
Organization accounts, trade verification, team roles, project-level pricing, client approval links.

**Components needed:**
- Organization accounts + trade verification
- Team roles + permissions
- Project-level price books
- Client-facing approval links

**Effort:** Weeks

---

### HIGH-016: RFQ & Quotation Follow-Up Automation
Lifecycle automations for abandoned carts, unanswered quotations, expiring prices, appointment reminders.

**Components needed:**
- Lifecycle event emission
- Consent-aware message sequences + stop conditions
- Staff task creation for high-value opportunities

**Effort:** Days

---

### HIGH-017: Discovery-to-Revenue Attribution
Canonical event taxonomy + identity graph from anonymous visitor → customer → project → RFQ → quotation → won.

**Components needed:**
- Identity graph + first/last touch tracking
- Recommendation provenance
- Conversion event pipeline

**Effort:** Days

---

### HIGH-018: Room Passport / Project Twin
The ultimate product — unified digital room twin with photos, measurements, style, budget, AI bundles, feasibility, approval, RFQ.

**Components needed:**
- MVP: upload room photo + measurements → extract constraints → 3 catalog-grounded bundles
- Confidence/fit/budget/availability checks
- Customer/designer approval + one-click project → RFQ

**Effort:** Months

---

## Quotation Version Engine — Complete Architecture

### Data Model
```
quotations
├── id, quotation_number, customer_name, email, phone, status
├── delivery_location, project_type, notes
├── subtotal, shipping_cost, grand_total
├── terms_* (8 fields)
├── current_version INTEGER DEFAULT 1        ← NEW
├── pending_revision BOOLEAN DEFAULT false    ← NEW
├── revision_request TEXT DEFAULT ''          ← NEW
└── items, created_at, updated_at

quotation_versions                           ← NEW TABLE
├── id, quotation_id (FK), version_number
├── revision_type: initial | admin_edit | customer_revision | reverted
├── snapshot JSONB — full quotation state at this version
├── changelog JSONB — [{field, label, from, to}]
├── revision_message TEXT
├── created_by TEXT
└── created_at
```

### API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/quotations/[id]/revision-request` | POST | Customer requests revision with message |
| `/api/quotations/[id]/versions` | GET | Admin fetches version history |
| `/api/quotations/[id]` | PATCH | Auto-creates version snapshot before save; `{ resolveRevision: true }` clears flag |

### Flow
```
1. Admin creates quotation → version 1 (initial)
2. Admin edits quotation → version 2 (admin_edit) auto-saved
3. Customer views → clicks "Request Revision"
   → POST /revision-request { message: "Please adjust..." }
   → pending_revision = true
4. Admin sees "🔄 Revision Requested" badge in quotation list
5. Admin edits quotation → version 3 (admin_edit) auto-saved
6. Admin clicks "Resolve Revision" → PATCH with { resolveRevision: true }
   → pending_revision = false, revision_request = cleared
7. Customer sees revision resolved, views updated quotation
```

### Customer UI State
- If `pending_revision === true`: shows "Revision Requested — HomeU team is reviewing"
- If `status === 'sent'` and `pending_revision === false`: shows "Request Revision" button  
- If `status === 'draft'`: no revision button (not yet sent)
