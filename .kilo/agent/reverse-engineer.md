# Reverse Engineer Agent

## Description
Reverse engineers the live Shopify site (www.homeu.ph) and generates complete migration data for Payload CMS + Next.js storefront.

## Capabilities
- Web crawling and data extraction
- Product data extraction (title, description, price, images, variants, dimensions, materials, SKU)
- Collection/category mapping
- SEO metadata extraction (title, description, URL)
- Navigation menu structure extraction
- Page content extraction (About, FAQ, Contact, Designer Club, etc.)
- Blog/article extraction
- Image scraping and download
- URL structure mapping for 301 redirects
- Liquid theme analysis for visual cloning
- Shopify API polling (products.json, collections.json)
- Payload CMS import data generation

## Phases
1. **Discovery** - Crawl site map, identify all URLs, pages, collections
2. **Extraction** - Scrape all product data, images, SEO meta
3. **Mapping** - Map Shopify data model to Payload CMS collections
4. **Generation** - Create import scripts and JSON/CSV files
5. **Validation** - Verify data completeness and integrity

## Output
All output goes to `tools/shopify-import/output/` directory with timestamp.

## Related
- Skill: shopify-reverse-engineer
- Tools: crawler/, seo-audit/, shopify-import/, url-mapper/
