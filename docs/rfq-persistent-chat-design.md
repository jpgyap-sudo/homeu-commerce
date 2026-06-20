# Persistent RFQ Chat System — Design Document

> **Author:** SuperRoo  
> **Date:** 2026-06-20  
> **Status:** Draft for review  

---

## 1. Overview

Currently, the website chatbot (`chatbot.messages`) is anonymous and visitor-based. The customer dashboard shows RFQ status and quotation versions, but **there is no persistent messaging channel tied to an RFQ request**.

This proposal adds:  

1. **Per-RFQ persistent chat** — each RFQ has its own message thread visible inside the customer's RFQ account page  
2. **Chatbot message backfill** — when a lead opens an RFQ cart, ALL their previous chatbot messages are mirrored into the RFQ chat conversation  
3. **Quotation version timeline** — each quotation version change is displayed as a system event in the chat timeline  
4. **Quotation sent notification** — when admin marks a quotation as "sent", a system notification appears in the RFQ chat  
5. **Admin-controlled "Notify" button** — admin manually triggers an email to the customer containing ONLY a direct link to their RFQ account (zero friction, no spam)  
6. **1-month customer retention** — messages older than 30 days are hidden from the customer but **always visible to admin**  
7. **Admin message management** — select/delete messages with OTP approval sent to `jpgyap@gmail.com`  

> **AI Analytics Layer** — Moved to feature pipeline (future scope)

---

## 2. Database Schema

### 2.1 New Tables

```sql
-- ============================================================
-- RFQ CHAT CONVERSATIONS
-- One conversation per RFQ request. Created automatically
-- when the first RFQ-related message is sent.
-- ============================================================
CREATE TABLE IF NOT EXISTS rfq_chat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_request_id INTEGER NOT NULL REFERENCES rfq_requests(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'active',            -- active | resolved | archived
  last_message_at TIMESTAMPTZ DEFAULT now(),
  message_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  internal_score INTEGER DEFAULT 0,        -- admin-only: conversational sentiment score
  admin_notes TEXT,                        -- admin-only: internal notes on this conversation
  resolved_at TIMESTAMPTZ,                 -- admin-only: when admin marked conversation as resolved
  -- Source tracking:
  source TEXT DEFAULT 'rfq_chat',           -- rfq_chat | chatbot_backfill
  source_conversation_id TEXT              -- original chatbot.conversations.id if backfilled
);

CREATE INDEX IF NOT EXISTS idx_rfq_chat_conv_rfq ON rfq_chat_conversations(rfq_request_id);
CREATE INDEX IF NOT EXISTS idx_rfq_chat_conv_status ON rfq_chat_conversations(status);


-- ============================================================
-- RFQ CHAT MESSAGES
-- Individual messages within an RFQ conversation.
-- TTL: messages older than 30 days are hidden from customer
-- but always visible to admin.
-- ============================================================
CREATE TABLE IF NOT EXISTS rfq_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES rfq_chat_conversations(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL,                -- customer | admin | system | ai_bot
  admin_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,  -- which admin replied
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text',         -- text | image | document | system_event | quotation_version | notification
  -- For quotation_version type:
  related_quotation_id INTEGER REFERENCES quotations(id) ON DELETE SET NULL,
  related_version_number INTEGER,
  --
  metadata JSONB DEFAULT '{}',             -- { imageUrl, fileUrl, versionLabel, changelog[], backfilledFrom }
  customer_visible BOOLEAN DEFAULT TRUE,   -- admin can mark messages as internal-only
  deleted_at TIMESTAMPTZ,                  -- soft-delete timestamp
  deleted_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rfq_chat_msg_conv ON rfq_chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_rfq_chat_msg_created ON rfq_chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_rfq_chat_msg_type ON rfq_chat_messages(message_type);
CREATE INDEX IF NOT EXISTS idx_rfq_chat_msg_active
  ON rfq_chat_messages(created_at)
  WHERE customer_visible = TRUE AND deleted_at IS NULL;


-- ============================================================
-- DELETION APPROVAL TOKENS
-- Tracks OTP-verified message deletion requests.
-- Admin selects messages → OTP sent to jpgyap@gmail.com →
-- OTP verified → deletion executed.
-- ============================================================
CREATE TABLE IF NOT EXISTS rfq_chat_deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES rfq_chat_conversations(id) ON DELETE CASCADE,
  message_ids UUID[] NOT NULL,
  otp_email TEXT NOT NULL DEFAULT 'jpgyap@gmail.com',
  otp_verified BOOLEAN DEFAULT FALSE,
  otp_verified_at TIMESTAMPTZ,
  executed BOOLEAN DEFAULT FALSE,
  executed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);


-- ============================================================
-- NOTIFICATION LOG
-- Tracks every "Notify" button click by admin.
-- Used for audit trail and future analytics.
-- ============================================================
CREATE TABLE IF NOT EXISTS rfq_chat_notification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES rfq_chat_conversations(id) ON DELETE CASCADE,
  admin_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,          -- quotation_sent | admin_notify | quotation_updated
  email_sent_to TEXT NOT NULL,              -- customer email
  email_subject TEXT NOT NULL,
  email_link TEXT NOT NULL,                 -- the deep link sent in the email
  triggered_by TEXT NOT NULL,               -- manual | auto (quotation sent)
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 2.2 Migration File

```
tools/migrate/migrations/005_add_rfq_chat.sql
```

---

## 3. API Routes

### 3.1 Customer-Facing APIs (authenticated customer session)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/rfq-chat/[rfqId]/messages` | Get messages for an RFQ (30-day window, excludes deleted) |
| `POST` | `/api/rfq-chat/[rfqId]/messages` | Send a message as customer |
| `GET` | `/api/rfq-chat/[rfqId]/versions` | Get quotation versions timeline for this RFQ |

