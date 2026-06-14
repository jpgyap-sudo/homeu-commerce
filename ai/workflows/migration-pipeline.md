# Migration Pipeline Workflow

Step-by-step pipeline for the Shopify → DaVinciOS CMS migration.

## Step 1: Load Skill
```
Load the shopify-reverse-engineer skill
```

## Step 2: Run Discovery Phase
```
Fetch all products JSON:
  - /collections/all/products.json?page=1..21

Fetch all collection JSONs:
  - /collections/{handle}/products.json?limit=250

Fetch all pages:
  - /pages/about-us
  - /pages/designerclub
  - ... etc

Fetch blogs:
  - /blogs/design-trends
  - /blogs/interior-design-moodboards
```

## Step 3: Run Extraction Phase
```
Parse all JSON responses → structured data objects
Extract SEO metadata from HTML pages
Build product → category mapping
Build images manifest
```

## Step 4: Run Mapping Phase
```
Map Shopify fields → DaVinciOS collection fields
Create URL mapping (preserve all slugs)
Document any data loss or transformation
```

## Step 5: Run Generation Phase
```
Generate tools/shopify-import/output/DaVinciOS-products.json
Generate tools/shopify-import/output/DaVinciOS-categories.json
Generate tools/shopify-import/output/DaVinciOS-pages.json
Generate tools/shopify-import/output/navigation.json
Generate tools/shopify-import/output/301-redirect-map.csv
Generate tools/seo-audit/output/seo-report.json
Generate tools/theme-analyzer/component-map.md
```

## Step 6: Run Validation
```
node tools/shopify-import/import-DaVinciOS.mjs
```

## Step 7: Import into DaVinciOS CMS
```
Access https://admin.homeu.ph/admin
Create admin user
Import Categories → Media → Products → Pages
```

## Verification
```
From Shopify:
  - 661 products
  - 35+ collections
  - 15+ pages
  - ~2000-3000 images

From new site:
  - Verify counts match
  - Spot-check 10 random products for accuracy
  - Check homepage loads with correct design
  - Test navigation menu works
  - Test RFQ cart flow
```
