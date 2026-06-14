# HomeU Shopify → Self-Hosted Migration Plan

## Overview

Migrate **www.homeu.ph** (Shopify) to self-hosted VPS (Payload CMS + Next.js).
~661 products, 30+ collections, custom swatches, made-to-order model.

## Architecture

```
Internet → DNS (store.homeu.ph / admin.homeu.ph)
              ↓
         VPS Nginx (port 80/443) ← SSL via Let's Encrypt
              ↓
    ┌─────────┴─────────┐
    │                   │
  Next.js            Payload CMS
  (storefront)        (admin)
    │                   │
    └─────────┬─────────┘
              ↓
         PostgreSQL
         (products, categories, pages, media, RFQ requests)
```

## Migration Phases

### Phase 0: Preparation ⬅️ (Current)
- [x] Project scaffold set up
- [x] GitHub repository created (jpgyap-sudo/homeu-commerce)
- [x] VPS Docker deployment running
- [x] SSL certificates installed
- [x] Reverse engineer agent/skill created

### Phase 1: Data Extraction
- [ ] Run reverse engineer agent on www.homeu.ph
- [ ] Crawl all 661 products via Shopify JSON API
- [ ] Extract all collections, pages, blogs
- [ ] Download all product images
- [ ] Extract SEO metadata per page
- [ ] Document current navigation structure
- [ ] Extract theme colors, fonts, layout

### Phase 2: Payload CMS Setup
- [ ] Verify Payload admin panel at https://admin.homeu.ph/admin
- [ ] Create first admin user
- [ ] Configure Payload CORS/CSRF for store.homeu.ph
- [ ] Test database connection
- [ ] Run import validation script

### Phase 3: Data Import
- [ ] Create Categories (from Shopify collections)
- [ ] Upload Media (product images)
- [ ] Create Products (link to categories + media)
- [ ] Create Pages (About, FAQ, Contact, Designer Club, etc.)
- [ ] Import Blog articles
- [ ] Verify data counts match Shopify

### Phase 4: Frontend Development
- [ ] Clone Shopify visual theme (colors, fonts, layout)
- [ ] Build Header with mega menu navigation
- [ ] Build Footer
- [ ] Build Homepage (hero, featured products, categories)
- [ ] Build Collection/Product listing pages
- [ ] Build Product detail pages
- [ ] Build RFQ Quote Cart
- [ ] Build About, FAQ, Contact pages
- [ ] Build Designer Club page
- [ ] Build Blog pages
- [ ] Build Mobile responsive layout

### Phase 5: SEO & Launch
- [ ] Configure 301 redirects for changed URLs
- [ ] Apply preserved SEO metadata
- [ ] Submit sitemap to Google Search Console
- [ ] Test all pages for visual consistency
- [ ] Test checkout/RFQ flow
- [ ] DN: store.homeu.ph → VPS (already pointed)
- [ ] Cut over: update store.homeu.ph to serve new site
- [ ] Monitor error logs
- [ ] Decommission Shopify after verification

## URL Structure

| Content | Shopify | New Site |
|---------|---------|----------|
| Home | `/` | `/` |
| Products | `/products/{handle}` | `/products/{handle}` (preserved) |
| Collections | `/collections/{handle}` | `/collections/{handle}` (preserved) |
| Pages | `/pages/{handle}` | `/pages/{handle}` (preserved) |
| Blog | `/blogs/{handle}` | `/blog/{handle}` |
| Blog Articles | `/blogs/{handle}/{slug}` | `/blog/{handle}/{slug}` |

## Data Volume Estimates

| Item | Count | Notes |
|------|-------|-------|
| Products | ~661 | Across 21 pages |
| Collections | ~35 | Including sub-collections |
| Product Images | ~2,000-3,000 | Average 3-5 per product |
| Static Pages | ~15 | About, FAQ, Contact, etc. |
| Blog Articles | ~50-100 | Design Trends, Moodboards |
| Navigation Items | ~30 | Multi-level mega menu |

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| SEO ranking loss | High | Preserve URLs, 301 redirects, preserve metadata |
| Data loss | High | Validate counts, backup Shopify data |
| Visual inconsistency | Medium | Screenshot comparison, theme analysis |
| Broken images | Medium | Verify all image URLs work post-migration |
| Performance degradation | Medium | Docker on 4vCPU/16GB VPS, optimize images |

## Rollback Plan

1. Keep Shopify site active (do not cancel subscription)
2. Keep DNS pointed to Shopify until new site is validated
3. If issues: revert DNS, fix, redeploy
4. After 2 weeks of successful operation: decommission Shopify