### 3.2 Admin-Facing APIs (authenticated admin session)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/admin/rfq-chat/[rfqId]/messages` | Get ALL messages (no TTL, includes deleted with flag) |
| `POST` | `/api/admin/rfq-chat/[rfqId]/messages` | Send message as admin |
| `PATCH` | `/api/admin/rfq-chat/messages/[msgId]` | Toggle `customer_visible` flag |
| `POST` | `/api/admin/rfq-chat/[rfqId]/messages/select-delete` | Select msgs for deletion → returns deletion request ID |
| `POST` | `/api/admin/rfq-chat/[rfqId]/messages/confirm-delete` | Confirm deletion with OTP code → executes soft-delete |
| **`POST`** | **`/api/admin/rfq-chat/[rfqId]/notify`** | **🔔 Admin clicks "Notify Customer" → sends email with deep link** |
| `GET` | `/api/admin/rfq-chat/[rfqId]/conversation` | Get conversation metadata + admin notes |
| `PATCH` | `/api/admin/rfq-chat/[rfqId]/conversation` | Update internal_score, admin_notes, status |

### 3.3 System / Internal APIs

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/system/rfq-chat/quotation-event` | Quotation version created (auto-posts system event) |
| `POST` | `/api/system/rfq-chat/quotation-sent-event` | Quotation marked sent (auto-posts notification in chat) |
| `POST` | `/api/system/rfq-chat/backfill` | Lead opens RFQ cart → mirrors chatbot messages |
| `POST` | `/api/system/rfq-chat/send-notification-email` | Sends the actual email (called by admin notify endpoint) |

---

## 4. Integration Points

### 4.1 Quotation Version → Chat Auto-Event

When a quotation version is created in [`apps/website/src/lib/quotation-versions.ts`](apps/website/src/lib/quotation-versions.ts), after the `createVersion()` call succeeds, the system automatically inserts a `system_event` message into the RFQ chat:

**Event types:**
- `📄 Quotation created (v1)` — initial quotation
- `✏️ Quotation updated to v2` — admin edit
- `🔄 Revision requested — "Can you adjust pricing?"` — customer revision request
- `📨 Quotation sent to customer` — when status changes to `sent`
- `✅ Quotation accepted` — when customer approves
- `🔄 Quotation revised to v3` — after admin resolves a revision

### 4.2 Quotation Sent → In-Chat Notification (Auto)

When an admin marks a quotation as "sent", the system auto-inserts a notification message into the RFQ chat — **no email is sent automatically.** Only the in-chat notification appears.

```
PATCH /api/quotations/[id] { status: "sent" }
  └→ Auto-trigger → inserts system notification in rfq_chat:
       "📨 Quotation #[number] has been sent. View it in your dashboard."
  └→ NO email sent automatically.
  └→ Admin can optionally click [Notify] to also email the customer.
