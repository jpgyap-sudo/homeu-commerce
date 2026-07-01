# Frictionless Quotation Revision System — Architecture Plan

## Current Infrastructure (Already Exists)

| Component | Status | Location |
|-----------|--------|----------|
| `quotation_versions` table | ✅ | migration 004 |
| Version snapshot/changelog engine | ✅ | [`lib/quotation-versions.ts`](apps/website/src/lib/quotation-versions.ts) |
| Customer quotation view (basic) | ✅ | [`customer/quotation/[id]/page.tsx`](apps/website/src/app/customer/quotation/[id]/page.tsx) |
| Admin quotation edit (basic) | ✅ | [`admin/quotations/[id]/page.tsx`](apps/website/src/app/admin/quotations/[id]/page.tsx) |
| GET/PATCH/DELETE quotation API | ✅ | [`api/quotations/[id]/route.ts`](apps/website/src/app/api/quotations/[id]/route.ts) |
| Revision request API | ✅ | [`api/quotations/[id]/revision-request/route.ts`](apps/website/src/app/api/quotations/[id]/revision-request/route.ts) |
| Respond API (accept/revision) | ✅ | [`api/quotations/[id]/respond/route.ts`](apps/website/src/app/api/quotations/[id]/respond/route.ts) |
| Version history API | ✅ | [`api/quotations/[id]/versions/route.ts`](apps/website/src/app/api/quotations/[id]/versions/route.ts) |
| PDF generation | ✅ | [`lib/generate-quotation-pdf.ts`](apps/website/src/lib/generate-quotation-pdf.ts) |
| RFQ chat event integration | ✅ | [`api/system/rfq-chat/quotation-event/route.ts`](apps/website/src/app/api/system/rfq-chat/quotation-event/route.ts) |
| Deposit columns | ✅ | migration 058 |

## What Each Piece Builds

---

### 1. Line-Item Revision Buttons

**File:** `apps/website/src/components/QuotationRevisionButtons.tsx` (NEW)

**Accepts:** `{ item: QuotationItem, onAction: (action, payload) => void }`

**Actions per item:**
| Button | Action Type | Payload |
|--------|-------------|---------|
| ❌ Remove | `remove` | `{ itemId }` |
| 🔢 Change qty | `change_qty` | `{ itemId, newQty }` |
| 🎨 Change finish | `change_finish` | `{ itemId, note: "..." }` |
| 🔄 Swap product | `swap` | `{ itemId, newProductId }` |
| 💰 Ask lower price | `lower_price` | `{ itemId, note: "..." }` |
| ⏱ Need lead time | `lead_time` | `{ itemId }` |

**Rendered as:** Small icon buttons below each item row in the customer quotation view.

**DB Schema (NEW):** `quotation_revision_items` table
```sql
CREATE TABLE IF NOT EXISTS quotation_revision_items (
  id SERIAL PRIMARY KEY,
  quotation_id INTEGER NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
  item_index INTEGER NOT NULL,
  action_type TEXT NOT NULL, -- remove|change_qty|change_finish|swap|lower_price|lead_time
  payload JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**API Route (NEW):** `POST /api/quotations/[id]/revision-items`
- Body: `{ items: Array<{ itemIndex, actionType, payload }> }`
- Stores pending revision items
- Returns `{ success: true, count: N }`

---

### 2. Visual Revision Summary Tray

**File:** `apps/website/src/components/QuotationRevisionSummary.tsx` (NEW)

**Renders:**
- Fixed tray at bottom of customer quotation page showing accumulated changes
- Each change as a chip/card: "Remove: Augustin Pouf ×" / "Change qty: Aalto Sofa from 1→2"
- Editable notes textarea for free-text additions
- "Send Revision Request" button (calls `POST /api/quotations/[id]/revision-request` with structured payload)

**State Management:** React context/state in the customer page tracking `revisionItems: Map<string, revisionAction>`

**Integration:** Imported by [`customer/quotation/[id]/page.tsx`](apps/website/src/app/customer/quotation/[id]/page.tsx), replacing the existing `<textarea>` revision flow.

---

### 3. Smart Text Parser

**File:** `apps/website/src/lib/quotation-text-parser.ts` (NEW)

**Parses free text into structured changes:**
```
"remove augustin pouf and make sofa 2 pcs"
→ [{ type: 'remove', keyword: 'augustin pouf' },
   { type: 'change_qty', keyword: 'sofa', value: 2 }]
