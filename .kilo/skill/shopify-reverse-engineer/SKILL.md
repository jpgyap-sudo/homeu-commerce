# Shopify Reverse Engineer Skill

Reverse engineer the live HomeU Shopify store at **www.homeu.ph** and generate complete migration data for the Payload CMS + Next.js storefront.

## Site Profile

| Property | Value |
|----------|-------|
| Live site | https://www.homeu.ph |
| Shopify store | homeu.ph (myshopify domain unknown) |
| Store ID | 0559/7377/3476 |
| Total products | ~661 (across 21 pages) |
| Collections | 30+ categories |
| Navigation | Multi-level mega menu |
| Reviews | Judge.me integration |
| Tracking | Facebook Pixel (IDs: 722065817172199, 1353745891687218) |
| Payment | PayPal only |
| Languages | English, Korean, Italian |
| Images | Shopify CDN (cdn.shopify.com) |
| Pages | About, FAQ, Contact, Designer Club, 3D Showroom, Careers, Order Instructions, Moodboard, Reviews |
| Blog | Design Trends |
| Special | 3D Model downloads, Custom swatches, Made-to-order |
| Social | Facebook, Pinterest, Instagram, YouTube |

## Phase 1: Discovery & Crawl

### 1A. Fetch Shopify Products JSON
Shopify exposes product data via `/collections/all/products.json` with pagination:
```
GET https://www.homeu.ph/collections/all/products.json?page=1&limit=250
GET https://www.homeu.ph/collections/all/products.json?page=2&limit=250
...up to page 21 for 661 products
```

For each page, save the raw JSON to `tools/shopify-import/output/raw/products-page-{N}.json`

### 1B. Fetch All Collection Pages
Identify every collection URL from the navigation:
```
https://www.homeu.ph/collections/sofa
https://www.homeu.ph/collections/armchair
https://www.homeu.ph/collections/center-table
https://www.homeu.ph/collections/dining-table
https://www.homeu.ph/collections/dining-chair
https://www.homeu.ph/collections/side-table
https://www.homeu.ph/collections/sideboard
https://www.homeu.ph/collections/console-table
https://www.homeu.ph/collections/sofa
https://www.homeu.ph/collections/stools
https://www.homeu.ph/collections/carpet
https://www.homeu.ph/collections/bed
https://www.homeu.ph/collections/lighting-1
https://www.homeu.ph/collections/fan
https://www.homeu.ph/collections/table-lamp
https://www.homeu.ph/collections/pendant-light
https://www.homeu.ph/collections/surface-mounted-light
https://www.homeu.ph/collections/floor-lamp
https://www.homeu.ph/collections/wall-light
https://www.homeu.ph/collections/decor
https://www.homeu.ph/collections/nightstand-tvcabinet
https://www.homeu.ph/collections/ottoman-pouf
https://www.homeu.ph/collections/bench-chaises
https://www.homeu.ph/collections/seating
https://www.homeu.ph/collections/table
https://www.homeu.ph/collections/lighting-on-stock
https://www.homeu.ph/collections/furniture-onsticj
https://www.homeu.ph/collections/stone-onstock
https://www.homeu.ph/collections/decor-onstock
https://www.homeu.ph/collections/ceiling-fan-onstock
https://www.homeu.ph/collections/panel-onstock
https://www.homeu.ph/collections/wpc-wall-panel-grille-series
https://www.homeu.ph/collections/sintered-stone
https://www.homeu.ph/collections/natural-stone
https://www.homeu.ph/collections/fabric-swatches-linen
https://www.homeu.ph/collections/fabric-swatches-velvet
https://www.homeu.ph/collections/swatches-tech-cloth
https://www.homeu.ph/collections/fabric-swatches-leather
https://www.homeu.ph/collections/fabric-swatches-leatherette
https://www.homeu.ph/collections/feature
```

Also fetch their `products.json` to map which products belong to which collection.

### 1C. Fetch All Static Pages
```
https://www.homeu.ph/pages/designerclub
https://www.homeu.ph/pages/modern-furniture-specialist (About)
https://www.homeu.ph/pages/contact-us
https://www.homeu.ph/pages/faqs-commonly-asked-question
https://www.homeu.ph/pages/furnituremanila (Reviews)
https://www.homeu.ph/pages/careers
https://www.homeu.ph/pages/how-to-order
https://www.homeu.ph/pages/3d-showroom
https://www.homeu.ph/pages/interior-design-moodboards (Moodboard blog)
```