```

### 4.3 Admin "Notify" Button (Manual) — THE KEY FEATURE

This is the **only way** an email gets sent to the customer. Admin has full control.

```
┌────────────────────────────────────────────┐
│ 🔔 Notify Customer                         │
│                                            │
│ Sends email with direct link to this RFQ.  │
│ Customer clicks → lands on RFQ chat.       │
│                                            │
│ Subject: "Update on your RFQ #ABC123"     │
│                                            │
│ [Send Notification]                        │
│                                            │
│ Last notified: July 15, 2026 at 2:30 PM    │
│ Sent 2 notifications to this customer      │
└────────────────────────────────────────────┘
```

**POST /api/admin/rfq-chat/[rfqId]/notify:**
```javascript
{
  "action": "send_notification",
  "optional_message": "We've updated your quotation with the new pricing." // optional preview text
}
```

**What the email looks like:**
```
┌────────────────────────────────────────┐
│ Home Atelier                           │
│                                        │
│ Hi Juan,                              │
│                                        │
│ You have an update on your quotation   │
│ request.                               │
│                                        │
│ ┌──────────────────────────────────┐  │
│ │  💬 View in My RFQ Account      │  │
│ │  → [ONE CLICK] /customer/rfq/42 │  │
│ └──────────────────────────────────┘  │
│                                        │
│ Or copy this link:                     │
│ homeu.ph/customer/rfq/42              │
│                                        │
│ — Home Atelier Team                    │
│ sales@homeu.ph                        │
└────────────────────────────────────────┘
```

**The email contains ONLY:**
- Customer name (personalization)
- One big CTA button: "💬 View in My RFQ Account"
- Direct deep link to `/customer/rfq/[rfqId]`
- No pricing, no quotation details — just the link

**Why this is brilliant:** Zero friction — customer clicks once, lands on their RFQ page with the chat already loaded. No login prompt (they're already logged in). No scrolling — the chat is the first thing they see.

### 4.4 Chatbot Message Backfill Flow

When a lead converts to a customer (or an existing customer opens an RFQ cart), the system detects if the lead had prior chatbot conversations and backfills them into the RFQ chat:

```
Trigger: Customer opens RFQ cart / submits RFQ
  → Look up lead by daVincios_customer_id
  → Check chatbot.conversations for this lead
  → Mirror all chatbot.messages into rfq_chat_messages with
    metadata.backfilledFrom = 'chatbot'
  → Insert system_event: "📋 Previous chat history imported"
```

**Deduplication:** A `chatbot_backfill_log` prevents re-importing the same conversation.

### 4.5 Message Deletion Flow (Admin)

```
Admin selects messages → Clicks "Delete Selected"
  → Saves deletion request (pending OTP)
  → OTP sent to jpgyap@gmail.com via nodemailer SMTP
  → Admin enters OTP → verified → messages soft-deleted
```

**Cannot delete:** System notification messages are protected.

---

## 5. Frontend Components

### 5.1 Shared Component Tree

```
components/
  rfq-chat/
    RfqChatContainer.tsx              ← Main wrapper, fetches messages
    RfqChatMessageList.tsx            ← Message list with auto-scroll
    RfqChatMessageBubble.tsx          ← Single message (customer/admin/system/notification)
    RfqChatNotificationBadge.tsx      ← 🔔 Badge for quotation sent / new notification
    RfqChatInput.tsx                  ← Text input + send button
    RfqChatTimelineEvent.tsx          ← Quotation version change display
    RfqChatHeader.tsx                 ← Status badge, conversation info
    RfqChatTtlBanner.tsx              ← "Showing last 30 days" notice for customers
    RfqChatBackfillNotice.tsx         ← "Previous chatbot conversation imported" notice
    RfqChatSelectToolbar.tsx          ← Admin: Select All / Deselect All / Delete toolbar
    RfqChatDeleteModal.tsx            ← Admin: OTP input modal for deletion approval
    RfqChatNotifyButton.tsx           ← Admin: "Notify Customer" button + status
