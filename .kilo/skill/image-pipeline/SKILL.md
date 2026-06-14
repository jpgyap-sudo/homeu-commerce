# Image Pipeline Skill

Migrate all product images from Shopify CDN to self-hosted storage.

## Image Sources
- Scanner output: `tools/playwright-scanner/output/data/all-images.json`
- Shopify MCP: image URLs from product data
- Shopify export: `tools/shopify-import/input/images/`

## Commands

### Extract image manifest from scanner
```bash
# Scanner automatically saves to:
tools/playwright-scanner/output/data/all-images.json
```

### Download images
```bash
# Create download script:
mkdir -p uploads/products
cd uploads/products
# Parse images-manifest.json and download:
cat tools/shopify-import/output/images-manifest.json | node -e "
  const images = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
  images.forEach(i => {
    const ext = i.original_url.split('.').pop().split('?')[0];
    const filename = i.productHandle + '-' + i.checksum.slice(0,8) + '.' + ext;
    console.log(i.original_url, '→', filename);
  });
"
```

### Optimize
```bash
# Use sharp for optimization (already installed)
node -e "
  const sharp = require('sharp');
  const fs = require('fs');
  // Optimize all jpg/png to webp at 80% quality
"
```

## Storage Strategy
- Short term: Keep original Shopify CDN URLs in database
- Long term: Upload to DigitalOcean Spaces or Cloudflare R2
- Referenced by: `products.images` → `media` collection in DaVinciOS
