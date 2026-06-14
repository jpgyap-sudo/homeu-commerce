# URL Mapper

Generates 301 redirect maps from old Shopify URLs to new site URLs.

## Purpose

When migrating from Shopify to self-hosted, preserve SEO equity by:
1. Keeping identical URLs where possible
2. Creating 301 redirects for changed URLs
3. Maintaining canonical URL structure

## Shopify URL Patterns

| Pattern | Example |
|---------|---------|
| Product | `/products/aalto-modern-sofa` |
| Collection | `/collections/sofa` |
| Page | `/pages/designerclub` |
| Blog | `/blogs/design-trends` |
| Blog Article | `/blogs/design-trends/article-title` |
| Policy | `/policies/refund-policy` |

## Rules

1. **Preserve slugs**: Keep product and collection handles identical
2. **Preserve hierarchy**: `/products/{handle}` → `/products/{handle}`
3. **Blogs**: `/blogs/{handle}` → `/blog/{handle}`
4. **Policies**: `/policies/{handle}` → `/pages/{handle}`
5. **Homepage**: Keep as `/`

Run the mapper after extracting all Shopify URLs to detect any conflicts.