```

### 5.2 Customer View (`/customer/rfq/[id]`)

```
┌─────────────────────────────────────────────────┐
│ RFQ #ABC123 · Status: 🟢 Quotation Sent         │
│ ┌─────────────────────────────────────────────┐ │
│ │ 💬 Messages & Timeline                      │ │
│ │                                             │ │
│ │ 🔄 Previous chat imported (Jul 5)           │ │
│ │  ├─ 📋 Chatbot: "Hi, looking for chairs"    │ │
│ │  ├─ 🔔 📨 Quotation sent!                   │ │ ← auto notification
│ │  ├─ You: "Thanks for the quote"             │ │
│ │  ├─ Admin: "Glad you like it!"              │ │
│ │  └─ 🔔 Admin sent an update — [View]        │ │ ← notify button trigger
│ │                                             │ │
│ │ ════════════════════════════════════════     │ │
│ │ Showing messages from the last 30 days       │ │
│ │ ┌─────────────────────────────────────────┐ │ │
│ │ │ Type your message...       [Send]       │ │ │
│ │ └─────────────────────────────────────────┘ │ │
│ └─────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────┐ │
│ │ 📋 Request Details (existing)               │ │
│ └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

### 5.3 Admin View — Notify Button Section

```
┌─────────────────────────────────────────────────────┐
│ RFQ #ABC123 · Customer: Juan · Status: Quoted       │
│ ┌──────────────────────────────────────────────────┐│
│ │ Chat Messages                   ││
│ │ ┌─────────────────────────────┐ ││
│ │ │ 📋 Chatbot: "Hi..."        │ ││
│ │ │ 💬 Customer: "Can you..."  │ ││
│ │ │ 💬 You (Admin): "Sure!"    │ ││
│ │ └─────────────────────────────┘ ││
│ │ [☑ Select All] [🗑 Delete]      ││
│ │ ┌─────────────────────────────┐ ││
│ │ │ Type...         [Send]     │ ││
│ │ └─────────────────────────────┘ ││
│ └──────────────────────────────────────┘            │
│                                                      │
│ ┌──────────────────────────────────────────────────┐│
│ │ 🔔 NOTIFY CUSTOMER                               ││
│ │ ┌──────────────────────────────────────────────┐ ││
│ │ │ [Send Notification]  Sent 2 times             │ ││
│ │ │ ─────────────────────────────────────         │ ││
│ │ │ Last sent: Jul 15, 2026 · 2:30 PM            │ ││
│ │ │ Customer email: juan@email.com                │ ││
│ │ └──────────────────────────────────────────────┘ ││
│ └──────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────┘
```

---

## 6. Notification System (Detailed)

### 6.1 What Triggers What

| Event | In-Chat Notification | Email Sent? |
|-------|---------------------|-------------|
| Quotation marked as "sent" | ✅ Auto — 🔔 "📨 Quotation sent!" | ❌ Not automatically |
| Admin clicks **[Notify Customer]** | ✅ Auto — 🔔 "Admin sent an update" | ✅ YES — email with deep link |
| Admin replies in chat | ✅ Shows in message list | ❌ Never |
| Customer sends message | ✅ Shows in admin view | ❌ Never |
| Quotation version updated | ✅ System event in timeline | ❌ Never |
| OTP for deletion | ❌ Admin-only workflow | ✅ To jpgyap@gmail.com |

**The rule is simple:** The only way a customer gets an email is when an admin explicitly clicks "Notify Customer". No auto-email for replies, no auto-email for quotation events — **admin has full control**.

### 6.2 The "Notify" Email Content

