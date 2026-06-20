# Gmail Deliverability Checklist

## DNS

- SPF exists for the sending provider.
- DKIM is enabled and aligned with the From domain.
- DMARC exists, start with p=none, then quarantine after stable sending.
- Use a subdomain first: news.homeu.ph or mail.homeu.ph.

## Sending rules

- Never send to users without consent.
- Do not import scraped emails.
- Start slowly: 50-100/day, then increase.
- Use suppression list for bounces, complaints, and unsubscribes.
- Always include unsubscribe link.
- Avoid misleading subject lines.
- Prefer useful catalog/RFQ content over spammy promotions.

## HomeU-friendly content

Good:
- New arrivals for architects
- Project furniture ideas
- Showroom appointment invitation
- Product catalogue updates
- Design guide downloads

Bad:
- ALL CAPS
- Too many discount words
- Too many images and no text
- Sending every day to inactive users
