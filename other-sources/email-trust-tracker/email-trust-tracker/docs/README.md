# HomeU Email Trust Tracker

A from-scratch feature module for DaVinciOS / HomeU that tracks email deliverability signals and buying intent.

It does **not** copy any existing repository. It is original starter code using normal open-source dependencies only.

## What this feature does

- Creates customer records.
- Records marketing consent.
- Records email messages sent to customers.
- Tracks estimated email opens using a 1x1 pixel.
- Tracks link clicks using a safe redirect URL.
- Tracks website actions:
  - product view
  - add to RFQ cart
  - RFQ submitted
  - appointment booked
  - contact card downloaded
- Generates a `.vcf` contact card so customers can add HomeU to contacts.
- Shows an admin dashboard with lead score.

## Recommended production architecture

```txt
HomeU / DaVinciOS
        |
        | website events
        v
Email Trust API ---- PostgreSQL
        |
        | dashboard reads stats
        v
Admin Dashboard

Listmonk / Mautic / Your sender
        |
        | embeds open pixel + click redirect
        v
Customer Gmail
```

## Important Gmail reality

Open tracking is only an estimate. Gmail, Apple Mail, and corporate filters can block or preload images.

For HomeU, prioritize:

1. Clicks
2. Product views
3. RFQ cart actions
4. RFQ submissions
5. Showroom appointments

These are more useful than open rate.

## Local setup

```bash
cp .env.example .env
npm run dev
```

Then open:

```txt
http://localhost:5178
```

API:

```txt
http://localhost:4010/health
```

## Production notes

Use a sending provider like Amazon SES, Postmark, Mailgun, or Brevo. Do not send directly from your VPS IP unless you know email infrastructure well.

Required DNS:

- SPF
- DKIM
- DMARC
- custom tracking domain, example: `mail.homeu.ph`

## Privacy notes

This module stores hashed IP addresses, not raw IPs. Keep a proper privacy policy and allow unsubscribe for marketing emails.