**Subject:** `Update on your RFQ #ABC123 — Home Atelier`

**Body (minimal, frictionless):**

```
Hi Juan,

You have an update on your quotation request from Home Atelier.

[ 💬 View in My RFQ Account ]
(links to /customer/rfq/42)

The message is waiting for you in your RFQ account — no need to search.

— Home Atelier Team
```

That's it. One button. One click. Customer lands directly on their RFQ chat.

### 6.3 How the Notify Button Works

```javascript
// POST /api/admin/rfq-chat/[rfqId]/notify
async function handleNotifyCustomer(rfqRequestId, adminId) {
  // 1. Get RFQ and customer info
  const rfq = await db.query('SELECT * FROM rfq_requests WHERE id = $1', [rfqRequestId]);
  const customer = await db.query('SELECT * FROM customers WHERE id = $1', [rfq.customer_id]);

  // 2. Generate the deep link
  const deepLink = `${process.env.APP_URL}/customer/rfq/${rfqRequestId}`;

  // 3. Send the email via nodemailer (existing SMTP)
  await sendEmail({
    to: customer.email,
    subject: `Update on your RFQ #${rfq.id.slice(-6).toUpperCase()} — Home Atelier`,
    html: `
      <div style="font-family: Arial; max-width: 480px;">
        <h2>Home Atelier</h2>
        <p>Hi ${customer.name},</p>
        <p>You have an update on your quotation request.</p>
        <a href="${deepLink}"
           style="display:inline-block; padding:14px 32px; background:#222;
                  color:#fff; text-decoration:none; border-radius:8px;
                  font-size:16px;">
          💬 View in My RFQ Account
        </a>
        <p style="font-size:12px; color:#999;">
          <a href="${deepLink}">${deepLink}</a>
        </p>
      </div>
    `
  });

  // 4. Insert a notification message in the RFQ chat
  await insertMessage({
    conversation_id: conversation.id,
    sender_type: 'system',
    message_type: 'notification',
    content: `📨 Notification sent to ${customer.email}`
  });

  // 5. Log the notification
  await db.query(
    `INSERT INTO rfq_chat_notification_log (...) VALUES (...)`);
}
```

---

## 7. Genius Ideas for Notification System

### 🔥 1. "Notify & Pin" — Smart Notification with Context

When admin clicks "Notify", they can optionally **pin a message** from the chat that the email link points to:

```
Admin selects a message → clicks "Notify & Pin"
  → Email deep link becomes: /customer/rfq/42?msg=uuid-here
  → Customer lands on RFQ page → chat auto-scrolls to that specific message
  → That message gets a subtle 🎯 "You were notified about this" highlight
```

**Why genius:** Customer doesn't just land on the page — they land on the EXACT message the admin wanted them to see. Zero friction. Perfect for: "We've updated the pricing" or "Please review the revised terms."

### 🔥 2. Scheduled Notifications

Admin can schedule a notification to be sent later:

```
[Send Now]  [Schedule...]
┌──────────────────────────┐
│ Send notification at:    │
│ 📅 July 16, 2026         │
│ ⏰ 10:00 AM              │
│                          │
│ Customer timezone:       │
│ Asia/Manila (UTC+8)     │
│                          │
│ [Schedule Notification]  │
└──────────────────────────┘
```

**Why genius:** Admin can prepare the quotation update at 2 AM and schedule the notification for 10 AM when the customer is active. Better open rates.

### 🔥 3. Notification Read Receipts

Track whether the customer clicked the link in the email:

```
Notification Log:
  Jul 15, 2:30 PM — Sent ✅
  Jul 15, 3:45 PM — Opened ✅ (customer clicked link)
  Jul 16, 10:00 AM — Scheduled 📅
