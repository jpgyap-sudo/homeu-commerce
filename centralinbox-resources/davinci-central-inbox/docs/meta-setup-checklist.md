# Meta Setup Checklist

Use this as a build checklist. Do not commit real tokens.

## Required concepts

- Meta App
- Facebook Login / Business Login
- Page access tokens
- Messenger webhooks
- Instagram Messaging API
- App review for production permissions

## Multi-page setup

One Meta App can connect multiple Facebook Pages. Store each connected Page as a separate `InboxChannel`.

```txt
Facebook Page 1 -> InboxChannel facebook:PAGE_ID_1
Facebook Page 2 -> InboxChannel facebook:PAGE_ID_2
Instagram Account 1 -> InboxChannel instagram:IG_ID_1
Instagram Account 2 -> InboxChannel instagram:IG_ID_2
```

## Webhook endpoint

```txt
GET  /api/webhooks/meta   webhook verification
POST /api/webhooks/meta   inbound messages
```

## Token storage

Never store raw access tokens in plaintext. Encrypt before storing in `accessTokenEncrypted`.

Recommended environment values:

```env
META_APP_ID=
META_APP_SECRET=
META_VERIFY_TOKEN=
META_GRAPH_VERSION=v23.0
INBOX_TOKEN_ENCRYPTION_KEY=
```

## Production safety

- Verify webhook signatures.
- Deduplicate `externalMessageId`.
- Log raw webhook payloads for debugging.
- Add rate limit protection.
- Require admin approval before AI auto-replies.
