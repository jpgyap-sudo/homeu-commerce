# AI Coding Instructions

## Project: HomeU Catalog + RFQ Starter

**Goal:** Replace Shopify (www.homeu.ph) with a self-hosted furniture catalog website on VPS.

**Stack:** Next.js + Payload CMS + PostgreSQL + Docker

**Domains:**
- Frontend: store.homeu.ph → Next.js storefront
- Admin: admin.homeu.ph → Payload CMS admin

## Phase 1 Strategy (Current)

Build HomeU as a priced furniture catalog with RFQ cart. Do NOT build checkout, payment, or full ecommerce order flows in Phase 1.

## Priorities

1. **SEO preservation** — Keep URLs, titles, meta descriptions identical to Shopify
2. **Visual clone** — Match the current Shopify site design exactly
3. **Product import accuracy** — All 661 products must import correctly
4. **RFQ cart and request flow** — Replace Shopify checkout with quote-based system
5. **Simple maintainable code** — Prefer simplicity over complexity

## Key Collections (Payload CMS)

| Collection | Purpose |
|------------|---------|
| Products | Furniture catalog with prices, dimensions, materials, images |
| Categories | Collection groupings matching Shopify |
| RFQRequests | Bulk quotation requests from customers |
| Media | Product images and uploads |
| Pages | Static pages (About, FAQ, Contact, etc.) |

## Available Tools

| Tool | Purpose |
|------|---------|
| `tools/shopify-import/` | Import Shopify data into Payload |
| `tools/seo-audit/` | Audit SEO metadata during migration |
| `tools/theme-analyzer/` | Analyze Shopify theme for visual cloning |
| `tools/crawler/` | Crawl Shopify site to discover all URLs |
| `.kilo/skill/shopify-reverse-engineer/` | Full reverse engineering skill |

## Security Rules

- No analytics/telemetry code (confirmed clean)
- All deps pinned to specific versions
- Payload CMS configured with CORS/CSRF whitelist
- Nginx with security headers
- SSL via Let's Encrypt with auto-renewal