```

Admin sees in the Notify button panel:
```
📬 Last notification opened! Customer viewed RFQ 15 min after email.
```

**Why genius:** Admin knows if the customer actually saw their update. If not opened in 24h, admin can follow up via Viber/phone.

### 🔥 4. "Notify All Active RFQs" — Bulk Notification

Admin has a dashboard button: "Notify all customers with active RFQs"

```
┌──────────────────────────────────────────────┐
│ 📬 Notify All Active RFQs                    │
│                                              │
│ 12 customers with active RFQs will receive   │
│ an email with a link to their RFQ account.   │
│                                              │
│ [Preview] [Send to All]                      │
│                                              │
│ Customers:                                   │
│ ☑ Juan — RFQ #ABC123 · Last msg: 5d ago    │
│ ☑ Maria — RFQ #DEF456 · Last msg: 2d ago   │
│ ☑ Pedro — RFQ #GHI789 · New quotation      │
└──────────────────────────────────────────────┘
```

**Why genius:** Weekly engagement blast — "Hey, you have an update waiting!" — brings customers back to the platform without manual work.

### 🔥 5. Notification Templates with Variables

Admin can choose what kind of notification to send:

```
[Send Notification ▼]
  ├─ 📨 General Update — "You have an update..."
  ├─ 📄 Quotation Ready — "Your quotation is ready..."
  ├─ ✏️ Revision Complete — "We've revised the quotation..."
  ├─ ❓ Need Info — "We need some more details..."
  └─ 📋 Custom — Type your own subject
```

Each template has a pre-written subject line and body, but admin can customize. The link is always the same deep link.

**Why genius:** Removes friction from admin too — one click to notify with the right context.

### 🔥 6. Customer Activity Status in Notify Panel

Admin sees if the customer has been active before deciding to notify:

```
🔔 NOTIFY CUSTOMER
  ┌──────────────────────────────────────┐
  │ Customer last seen: 2 hours ago     │
  │ (active in RFQ chat)                │
  │                                     │
  │ [Send Notification]                 │
  │                                     │
  │ Tip: Customer was recently active — │
  │ they may already know. Consider     │
  │ waiting unless urgent.              │
  └──────────────────────────────────────┘
```

**Why genius:** Prevents notification fatigue. If the customer is already in the chat, no need to email.

### 🔥 7. Notification Analytics Dashboard

Admin dashboard page at `/admin/analytics/notifications`:

```
📬 Notification Analytics

┌───────────────────────┬────────┬────────┬────────┐
│ Metric                │ This Wk│ Last Wk│ Change │
├───────────────────────┼────────┼────────┼────────┤
│ Total sent            │ 42     │ 38     │ +10%   │
│ Total opened          │ 31     │ 25     │ +24%   │
│ Open rate             │ 73.8%  │ 65.7%  │ +8.1%  │
│ Avg time to open      │ 2.4h   │ 3.1h   │ -22%   │
│ RFQ view after notify │ 28     │ 22     │ +27%   │
└───────────────────────┴────────┴────────┴────────┘

