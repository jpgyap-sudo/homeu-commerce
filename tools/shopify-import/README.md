# Shopify Import Tool

Converts Shopify export data into Payload CMS compatible format.

## Directory Structure

```
shopify-import/
├── import-payload.mjs     # Payload CMS import script
├── output/                # Generated migration data
│   ├── raw/               # Raw Shopify data (JSON pages)
│   ├── payload-products.json
│   ├── payload-categories.json
│   ├── payload-pages.json
│   ├── payload-media.json
│   ├── navigation.json
│   ├── seo-metadata.csv
│   ├── 301-redirect-map.csv
│   ├── reviews.json
│   └── images-manifest.json
└── README.md
```

## Import Order

1. **Categories** - Create collection/category entries first
2. **Media** - Upload product images
3. **Products** - Create products (reference categories + media)
4. **Pages** - Create static pages
5. **Navigation** - Configure menu structure
6. **SEO** - Apply metadata
7. **URL Redirects** - Configure 301 redirects in nginx

## Quick Start

```bash
# 1. Run reverse engineer to extract data
# 2. Validate data
node tools/shopify-import/import-payload.mjs

# 3. Import into Payload CMS via admin panel or REST API
```

## Payload Endpoints

| Resource | Method | URL |
|----------|--------|-----|
| Categories | POST | `/api/categories` |
| Products | POST | `/api/products` |
| Media | POST | `/api/media` |
| Pages | POST | `/api/pages` |