```

**Pattern matching:**
- `remove|delete|take out|drop` + product name → `remove`
- `make|set|change|update` + qty/keyword → `change_qty`
- `change|switch|swap` + color/finish → `change_finish`
- `lower|reduce|cheaper|discount` → `lower_price`
- `lead time|how long|delivery date` → `lead_time`

**Exported function:**
```typescript
export function parseRevisionText(text: string): DetectedChange[]
export interface DetectedChange {
  type: 'remove' | 'change_qty' | 'change_finish' | 'swap' | 'lower_price' | 'lead_time' | 'unknown'
  rawMatch: string
  keyword?: string    // matched product name
  value?: number | string  // e.g. new qty, requested price
  confidence: number  // 0-1
}
```

**Integration:** When customer types free text and clicks "Parse" or the text changes, run parser and show detected changes for confirmation before sending.

---

### 4. Side-by-Side Version Compare

**File:** `apps/website/src/components/QuotationVersionCompare.tsx` (NEW)

**Props:** `{ previousSnapshot, currentSnapshot, items }`

**Layout:**
```
┌─────────────────┬─────────────────┐
│  Original Quote  │  Revised Quote   │
│  (vN)           │  (vN+1)          │
│                 │                  │
│  Item 1  ₱X     │  Item 1  ₱Y 🔴  │
│  Item 2  ₱Z     │  Item 2  ₱Z     │
│                 │  ———————————     │
│  Subtotal: ₱S   │  Item 3  ₱W 🟢  │
│  Grand:   ₱G    │  Subtotal: ₱S'  │
│                 │  Grand:   ₱G'   │
└─────────────────┴─────────────────┘
```

**Highlights:**
- 🔴 Red background for removed items / increased prices
- 🟢 Green background for added items / decreased prices
- 🟡 Yellow for changed quantities
- Strikethrough text for removed items

**Integration:** Shown on the customer quotation view when `currentVersion > 1` AND status changes from `pending_revision` to `sent`.

**API:** Uses existing `GET /api/quotations/[id]/versions` to fetch version history.

---

### 5. Revision Chat Attached to Quote

**Files (NEW):**
- `apps/website/src/components/QuotationRevisionChat.tsx`
- `apps/website/src/app/api/quotations/[id]/chat/route.ts`

**How it works:**
- `quotation_revision_chat` table: `(id, quotation_id, sender_type, message, created_at)`
- Displays as a collapsible mini-chat thread at the bottom of the customer quotation view
- Shows system events ("Admin revised quotation v3"), customer messages, admin replies
- Auto-seeds from the `revision_request` message and `quotation_versions` changelog

**API Routes:**
- `GET /api/quotations/[id]/chat` — list messages for this quotation
- `POST /api/quotations/[id]/chat` — add a message (customer sends)
- `POST /api/admin/quotations/[id]/chat` — admin sends reply (separate auth)

**DB Schema:**
```sql
CREATE TABLE IF NOT EXISTS quotation_revision_chat (
  id SERIAL PRIMARY KEY,
  quotation_id INTEGER NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('customer', 'admin', 'system')),
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_qrc_quotation ON quotation_revision_chat(quotation_id);
```

---

### 6. One-Tap Accept After Revision

**File:** Already exists in [`customer/quotation/[id]/page.tsx`](apps/website/src/app/customer/quotation/[id]/page.tsx) (lines 109-120) — `handleApprove()` that sends `PATCH { status: 'accepted' }`.

**Enhancements needed:**
1. After admin resolves a revision → status becomes `revised` (new status)
2. Customer page detects `status === 'revised'` → shows prominent "View Changes" button → shows VersionCompare → shows large "✅ Accept Revised Quote" CTA
3. On accept, call `POST /api/quotations/[id]/respond { action: 'approve' }` (already exists)
4. Creates a version snapshot with `revision_type='accepted'` — already handled by existing code

**New quotation status flow:**
```
sent → revision_requested (pending_revision=true) → revised → accepted
                                                      ↓
                                                 (compare + accept)
