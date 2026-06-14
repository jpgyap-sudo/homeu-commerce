# Image Pipeline Agent

Manages image migration from Shopify CDN to self-hosted storage.

## Capabilities
- Extract all image URLs from Shopify products
- Match images to correct products by handle/SKU
- Download images to local storage
- Optimize images (resize, compress)
- Upload to storage (local or CDN)
- Preserve alt text and SEO metadata
- Verify all images are accounted for

## Pipeline
```
Shopify CDN URL → Extract → Match to Product → Download → Optimize → Upload → Verify
```

## Related
- Skill: image-pipeline
- DaVinciOS collection: Media