Best time to notify: 10:00-11:00 AM (75% open rate)
Best day: Tuesday (81% open rate)
```

**Why genius:** Data-driven sales. Admin learns when customers are most responsive and optimizes notification timing.

---

## 8. Real-Time vs Polling

### Recommendation: Simple Polling (10-second interval)

| Criteria | Polling (10s) | SSE |
|----------|--------------|-----|
| Complexity | ✅ Low — reuse existing Next.js routes | ❌ High |
| Delay | ~10s — acceptable for RFQ chat | ✅ <1s |
| MVP Ready | ✅ Ship today | ❌ Extra cycle |

**Why polling is fine:** RFQ chat is a business conversation where messages come minutes/hours apart. 10s polling is imperceptible.

---

## 9. TTL & Data Retention

| Data | Customer Visibility | Admin Visibility |
|------|-------------------|-----------------|
| Messages | Last 30 days (not deleted) | All time |
| Quotation versions | All | All |
| Deleted messages | Never | "🗑️ Deleted" badge |
| Notification log | Never | All |

**Daily TTL job:** Marks messages >30 days old as `customer_visible = FALSE` (not deleted — just hidden from customers).

**Physical deletion:** Messages → 2 years. Soft-deleted → 90 days. Notification logs → 1 year.

---

## 10. Implementation Phases

### Phase 1: Foundation (Week 1)
- [ ] Create `rfq_chat_conversations` and `rfq_chat_messages` tables
- [ ] Create `rfq_chat_deletion_requests` and `rfq_chat_notification_log` tables
- [ ] Build customer chat API (GET + POST `rfq-chat/[rfqId]/messages`)
- [ ] Build RfqChatContainer + RfqChatMessageList + RfqChatInput components
- [ ] Integrate chat into `customer/rfq/[id]/page.tsx`
- [ ] Show 30-day TTL banner

### Phase 2: Quotation Timeline (Week 2)
- [ ] Hook `createVersion()` to auto-insert system events
- [ ] Build RfqChatTimelineEvent component
- [ ] Wire revision_request and status changes to post events

### Phase 3: Notification System (Week 2)
- [ ] Build `POST /api/admin/rfq-chat/[rfqId]/notify` endpoint
- [ ] Build RfqChatNotifyButton component (admin panel)
- [ ] Wire up the email sending via existing nodemailer
- [ ] **Build deep link** → `/customer/rfq/[rfqId]` with auto-focus on chat
- [ ] Insert system notification in chat when email is sent
- [ ] Log notifications in `rfq_chat_notification_log`

### Phase 4: Admin Features + Deletion (Week 3)
- [ ] Build admin chat routes (full history, no TTL)
- [ ] Connect OTP email for `jpgyap@gmail.com`
- [ ] Build deletion flow (select, confirm with OTP, soft-delete)
- [ ] Build RfqChatSelectToolbar + RfqChatDeleteModal

### Phase 5: Chatbot Backfill (Week 3)
- [ ] Build backfill endpoint + deduplication
- [ ] Wire to RFQ submission flow
- [ ] Build RfqChatBackfillNotice component

### Phase 6: Genius Features (Week 4)
- [ ] "Notify & Pin" — link to specific message
- [ ] Scheduled notifications
- [ ] Read receipts (track email opens via pixel tracking)
- [ ] Notification templates with variables
- [ ] Customer activity status in notify panel

### Phase 7: Polish (Week 4)
- [ ] TTL cleanup job
- [ ] Image/file upload support
- [ ] Notification analytics dashboard
- [ ] "Notify All Active RFQs" bulk feature
- [ ] Performance testing

---

## 11. Security & Privacy

| Concern | Mitigation |
|---------|-----------|
| Customer sees admin notes | `customer_visible` flag — never set by customer |
| Message injection | Strip HTML from customer messages |
| Deletion security | OTP to `jpgyap@gmail.com` — verified before delete |
| Email spam | Admin MUST click "Notify" — zero auto-email |
| Deep link hijacking | Customer session required — link redirects to login if not authenticated |

---

## 12. Deletion Audit Trail

Every deletion is permanently logged:

```json
{
  "deleted_by": "Admin Name (ID: 42)",
  "deleted_at": "2026-07-15T10:30:00Z",
  "otp_email": "jpgyap@gmail.com",
  "otp_verified": true,
  "message_count": 3,
  "not_deleted_ids": []  // system events skipped
}
```

---

## 13. Feature Pipeline (Future Scope)

| Feature | Description |
|---------|-------------|
| AI Customer Profiling | Analyze messages for negotiation style, price sensitivity |
| AI Sentiment Tracking | Per-message sentiment scoring with trend visualization |
| Smart Reply Suggestions | AI-suggested admin replies |
| Churn Prediction | Flag RFQs likely to go cold |
| Automated RFQ Status via Chat | AI detects "we accept" → auto-updates status |
| SMS Notifications | Twilio/Semaphore for SMS alerts |
| SSE Real-Time | Replace polling with server-sent events |

---

## 14. Metrics to Track

| KPI | Why |
|-----|-----|
| Messages per RFQ | Engagement depth |
| Notification open rate | Are customers reading updates? |
| Avg time from notify to customer reply | Does notification drive conversation? |
| Admin response time | Sales responsiveness |
| RFQ → Close rate with chat | Does chat improve conversion? |
| Notifications sent per RFQ | Are we over-notifying? |
| "Notify & Pin" usage | Do admins use contextual notifications? |