```

---

### 7. Admin Revision Workspace

**File:** `apps/website/src/components/admin/QuotationRevisionWorkspace.tsx` (NEW)

**Integration:** Rendered inside [`admin/quotations/[id]/page.tsx`](apps/website/src/app/admin/quotations/[id]/page.tsx) when `quotation.pending_revision === true`

**Layout:**
```
┌─────────────────────────────────────────────┐
│  🔄 Revision Request                        │
│  ───────────────────────────────────         │
│  Customer requested:                        │
│  • Remove: Augustin Pouf                    │
│  • Change qty: Aalto Sofa from 1 to 2       │
│  • Note: prefer beige fabric                │
├─────────────────────────────────────────────┤
│  Current Quotation Items                    │
│  ┌──────────────────────────────────────┐   │
│  │ Item  │ Price │ Actions             │   │
│  │ Augustin │ ₱X │ [Remove ✓] [Edit]  │   │
│  │ Aalto   │ ₱Y │ [Qty: 1→2] [Edit]  │   │
│  └──────────────────────────────────────┘   │
├─────────────────────────────────────────────┤
│  [  Save Changes & Resolve Revision  ]      │
│  [  Reject Revision & Keep Current  ]       │
└─────────────────────────────────────────────┘
```

**Auto-detection logic:**
1. Parse `revision_request` text using `parseRevisionText()`
2. Match detected keywords against quotation items
3. Pre-fill the workspace with suggested changes
4. Admin can confirm/modify/dismiss each change
5. On save: update items, create version snapshot, clear `pending_revision`, set status to `revised`

**API Integration:**
- Reads existing `GET /api/quotations/[id]` for current data
- Writes via `PATCH /api/quotations/[id]` with `{ items, resolveRevision: true, status: 'revised' }`
- Existing code already handles `resolveRevision: true` (line 167 of route.ts)

---

### 8. Revision Status Timeline

**File:** `apps/website/src/components/QuotationTimeline.tsx` (NEW)

**Props:** `{ versions: VersionHistory[], currentStatus: string }`

**Renders a vertical timeline:**
```
📄 Quotation Created          │  Jun 30
📨 Quotation Sent             │  Jun 30
🔄 Revision Requested         │  Jul 1  ← current
   "remove augustin..."
✏️ Admin Editing             │  (in progress)
📄 Revised Quote Ready        │  (pending)
✅ Accepted                   │  (pending)
```

**Integration:**
- Customer view: placed above the quotation items
- Admin view: placed in the sidebar or above the edit form
- Each dot is clickable → shows version snapshot

**Data source:** Existing `GET /api/quotations/[id]/versions` plus quotation metadata from `GET /api/quotations/[id]`.

---

## Summary: All New Files

| # | File | Type |
|---|------|------|
| 1 | `components/QuotationRevisionButtons.tsx` | Client component |
| 2 | `components/QuotationRevisionSummary.tsx` | Client component |
| 3 | `components/QuotationVersionCompare.tsx` | Client component |
| 4 | `components/QuotationRevisionChat.tsx` | Client component |
| 5 | `components/QuotationTimeline.tsx` | Client component |
| 6 | `components/admin/QuotationRevisionWorkspace.tsx` | Client component |
| 7 | `lib/quotation-text-parser.ts` | Pure utility |
| 8 | `app/api/quotations/[id]/revision-items/route.ts` | API route |
| 9 | `app/api/quotations/[id]/chat/route.ts` | API route |
| 10 | `app/api/admin/quotations/[id]/chat/route.ts` | API route |
| 11 | Migration: `quotation_revision_items` | DB migration |
| 12 | Migration: `quotation_revision_chat` | DB migration |

Plus modifications to:
- `customer/quotation/[id]/page.tsx` — integrate all customer-facing components
- `admin/quotations/[id]/page.tsx` — integrate admin workspace when `pending_revision`
- `api/quotations/[id]/route.ts` — add `revised` status handling
- `api/quotations/[id]/respond/route.ts` — handle the `revised` status flow

---

## Implementation Order

```
Phase 1: DB schema + Migration
  → quotation_revision_items, quotation_revision_chat tables

Phase 2: Smart Text Parser (lib/quotation-text-parser.ts)
  → Independent utility, no UI dependencies

Phase 3: Customer-Facing Components
  → RevisionButtons → RevisionSummary → Timeline → VersionCompare → RevisionChat
  → Wire into customer/quotation/[id]/page.tsx

Phase 4: Admin Workspace
  → QuotationRevisionWorkspace component
  → Wire into admin/quotations/[id]/page.tsx
  
Phase 5: Status Flow + API Polish
  → 'revised' status in API routes
  → One-tap accept flow
  → VersionCompare triggers correctly
```
