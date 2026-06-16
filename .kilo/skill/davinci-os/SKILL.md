# HomeU Commerce — Backend & Admin Skill

## Overview

HomeU Commerce uses a custom Next.js 16 backend with direct PostgreSQL integration — no CMS framework. The admin panel, API routes, and storefront are all built within the Next.js App Router using `@/lib/db` (the `pg` package) for all database operations.

## Project Structure

- `apps/website/src/lib/db.ts` — PostgreSQL query helpers (`query`, `find`, `findOne`, `insert`, `update`, `delete_`)
- `apps/website/src/lib/auth.ts` — JWT-based admin authentication via `jose`
- `apps/website/src/app/admin/` — Admin panel pages (Products, Categories, Customers, RFQs, Quotations, Media, Pages, Redirects, Dashboard, Analytics)
- `apps/website/src/app/api/` — REST API routes (products, categories, customers, media, pages, redirects, quotations, appointments, chat, cart, admin auth)
- `apps/website/src/collections/` — Collection type definitions (stub types from `types/davincios`)
- `apps/website/src/globals/` — Global config definitions
- `apps/website/src/types/davincios.d.ts` — Stub type definitions for `CollectionConfig` and `GlobalConfig`

## Environment

```env
DAVINCIOS_SECRET=<strong-secret>
DAVINCIOS_PUBLIC_SERVER_URL=https://admin.homeu.ph
DATABASE_URI=postgres://homeu:password@postgres:5432/homeu
NEXT_PUBLIC_SITE_URL=https://store.homeu.ph
JWT_SECRET=<jwt-signing-secret>
```

## Database Tables

All data is stored in PostgreSQL tables accessed directly via `@/lib/db`:

- `products` — catalog items with pricing, inventory, SEO metadata
- `categories` — catalog taxonomy with parent-child hierarchy
- `customers` — customer accounts (bcrypt password hashing, JWT auth)
- `rfq_requests` — quote requests from customers
- `quotations` — formal quote documents
- `media` — uploaded assets (stored in DigitalOcean Spaces via S3)
- `pages` — content pages with SEO metadata
- `redirects` — URL redirects for migration and SEO

## Admin Workflow

1. Products and categories are managed through custom admin pages at `/admin/products`, `/admin/categories`
2. Staff authenticate via `/admin/login` (JWT-based, no session cookies)
3. Customers submit RFQs from the storefront quote cart
4. Staff review RFQs in the admin backend at `/admin/rfq`
5. Staff convert RFQs into quotations at `/admin/quotations`
6. Customers track RFQ and quotation status in the customer portal

## API Architecture

All API routes are custom Next.js route handlers — no auto-generated REST endpoints:

- `GET/POST /api/products` — Product listing and creation
- `GET/PATCH/DELETE /api/products/[id]` — Single product CRUD
- `GET/POST /api/categories` — Category listing and creation
- `GET/PATCH/DELETE /api/categories/[id]` — Single category CRUD
- `GET/POST /api/customers` — Customer management
- `POST /api/admin/login` — Admin authentication (returns JWT)
- `GET /api/customers/me` — Authenticated customer profile
- `POST /api/rfq/submit` — RFQ submission from storefront
- Chatbot API routes at `/api/chat/*`

## Verification

Run these checks after backend edits:

```bash
cd apps/website
npm exec tsc -- --noEmit
npm run build
```

Verify the admin panel loads at `http://localhost:3000/admin/login`.

## Key Rules

- Use `@/lib/db` query helpers for all database access — never raw `pg` pool directly in route handlers
- Use `@/lib/auth` for admin authentication — JWT verification via `getSession()`
- Collection files in `src/collections/` import stub types from `../types/davincios`
- Environment variables use `DAVINCIOS_*` prefix for CMS-related config, `NEXT_PUBLIC_*` for client-side values