Save rendered HTML to `tools/shopify-import/output/raw/pages/`

### 1D. Fetch Blog Articles
```
https://www.homeu.ph/blogs/design-trends
https://www.homeu.ph/blogs/interior-design-moodboards
https://www.homeu.ph/blogs/news
```

Fetch each blog with `/blogs/{handle}.json` if available.

### 1E. Extract Navigation Structure
Parse the mega menu HTML structure from any page:
- Top-level categories with their sub-items
- Quick Delivery collection
- All parent-child relationships

Save to `tools/shopify-import/output/navigation.json`

## Phase 2: Data Extraction

### 2A. Product Extraction
From each product JSON entry + product page HTML, extract:

```json
{
  "shopifyId": 123456789,
  "title": "Aalto │ Modern Sofa",
  "handle": "aalto-modern-sofa",
  "sku": "",
  "price": null,
  "compareAtPrice": null,
  "descriptionHtml": "...",
  "body": "plain text description",
  "category": "sofa",
  "type": "Furniture",
  "vendor": "HOMEU.PH",
  "tags": ["4-seater", "sofa", "modern", ...],
  "images": [
    "https://cdn.shopify.com/.../image1.png",
    "https://cdn.shopify.com/.../image2.png"
  ],
  "variants": [
    {
      "id": 987654321,
      "title": "Default Title",
      "sku": "",
      "price": null,
      "available": true
    }
  ],
  "seoTitle": "Aalto │ Modern Sofa",
  "seoDescription": "...",
  "metafields": {
    "dimensions": "3030mm x 1050mm x H580mm",
    "materials": "Fabric + Leatherette",
    "capacity": "4-seater"
  },
  "shopifyUrl": "https://www.homeu.ph/products/aalto-modern-sofa",
  "collections": ["sofa", "feature"]
}
```

### 2B. SEO Data Extraction
For every URL collected:
- `<title>` tag
- `<meta name="description">`
- `<link rel="canonical">`
- Open Graph tags (`og:title`, `og:description`, `og:image`)
- JSON-LD structured data (Product schema, Organization schema, BreadcrumbList)
- Save to `tools/shopify-import/output/seo-metadata.csv`

### 2C. Image Discovery
For each product:
- Extract all image URLs from Shopify CDN
- Note the image alt text
- Categorize by product handle
- Save image manifest to `tools/shopify-import/output/images-manifest.json`

### 2D. Review Extraction
Judge.me reviews appear on product pages. Extract:
- Review count
- Review rating
- Individual review text where available
- Save to `tools/shopify-import/output/reviews.json`

## Phase 3: Data Mapping

### 3A. Shopify → Payload CMS Mapping

| Shopify Field | Payload Collection | Payload Field |
|--------------|-------------------|---------------|
| product.title | Products | title |
| product.handle | Products | slug |
| product.id | Products | shopifyId |
| product.sku | Products | sku |
| product.variants[0].price | Products | price |
| product.compare_at_price | Products | salePrice |
| product.body_html | Products | description |
| product.images | Products | images (relation to Media) |
| product.type | Products | - (derived from collections) |
| product.tags | Products | tags (if added) |
| metafields.dimensions | Products | dimensions |
| metafields.materials | Products | materials |
| page_title (SEO) | Products | seoTitle |
| page_description (SEO) | Products | seoDescription |
| collection.title | Categories | title |
| collection.handle | Categories | slug |
| collection.body_html | Categories | description |
| collection.image | Categories | image |
| page.title | Pages | title |
| page.handle | Pages | slug |
| page.content | Pages | content |

### 3B. URL Mapping for 301 Redirects
Create a mapping of old Shopify URLs to new URLs:
```
Shopify URL → New URL
/products/aalto-modern-sofa → /products/aalto-modern-sofa
/collections/sofa → /collections/sofa
/blogs/design-trends → /blog/design-trends
```

If URL structure changes, generate `tools/shopify-import/output/301-redirect-map.csv`:
```
old_url,new_url,type,status
/products/aalto-modern-sofa,/products/aalto-modern-sofa,product,preserved
```

### 3C. Navigation Structure Mapping
Convert Shopify's Liquid mega menu to Payload CMS navigation config.
Map the multi-level structure to Next.js navigation component props.

