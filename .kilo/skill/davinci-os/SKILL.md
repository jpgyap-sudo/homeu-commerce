# DaVinciOS Skill

## Overview

DaVinciOS is the branded CMS and backend layer for HomeU Commerce. In this repository, all application code, documentation, environment variables, route groups, and tools should use DaVinciOS naming only.

## Project Structure

- `apps/website/src/daVinciOS.config.ts` - CMS config, collections, database adapter, admin metadata, CORS, and CSRF.
- `apps/website/src/app/(DaVinciOS)` - DaVinciOS admin, REST, and GraphQL routes.
- `apps/website/src/collections` - Products, Categories, Customers, RFQs, Quotations, Media, Pages, and Redirects.
- `apps/website/src/globals` - DaVinciOS globals such as SEO health.
- `tools/shopify-import` - Shopify export transformation and DaVinciOS import helpers.

## Environment

```env
DAVINCIOS_SECRET=<strong-secret>
DAVINCIOS_PUBLIC_SERVER_URL=https://admin.homeu.ph
DATABASE_URI=postgres://homeu:password@postgres:5432/homeu
NEXT_PUBLIC_SITE_URL=https://store.homeu.ph
```

## Development Rules

- Use `DaVinciOS` and `@DaVinciOScms/*` imports in source code.
- Use `@DaVinciOS-config` when importing the CMS config from app routes.
- Use `DAVINCIOS_*` environment variable names in all project-owned scripts.
- Keep the config filename lowercase: `daVinciOS.config.ts`.
- Keep admin routes under `(DaVinciOS)`.
- Keep imported product data named `DaVinciOS-products.json`, `DaVinciOS-categories.json`, and `DaVinciOS-pages.json`.

## Collections

- `products` - catalog items and RFQ-ready pricing metadata.
- `categories` - catalog taxonomy.
- `customers` - customer accounts and roles.
- `rfq-requests` - quote requests from customers and staff.
- `quotations` - formal quote documents generated from RFQs.
- `media` - uploaded assets.
- `pages` - content pages.
- `redirects` - migration redirects.

## Admin Workflow

1. Products and categories are maintained in DaVinciOS.
2. Customers submit RFQs from the storefront quote cart.
3. Staff review RFQs in the backend.
4. Staff convert RFQs into quotations.
5. Customers track RFQ and quotation status in the customer portal.

## Verification

Run these checks after DaVinciOS-related edits:

```bash
cd apps/website
npm exec tsc -- --noEmit
npm run build
```

Before committing, run a repository sweep for old brand text in tracked project files.
