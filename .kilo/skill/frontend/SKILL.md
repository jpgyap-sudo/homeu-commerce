# Frontend Skill — HomeU Commerce

Build and maintain the customer-facing Next.js frontend at **`store.homeu.ph`**.

## Domain Overview

HomeU.PH (homeu.ph) is a Philippine furniture & interior design retailer. The new frontend replaces Shopify with a catalog + RFQ model — no checkout/payment.

### Brand Identity
- **Name:** HOMEU.PH (Home Atelier PH)
- **Tagline:** Modern Interior | Contemporary Furniture | Bespoke Designs
- **Social:** [Facebook](https://facebook.com/homeatelierph), [Instagram](https://instagram.com/homeatelierph), [Pinterest](https://pinterest.ph/modern_interior_8/), [YouTube](https://youtube.com/channel/UCfXNTc7j8Ht-k0BeLTaDH7Q)
- **Logo:** HomeU Combination Logo (B&W)

### Shopify Collections to Port

| Collection | URL Slug | Type |
|------------|----------|------|
| Ready-stock Lighting | `lighting-on-stock` | On-stock |
| Furniture On Stock | `furniture-on-sticj` | On-stock |
| Ready-stock Decor | `decor-onstock` | On-stock |
| Stone On Stock | `stone-onstock` | On-stock |

### Full Category Tree (from Shopify navigation)

```
Main Menu:
├── Home
├── Quick Delivery (On-Stock)
│   ├── Lighting
│   ├── Furniture
│   ├── Stone
│   ├── Decor
│   ├── Ceiling Fan
│   ├── Wall Panel
│   └── Rugs
├── Wall Panels
│   ├── Slat (Fluted) Wall Panel
│   ├── Solid Wood Slat Panel
│   └── Profile Accessories
├── Lighting | Ceiling Fan
│   ├── Ceiling Fan
│   ├── Table Lamp
│   ├── Pendant Light
│   ├── Ceiling Mounted Light
│   ├── Floor Lamp
│   └── Wall Light
├── Furniture
│   ├── Armchair, Bar Stool, Bed, Bed Frame, Bench, Cabinet...
├── Stone Options
│   ├── Sintered Stone
│   └── Natural Stone
├── Finish Materials (Linen, Leather, Fabric...)
├── Designer Club
└── Design Trends (blog)
```

## Architecture

```
store.homeu.ph (Next.js 16 + Payload 3.x)
│
├── Public Routes (no auth)
│   ├── / → Homepage (hero, featured products, categories)
│   ├── /products → Product listing / search
│   ├── /products/[slug] → Product detail page
│   ├── /categories/[slug] → Category/collection page
│   ├── /cart → RFQ Cart view
│   └── /rfq/submit → RFQ form
│
├── API Routes (Next.js, proxied from Payload)
│   ├── /api/products
│   ├── /api/categories
│   ├── /api/pages
│   └── /api/rfq-requests
│
└── Admin (Payload CMS)
    └── /admin → admin.homeu.ph
```

## Payload Collections (Backend Data Sources)

### Products (`/api/products`)
```
{
  id, title, slug, sku,
  price, salePrice, showPrice, priceNote,
  description (richText),
  dimensions, materials,
  images[] → Media upload,
  category → Categories,
  seoTitle, seoDescription,
  shopifyOriginalUrl
}
```

### Categories (`/api/categories`)
```
{
  id, title, slug, description,
  image → Media,
  parent → Categories (self),
  shopifyOriginalUrl
}
```

### Pages (`/api/pages`)
```
{
  id, title, slug,
  content (richText),
  shopifyOriginalUrl
}
```

### RFQRequests (`/api/rfq-requests`)
```
{
  id, customerName, email, phone,
  deliveryLocation, projectType,
  notes,
  items[]: { product, productTitleSnapshot, skuSnapshot, unitPriceSnapshot, quantity },
  estimatedTotal, status
}
```

## Component Inventory

### Existing (Build or Refine)
| Component | File | Status |
|-----------|------|--------|
| Root Layout | [`app/layout.tsx`](apps/website/src/app/layout.tsx) | ✅ Minimal |
| Homepage | [`app/page.tsx`](apps/website/src/app/page.tsx) | ✅ Minimal hero |
| Quote Cart (client) | [`components/QuoteCart.tsx`](apps/website/src/components/QuoteCart.tsx) | ✅ localStorage logic |
| Globals CSS | [`app/globals.css`](apps/website/src/app/globals.css) | ✅ Skeleton |

### Needed (Build from Scratch)
| Component | Route | Priority |
|-----------|-------|----------|
| Header/Nav | All pages | P0 |
| Footer | All pages | P0 |
| ProductCard | `/products`, `/categories/[slug]` | P0 |
| ProductGrid | `/products`, `/categories/[slug]` | P0 |
| ProductDetail | `/products/[slug]` | P0 |
| CategoryHero | `/categories/[slug]` | P0 |
| CategoryNav | `/categories/[slug]` | P1 |
| CartDrawer/Page | `/cart` | P1 |
| RFQForm | `/rfq/submit` | P1 |
| HeroSlider/Featured | `/` | P1 |
| SearchBar | `/products` | P2 |
| Breadcrumbs | All pages | P2 |
| Pagination | `/products` | P2 |
| MobileNav | All pages | P2 |

## Frontend Data Fetching Pattern

Always use Payload's REST API directly from server components:

```typescript
// Server component data fetching
async function getProducts() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/products`, {
    next: { revalidate: 60 },
  })
  return res.json()
}

// Client component data fetching via Payload REST API
// If the user is browsing from store.homeu.ph, proxy through Next.js:
const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api'
```

## RFQ Cart Workflow

```
Browse Products → Add to Quote Cart (localStorage)
  → View Cart (/cart) → Adjust Quantities
    → Submit RFQ (/rfq/submit) → POST to /api/rfq-requests
      → Admin reviews at admin.homeu.ph/admin/collections/rfq-requests
```

The cart is persisted in `localStorage` under key `homeu_quote_cart`. Use [`QuoteCart.tsx`](apps/website/src/components/QuoteCart.tsx) utilities:

```typescript
import { addToQuoteCart, getQuoteCart, saveQuoteCart, type QuoteItem } from '@/components/QuoteCart'

// Add item
addToQuoteCart({ productId: 'abc', title: 'Product', price: 100, quantity: 1 })

// Read cart
const items: QuoteItem[] = getQuoteCart()
```

## Design Guidelines

- Match the Shopify site (`homeu.ph`) visual identity closely (Phase 1)
- Clean, modern, furniture‑focused aesthetic
- Typography: System fonts or Google Fonts (Inter, Montserrat)
- Color palette: Extract from Shopify theme (neutral + brand accent)
- Fully responsive (mobile-first)
- Images from Shopify CDN initially; migrate to self-hosted later

## Development Commands

```bash
# Run dev server (from project root)
cd apps/website && npm run dev

# Build
cd apps/website && npm run build

# Lint
cd apps/website && npm run lint
```

## Verification

```bash
# Compare new frontend with Shopify original
node tools/playwright-scanner/ollama-vision.mjs verify \
  tools/playwright-scanner/output/screenshots/shopify-home.png \
  apps/website/public/screenshots/new-home.png

# Run Lighthouse audit
node tools/lighthouse-tool/LIGHTHOUSE.md  # (if configured)
```