## Phase 4: Generation & Import

### 4A. Generate Payload CMS Import Scripts
Create Node.js import script at `tools/shopify-import/import-payload.mjs` that:

1. Connects to Payload CMS API
2. Creates Media entries (upload images)
3. Creates Categories (from collections)
4. Creates Products (with relations to Media and Categories)
5. Creates Pages (from Shopify pages)
6. Creates RFQRequests placeholder (no data to migrate)

### 4B. Generate Import Data Files
Save structured JSON at `tools/shopify-import/output/`:
- `payload-products.json` - Ready for Payload CMS import
- `payload-categories.json` - Ready for Payload CMS import
- `payload-pages.json` - Ready for Payload CMS import
- `payload-media.json` - Image URLs and metadata
- `navigation.json` - Navigation structure
- `301-redirect-map.csv` - URL redirect map

### 4C. Image Download Script
Create `tools/shopify-import/download-images.sh` that:
- Reads `images-manifest.json`
- Downloads all product images using curl/wget
- Organizes into `/opt/homeu-commerce/uploads/` directory
- Creates Payload Media import entries

## Phase 5: Theme Analysis

### 5A. Visual Analysis
Visit the live site and document:
- Color scheme (primary, secondary, accent)
- Typography (fonts, sizes)
- Layout patterns (grid, product cards, header)
- Hero section design
- Product page layout
- Collection page layout
- Footer structure
- Mobile responsive behavior

### 5B. Component Mapping
Map Shopify Liquid sections to Next.js components:
```
Liquid Section                    → Next.js Component
header.liquid                     → components/Header.tsx
footer.liquid                     → components/Footer.tsx
product-grid.liquid               → components/ProductGrid.tsx
product-card.liquid               → components/ProductCard.tsx
product-template.liquid           → components/ProductDetail.tsx
collection-template.liquid        → components/CollectionPage.tsx
slideshow.liquid                  → components/HeroSlider.tsx
featured-collection.liquid        → components/FeaturedCollection.tsx
newsletter.liquid                 → components/Newsletter.tsx
```

Save to `tools/theme-analyzer/component-map.md`

### 5C. CSS/Color Extraction
Document CSS custom properties, color values, font stacks used on the live site.
Save to `tools/theme-analyzer/theme-data.json`

## Output Directory Structure

```
tools/shopify-import/output/
├── raw/
│   ├── products-page-1.json
│   ├── products-page-2.json
│   ├── ...
│   ├── collections/
│   └── pages/
├── payload-products.json
├── payload-categories.json
├── payload-pages.json
├── payload-media.json
├── navigation.json
├── seo-metadata.csv
├── 301-redirect-map.csv
├── reviews.json
└── images-manifest.json

tools/theme-analyzer/
├── component-map.md
├── theme-data.json
└── visual-screenshots/  (if capturing)

tools/crawler/
├── sitemap.txt
├── all-urls.txt
└── crawl-report.json
```

## Execution Order

1. Load this skill
2. Execute Phase 1 (Discovery) - fetch all JSON endpoints first, then HTML pages
3. Execute Phase 2 (Extraction) - parse and extract structured data
4. Execute Phase 3 (Mapping) - map to Payload schema
5. Execute Phase 4 (Generation) - create import scripts and data files
6. Execute Phase 5 (Theme) - document visual design for cloning
7. Run validation: count products, check for missing data, verify image URLs

## Commands

```bash
# Fetch all products via Shopify JSON API
curl "https://www.homeu.ph/collections/all/products.json?page=1&limit=250"

# Fetch a collection's products
curl "https://www.homeu.ph/collections/sofa/products.json?limit=250"

# View page source for SEO
curl -s "https://www.homeu.ph/products/aalto-modern-sofa" | grep -E '<title|<meta|<link rel="canonical"'

# Check Shopify version/info
curl -sI "https://www.homeu.ph" | grep -i "x-shopify"
```

## Validation Checklist

- [ ] All 661+ products extracted
- [ ] All product images collected
- [ ] All categories/collections mapped
- [ ] SEO titles and descriptions preserved
- [ ] URL structure documented
- [ ] Navigation hierarchy preserved
- [ ] All pages content extracted
- [ ] Blog articles extracted
- [ ] 301 redirect map complete
- [ ] Theme colors and fonts documented
- [ ] Import scripts tested against Payload schema
