# Shopify → Next.js 1:1 Migration Skill

## What this does

Reverse-engineers a live Shopify store's theme, content, and navigation into a
Next.js / DaVinciOS codebase with **zero manual copy-paste** and **zero Shopify
redirects** (store stays live until launch).

## Genius Architecture

```
Shopify Admin GraphQL API
        │
        ├── Theme files (Liquid templates, CSS, settings_data.json)
        ├── Navigation menus (full tree with children)
        ├── Pages (HTML content)
        └── Shop preferences (metadata, social links)
                │
                ▼
  tools/shopify-import/migrate-theme.mjs
                │
    ┌───────────┼───────────────────────┐
    ▼           ▼                       ▼
debut-theme.css  theme-tokens.css    navigation.json
(184KB compiled  (Google Fonts +      site-config.json
 Debut CSS)       CSS variables)
    │                                   │
    ▼                                   ▼
public/debut-theme.css         DaVinciOS pages table
loaded in <head>               DaVinciOS navigation table
    │
    ▼
SiteHeader.tsx + SiteFooter.tsx
(use SAME CSS class names as Debut → pixel-perfect rendering)
```

### The Key Insight

Shopify's Debut theme CSS is **already compiled to plain CSS** (no Liquid in the
output). Copy it verbatim to `public/debut-theme.css`. Write React components
that use the **identical CSS class names** (`.site-header`, `.site-nav__item`,
`.site-nav__dropdown`, etc.) → the rendering is pixel-for-pixel identical to
the live Shopify store.

## Files Created

| File | Purpose |
|------|---------|
| `apps/website/public/debut-theme.css` | 184KB compiled Debut CSS (1:1 from live store) |
| `apps/website/src/styles/theme-tokens.css` | CSS vars from settings_data.json (Crimson Text + Cardo fonts) |
| `apps/website/src/styles/debut-overrides.css` | Bridge: Debut class names → HomeU CSS vars |
| `apps/website/src/data/navigation.json` | Full nav tree (main + footer, 10 top-level + submenus) |
| `apps/website/src/data/site-config.json` | Shop metadata, social links, colors, fonts |
| `apps/website/src/components/SiteHeader.tsx` | Debut-compatible header with dropdown nav |
| `apps/website/src/components/SiteFooter.tsx` | Debut-compatible footer with social icons |
| `apps/website/src/app/pages/[handle]/page.tsx` | Dynamic page route (renders DaVinciOS pages) |
| `tools/shopify-import/migrate-theme.mjs` | Master migration script (idempotent, re-runnable) |
| `tools/shopify-import/liquid-to-jsx.mjs` | Liquid → JSX transpiler (for templates) |

## Liquid → JSX Transpiler

`tools/shopify-import/liquid-to-jsx.mjs` converts any Shopify Liquid file to
a React TSX component automatically.

```bash
# Single file
node tools/shopify-import/liquid-to-jsx.mjs sections/header.liquid

# Batch convert all sections
node tools/shopify-import/liquid-to-jsx.mjs --batch sections/ src/components/shopify/
```

### What it handles

| Liquid | JSX output |
|--------|-----------|
| `{{ product.title }}` | `{product.title}` |
| `{{ price \| money }}` | `{formatPHP(price)}` |
| `{% if customer %}` | `{customer && (...)}` |
| `{% for p in collection.products %}` | `{products.map((p, p_i) => (...))}` |
| `{% render 'product-card', product: p %}` | `<ProductCard product={p} />` |
| `class=` | `className=` |
| `{{ 'file.css' \| asset_url }}` | `/assets/file.css` |

### Shopify → DaVinciOS object mapping

| Shopify | DaVinciOS |
|---------|----------|
| `product.title` | `product.title` |
| `product.description` | `renderLexical(product.description)` |
| `product.price` | `formatPHP(product.price)` |
| `product.url` | `` `/products/${product.slug}` `` |
| `collection.title` | `category.title` |
| `collection.products` | `products` |
| `linklists.main-menu.links` | `navigation.main` |
| `shop.name` | `siteConfig.name` |
| `customer` | `user` |

## Brand Identity

Extracted from `settings_data.json` (Debut theme):

- **Heading font**: Crimson Text (serif, 400) — Google Fonts
- **Body font**: Cardo (serif, 400) — Google Fonts
- **Header**: `#3a3a3a` bg / `#ffffff` text
- **Body**: `#ffffff` bg / `#3a3a3a` text
- **Borders**: `#ebebeb`
- **Footer**: `#f6f6f6` bg / `#333232` text
- **Button**: `#3a3a3a` bg / `#ffffff` text

## Navigation (10 main items)

Home → Quick Delivery (7 sub) → Wall Panels (3 sub) → Lighting | Ceiling Fan
(6 sub) → Furniture (13 sub) → Rugs → Stone Options (2 sub) → Finish Materials
(5 sub) → Designer Club → Design Trends

## Pages Imported (13)

wall-panels, how-to-order, contact-us, designerclub, 3d-showroom, homeu-app,
privacy-policy, modern-furniture-specialist, furnituremanila, careers,
faqs-commonly-asked-question, hotel-furniture-supplier-philippines, inquiries

## Re-running

The migration scripts are **idempotent** — run any time to sync changes:

```bash
# Re-run full theme migration
DATABASE_URI="..." node tools/shopify-import/migrate-theme.mjs

# Dry-run first
DATABASE_URI="..." node tools/shopify-import/migrate-theme.mjs --dry-run
```

## Status (2026-06-17)

- ✅ Theme CSS copied (184KB, Debut v17.12.1)
- ✅ Fonts applied (Crimson Text + Cardo via Google Fonts)
- ✅ Navigation imported (10 main + 13 footer items, full dropdowns)
- ✅ Pages imported (13 pages)
- ✅ SiteHeader + SiteFooter components built
- ✅ Dynamic `/pages/[handle]` route
- ✅ Liquid→JSX transpiler ready for future templates
- ⬜ Logo fetched to DO Spaces (Shopify CDN URL used directly for now)
- ⬜ Homepage hero/sections converted
- ⬜ Category filter on products page wired to navigation
