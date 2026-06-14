# Theme Migration Skill

Convert Shopify Liquid theme to Next.js components.

## Liquid → Next.js Mapping

| Shopify Liquid | Next.js Component | Status |
|----------------|------------------|--------|
| `layout/theme.liquid` | `app/layout.tsx` | ✅ Done |
| `templates/index.liquid` | `app/page.tsx` | ✅ Done |
| `templates/product.liquid` | Needs creation | ⏳ |
| `templates/collection.liquid` | Needs creation | ⏳ |
| `sections/slideshow.liquid` | `components/HeroSlider.tsx` | ⏳ |
| `sections/featured-collection.liquid` | `components/FeaturedCollection.tsx` | ⏳ |
| `snippets/product-card.liquid` | `components/ProductCard.tsx` | ⏳ |
| `snippets/header.liquid` | `components/Header.tsx` | ✅ Partial |
| `snippets/footer.liquid` | `components/Footer.tsx` | ⏳ |

## Theme Assets
```
config/settings_schema.json  → Theme design tokens (colors, fonts)
config/settings_data.json     → Current theme configuration
assets/*.css                  → CSS to port
assets/*.js                   → JS behavior to port
```

## Visual Verification
```bash
# After building a component, compare with original
node tools/playwright-scanner/ollama-vision.mjs verify \
  tools/playwright-scanner/output/screenshots/shopify-product.png \
  screenshots/new-product.png
```
