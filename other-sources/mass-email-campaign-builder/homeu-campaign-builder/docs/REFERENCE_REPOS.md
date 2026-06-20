# Reference Repos and Products

Use these only as architectural references. Do not copy their code into DaVinciOS.

## 1. Listmonk
- Good reference for: simple newsletter campaigns, lists, fast sending, clean dashboard, SMTP integration.
- What to study: campaign/list mental model, performance simplicity, SQL-style segmentation idea.
- What not to copy: code, UI, exact database schema.

## 2. Mautic
- Good reference for: full marketing automation, campaign journeys, lead scoring, forms, landing pages.
- What to study: automation concepts and CRM-style contact timeline.
- What not to build yet: complex visual automation builder. Too heavy for Phase 1.

## 3. Mailtrain
- Good reference for: classic mailing list management and self-hosted newsletters.
- What to study: subscriber lifecycle and campaign sending flow.

## 4. Keila
- Good reference for: lightweight newsletter UX and open-source campaign management.
- What to study: simple campaign creation flow and list growth tools.

## 5. SendPortal
- Good reference for: Laravel-style email marketing dashboard.
- What to study: straightforward campaign/template/contact grouping.

## Practical HomeU rule

Build only the 20% of features you need now:

1. Contacts
2. Consent
3. Segments
4. Templates
5. Campaigns
6. Queue worker
7. SES/SMTP sending
8. Opens/clicks/unsubscribes
9. RFQ and product view lead scoring

Avoid building a huge marketing automation clone until the catalog/RFQ migration is stable.
