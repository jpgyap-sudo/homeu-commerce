# Coding Agent Prompt — DaVinciOS Central Inbox

You are integrating the DaVinciOS Central Inbox module into the existing HomeU Commerce admin panel.

## Goal

Create a tabbed messaging monitoring system with separate inbox tabs:

- Website Chat
- Facebook Messenger
- Instagram DM
- All Inbox
- Archived / Closed

Use one shared database for contacts, conversations, messages, and channels. Do not visually merge channels except in the All Inbox tab.

## Rules

1. Build original code only.
2. Use repo references only for architecture inspiration, not copy-paste.
3. Preserve existing website chatbox behavior.
4. Channel-aware replies must go back through the correct provider.
5. Store Meta tokens encrypted, never plain text in production.
6. Do not auto-send AI replies yet. AI can suggest only.
7. Keep Shopify/HomeU migration low-risk.

## Integration Steps

1. Copy Prisma models into the existing schema and run migration.
2. Copy `src/lib/central-inbox` into the project.
3. Add `/api/messages` routes or adapt them to existing API conventions.
4. Add `/api/webhooks/meta` route for Meta webhook verification and inbound messages.
5. Add `/admin/apps/central-inbox` page and sidebar link.
6. Connect existing website chatbox POST handler to `ingestInboundMessage()`.
7. Seed demo data and test tabs.
8. Add Facebook Page webhook.
9. Add Instagram Messaging after Meta setup/app review.

## Test Checklist

- Website message appears only in Website Chat and All Inbox.
- Facebook message appears only in Facebook Messenger and All Inbox.
- Instagram message appears only in Instagram DM and All Inbox.
- Closed conversations move to Archived / Closed.
- Meta webhook GET verification returns the challenge.
- Meta webhook POST rejects invalid signatures in production.
- No token is exposed to frontend.


## New requirement: multiple accounts

Update the central inbox so one Meta App can connect multiple Facebook Pages and multiple Instagram Business accounts. Do not create separate hardcoded tables per provider. Use `InboxChannel` for every account. The UI should show provider tabs and account-level filter pills. Replies must always use the selected conversation's `channelId` to choose the correct encrypted page/account token.
