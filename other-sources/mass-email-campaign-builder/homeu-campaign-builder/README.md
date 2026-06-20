# HomeU / DaVinciOS Mass Email Campaign Builder

Original from-scratch feature package for building a simple, safe mass email campaign builder inside DaVinciOS/HomeU.

This is NOT copied from Listmonk, Mautic, Mailtrain, Keila, or any other repo. Those projects are listed only as architecture references in `docs/REFERENCE_REPOS.md`.

## What this adds

- Contacts and subscriber profiles
- Marketing consent and suppression list
- Segments for Architects, Designers, Contractors, Homeowners, Hot Leads, etc.
- Email templates with variables
- Campaign builder
- Test send
- Queue-based bulk sending
- Rate limiting to protect domain reputation
- SMTP adapter and Amazon SES-style adapter interface
- Open tracking pixel
- Click tracking redirect
- Unsubscribe center
- Bounce / complaint webhook placeholders
- Campaign analytics
- React admin UI
- Docker Compose for local development

## Recommended usage

Keep Shopify/HomeU live. Run this as a separate marketing service first:

```txt
HomeU Website / DaVinciOS
        ↓
Campaign Builder API
        ↓
Queue Worker
        ↓
Amazon SES / SMTP Provider
        ↓
Customer Gmail / Outlook / Yahoo
```

Do not send directly from your VPS IP in production. Use Amazon SES, Mailgun, Postmark, Brevo, or another reputable SMTP provider.

## Quick start

```bash
cp .env.example .env
docker compose up --build
```

Then open:

- API: http://localhost:4100/health
- Admin UI: http://localhost:5174

## Folder structure

```txt
backend/     Express API + queue worker
frontend/    React admin UI
database/    PostgreSQL schema
docs/        implementation docs and references
examples/    sample contacts and templates
```
