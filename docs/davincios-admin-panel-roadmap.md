# DaVinciOS Admin Panel Roadmap

Goal: make `admin.homeu.ph` feel as familiar as Shopify's admin, but sharper for HomeU's catalog, RFQ, SEO migration, and furniture operations.

## Immediate Fixes

- Products, categories, pages, media, redirects, RFQs, and SEO health must be writable for backend staff.
- Public storefront reads remain open where needed.
- Backend writes must require a DaVinciOS account with `admin` or `staff` role.
- Product list columns should match merchant scanning habits: title, status, SKU, inventory, category, product type, vendor.

## Navigation Model

Recommended backend areas:

- Home: operational overview and alerts
- Products: product list, inventory fields, media, SEO
- Categories: catalog navigation and SEO landing pages
- RFQs: quote pipeline and customer requests
- Customers: accounts, project notes, RFQ history
- Content: pages and media
- SEO Migration: redirects and SEO health
- Analytics: RFQ value, missing content, migration readiness

## Product Admin Improvements

Current foundation:

- `status`
- `vendor`
- `productType`
- `inventoryTracked`
- `inventoryQuantity`
- `salesChannels`

Next steps:

- add product variants/options for size, finish, fabric, color, and configuration
- add cost/margin fields hidden from public storefront
- add bulk edit for status, category, channel, and SEO
- add "missing data" filters for no image, no SEO, no price, no category
- add product media drag ordering

## RFQ Admin Improvements

Current foundation:

- status pipeline
- customer relationship
- item snapshots
- estimated total
- internal notes

Next steps:

- quote document generator
- quote sent activity timeline
- follow-up reminder date
- assigned staff member
- AI price suggestion and bundle suggestions
- customer project profile: room, budget, timeline, delivery area

## Security Model

Use `customers.role` until a separate staff auth collection exists:

- `admin`: full backend management
- `staff`: product/RFQ/content management
- `customer`: storefront account only

Legacy accounts with no role are temporarily allowed for backend writes so the first existing admin does not get locked out. After setting roles in production, tighten this to require explicit `admin` or `staff`.

## Better Than Shopify Ideas

- RFQ-first dashboard instead of order-first dashboard
- SEO migration health score built into the backend
- product readiness score per item
- room/package builder for furniture bundles
- quote assistant that drafts suggested substitutions and upsells
- customer portal connected to RFQ status and quote history
