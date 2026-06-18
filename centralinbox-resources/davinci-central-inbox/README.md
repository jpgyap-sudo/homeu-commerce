# DaVinciOS Central Inbox Starter

Original starter code for a tabbed messaging monitoring system:

- Website Chat
- Facebook Messenger
- Instagram DM
- All Inbox
- Archived / Closed

This is designed to be copied into your existing DaVinciOS / Payload / Next.js admin project and adapted by your coding agent.

## What is included

```txt
prisma/schema.prisma              Shared database model
src/lib/central-inbox             Message services, provider adapters, validators
src/app/api/messages              Conversations/messages API
src/app/api/webhooks/meta         Meta webhook verification + inbound messages
src/app/admin/apps/central-inbox  Tabbed admin inbox page
src/components/central-inbox      UI components
scripts/seed-central-inbox.ts     Demo data
scripts/coding-agent-prompt.md    Prompt for your coding extension
```

## Safe migration order

1. Wire this module to your existing website chatbox records.
2. Use Website tab first.
3. Add Facebook Page Messenger webhook.
4. Add Instagram DM webhook after Meta permissions/app review.
5. Add AI reply suggestions only after human inbox is stable.

## Important

Do not store Meta access tokens as plain text in production. Use encrypted storage or a secrets vault.


## Updated: multiple Facebook Pages and Instagram accounts

This package now supports multiple Facebook Pages and multiple Instagram accounts through the generic `InboxChannel` model.

Use:

```txt
/admin/apps/central-inbox?tab=facebook
/admin/apps/central-inbox?tab=facebook&channelId=facebook:homeu-furniture-demo
/admin/apps/central-inbox?tab=instagram&channelId=instagram:homeu-lighting-demo
```

Read `docs/multiple-facebook-instagram-pages.md` before implementing Meta OAuth.
