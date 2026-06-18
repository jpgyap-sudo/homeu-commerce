# DaVinciOS Central Inbox Architecture

## Purpose

Central monitoring and reply system for HomeU customer messages.

## Tabs

```txt
/admin/apps/central-inbox?tab=website
/admin/apps/central-inbox?tab=facebook
/admin/apps/central-inbox?tab=instagram
/admin/apps/central-inbox?tab=all
/admin/apps/central-inbox?tab=archived
```

## Core Principle

Use a shared database but separate UX tabs.

```txt
InboxChannel
→ Contact
→ Conversation
→ Message
```

## Why this is safer than a big CRM build

- You keep the existing website chatbox.
- You add Facebook and Instagram without changing the sales process.
- You can add RFQ, product recommendations, and appointment booking later.
- AI can suggest replies without risking accidental customer messages.

## Future AI Agent Flow

```txt
New inbound message
→ classify intent
→ extract product/RFQ/appointment need
→ suggest reply
→ suggest product links
→ human approves
→ send through correct channel adapter
```

## Suggested Future Features

- Assign conversation to sales staff.
- Internal notes.
- Tags: RFQ, appointment, urgent, after-sales, architect, supplier.
- Customer profile timeline.
- Link message to RFQ cart.
- Link message to showroom appointment.
- AI reply suggestions.
- AI lead scoring.
- Telegram alert for hot leads.
