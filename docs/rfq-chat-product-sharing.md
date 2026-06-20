# In-Chat Product Sharing — Genius Feature

> **Concept:** Turn the RFQ chat into a visual sales tool where products can be searched, previewed, and shared directly in the conversation — no tab switching, no copy-pasting.

---

## The Problem

Currently, when an admin wants to discuss a product with a customer:
1. Open a new tab with product listing
2. Copy product link
3. Switch back to RFQ chat
4. Paste link
5. Customer clicks link, leaves RFQ page

**8 steps for a single product reference.** Too much friction.

## The Solution

In-chat product browser that sends rich product cards as messages:

```
┌──────────────────────────────────────────────┐
│ 💬 Messages & Timeline                       │
│                                               │
│ Admin: "I recommend this dining set:"         │
│ ┌─────────────────────────────────────────┐  │
│ │ 🪑 Malibu Dining Table                  │  │
│ │ ₱12,500 · Category: Dining              │  │
│ │ [View Product] [Add to RFQ Cart]        │  │
│ └─────────────────────────────────────────┘  │
│                                               │
│ Customer: "That looks great!"               │
│                                               │
│ ┌─────────────────────────────────────────┐  │
│ │ 🔍 [Search products...]    [Send]      │  │
│ └─────────────────────────────────────────┘  │
└──────────────────────────────────────────────┘
```

---

## Implementation

### 1. New Message Type

The DB already supports `message_type = 'image'`. Not adding a new type — just use `message_type = 'text'` with structured JSON in `metadata`:

```json
{
  "message_type": "text",
  "metadata": {
    "productCard": {
      "id": 42,
      "title": "Malibu Dining Table",
      "price": 12500,
      "imageUrl": "https://...",
      "slug": "malibu-dining-table",
      "categoryTitle": "Dining Tables"
    }
  }
}
```

The `RfqChatMessageBubble` component checks for `metadata.productCard` and renders the rich card instead of plain text.

### 2. Product Search Panel (Inline)

New component: `RfqChatProductSearch`

A collapsible panel below the chat input that:
- Has a search input (debounced, 300ms)
- Shows a grid of product cards (image + title + price)
- Clicking a card sends it as a chat message with the product card metadata
- Has a close button to collapse
- Shows recent products first, then search results

### 3. Product Card Bubble Component

New component: `RfqChatProductCard`

Renders inside `RfqChatMessageBubble` when `metadata.productCard` exists:
- Product image (thumbnail)
- Title
- Price
- "View Product" link (opens in new tab)
- "Add to RFQ Cart" button (admin only — adds to the RFQ request_items)

### 4. Flow

```
User clicks 🔍 or types "/" in chat
  → Product search panel slides open below input
  → Shows 12 recent products (from product listing API)
  → User types to search (GET /api/products?search=...)
  → Grid updates in real-time (debounced 300ms)
  → User clicks a product card
  → Product card message is sent to chat
  → Panel collapses
  → Both customer and admin see the rich product card

Admin additionally sees "Add to RFQ Cart" button on the card
  → Click adds product to rfq_request_items for this RFQ
  → System event: "📦 Product added to RFQ: Malibu Dining Table (x1)"
```

### 5. API

Reuse existing public product search:
- `GET /api/products?search=query&limit=12` — works for both customer and admin
- `POST /api/rfq/add-item` — admin-only, adds to RFQ items

### 6. Components to Create

| Component | Purpose |
|-----------|---------|
| `RfqChatProductSearch.tsx` | Inline search panel (slides open/closed) |
| `RfqChatProductCard.tsx` | Rich product card renderer for bubbles |

### 7. Files to Modify

| File | Change |
|------|--------|
| `RfqChatInput.tsx` | Add 🔍 toggle button + "/" keyboard shortcut |
| `RfqChatContainer.tsx` | Include product search panel, pass onSendProduct |
| `RfqChatAdminContainer.tsx` | Same + admin "Add to RFQ" action |
| `RfqChatMessageBubble.tsx` | Check metadata.productCard → render product card |

---

## Wireframe

### Customer View

```
┌──────────────────────────────────────────────┐
│ 💬 Messages & Timeline                       │
│                                               │
│ [Today]                                       │
│  ├─ System: 📄 Quotation v1 created          │
│  ├─ Admin: "Check this option:"              │
│  ├─ ┌──────────────────────────────────┐    │
│  │  │ 🪑 Modern Office Chair           │    │
│  │  │ ₱8,500 · Office Furniture        │    │
│  │  │ [🔗 View Product]                │    │
│  │  └──────────────────────────────────┘    │
│  └─ You: "That's nice but too expensive"    │
│                                               │
│ ┌─────────────────────────────────────────┐  │
│ │ 🔍 [Search products...]    📎 [Send]   │  │
│ └─────────────────────────────────────────┘  │
│                                               │
│ [Product Search Panel — collapsed by default] │
└──────────────────────────────────────────────┘
```

### Admin View — Product Panel Open

```
┌──────────────────────────────────────────────┐
│ 💬 RFQ Chat                                  │
│                                               │
│ ... (messages)                                │
│                                               │
│ ┌─────────────────────────────────────────┐  │
│ │ Type a message...              [Send]  │  │
│ └─────────────────────────────────────────┘  │
│ 🔍 [Search products...]                     │
│ ┌─────────────────────────────────────────┐  │
│ │ ┌──────┐ ┌──────┐ ┌──────┐            │  │
│ │ │ 🪑   │ │ 🛋️  │ │ 💡   │            │  │
│ │ │Chair │ │Sofa  │ │Lamp  │            │  │
│ │ │₱8.5k │ │₱45k  │ │₱2.5k │            │  │
│ │ └──────┘ └──────┘ └──────┘            │  │
│ │ ┌──────┐ ┌──────┐ ┌──────┐            │  │
│ │ │ 🪑   │ │ 🛏️  │ │ 🪞   │            │  │
│ │ │Table │ │Bed   │ │Mirror│            │  │
│ │ │₱12k  │ │₱28k  │ │₱4k   │            │  │
│ │ └──────┘ └──────┘ └──────┘            │  │
│ └─────────────────────────────────────────┘  │
│ Showing 6 of 150+ products                   │
└──────────────────────────────────────────────┘
```

## Implementation Files

- New: `apps/website/src/components/rfq-chat/RfqChatProductSearch.tsx`
- New: `apps/website/src/components/rfq-chat/RfqChatProductCard.tsx`
- Modify: `apps/website/src/components/rfq-chat/RfqChatInput.tsx`
- Modify: `apps/website/src/components/rfq-chat/RfqChatMessageBubble.tsx`
- Modify: `apps/website/src/components/rfq-chat/RfqChatContainer.tsx`
- Modify: `apps/website/src/components/rfq-chat/RfqChatAdminContainer.tsx`
