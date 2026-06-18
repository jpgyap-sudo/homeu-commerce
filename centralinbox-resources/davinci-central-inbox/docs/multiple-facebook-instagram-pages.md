# Multiple Facebook Pages and Instagram Accounts

Design rule: never create one hardcoded Facebook inbox. Treat every Facebook Page, Instagram account, website chat widget, WhatsApp number, Telegram bot, or Viber number as a row in `InboxChannel`.

## Example channel rows

```txt
id                              type       name                    externalAccountId  brandKey
facebook:123456789              FACEBOOK   HomeU Furniture FB       123456789          homeu-furniture
facebook:987654321              FACEBOOK   HomeU Lighting FB        987654321          homeu-lighting
instagram:17841400000000000     INSTAGRAM  HomeU Furniture IG       17841400000000000  homeu-furniture
instagram:17841499999999999     INSTAGRAM  HomeU Lighting IG        17841499999999999  homeu-lighting
website:default                 WEBSITE    Website Chat             default            homeu
```

## UI behavior

```txt
Central Inbox
├─ All Inbox
├─ Website Chat
│  └─ Website Chat
├─ Facebook Messenger
│  ├─ All Facebook
│  ├─ HomeU Furniture FB
│  └─ HomeU Lighting FB
├─ Instagram DM
│  ├─ All Instagram
│  ├─ HomeU Furniture IG
│  └─ HomeU Lighting IG
└─ Archived / Closed
```

The tab filters by provider. The account pills filter by exact `channelId`.

## Meta onboarding flow

One Meta App can connect multiple Facebook Pages and their linked Instagram Business accounts.

Recommended flow:

1. Admin clicks **Connect Facebook**.
2. Admin logs in through Meta OAuth.
3. App requests page permissions.
4. Backend calls `/me/accounts` to list Pages the user manages.
5. Admin selects one or more Pages.
6. Backend stores each Page as one `InboxChannel` row.
7. Backend subscribes the app to each selected Page's webhooks.
8. Backend optionally checks linked Instagram Business Account for each Page and stores it as its own `InboxChannel` row.

## Important implementation detail

Meta webhook payloads include an `entry.id`. For Facebook Messenger this normally identifies the Page that received the message. Use it to route the message to the correct `InboxChannel`.

For Instagram Messaging, use the Instagram object/account ID returned by Meta to identify the correct Instagram channel. Keep the linked Facebook Page ID in `externalPageId` when available.

## Why this matters

If you hardcode only one Facebook Page, you will need a painful migration later. Generic channels allow future support for:

- WhatsApp Business
- Telegram
- Viber
- Email
- Lazada/Shopee messages
- Multiple brands or branches
