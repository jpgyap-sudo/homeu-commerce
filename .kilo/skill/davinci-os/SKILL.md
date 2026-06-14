# DaVinciOS (formerly Payload CMS) Skill

## Overview

DaVinciOS is a headless CMS and application framework built on Node.js, Express, and MongoDB. In this project, we have renamed all instances of "Payload" to "DaVinciOS" to align with our branding. This skill provides guidance on working with DaVinciOS in this specific project.

## Project Structure

After renaming, the DaVinciOS-related code is located in:
- `apps/website/src/app/(DaVinciOS)` - The main DaVinciOS admin interface (Next.js)
- `packages/database` - DaVinciOS configuration and collections
- `tools/shopify-mcp/` - Shopify integration with DaVinciOS
- `tools/playwright-scanner/` - AI-enhanced validation crawler
- `tools/url-mapper/` - SEO URL mapping and redirect generation
- `tools/rebrand/` - Rename scripts and change logs

## Installation & Setup

### Prerequisites
- Node.js >= 18
- MongoDB instance (local or cloud)
- Git

### Steps
1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables (copy `.env.example` to `.env` and configure):
   ```env
   # DaVinciOS Configuration
   DAVINCIOS_SECRET=<your-secret-key>
   MONGODB_URI=<your-mongodb-connection-string>
   
   # Shopify Integration
   SHOPIFY_STORE=<your-store-name>
   SHOPIFY_ACCESS_TOKEN=<your-access-token>
   
   # Other services as needed
   ```
4. Initialize the database:
   ```bash
   npm run db:init
   ```
5. Start the development server:
   ```bash
   npm run dev
   ```

## Development Guide

### Working with Collections
DaVinciOS collections are defined in `packages/database/src/collections`. Each collection file exports a DaVinciOS collection configuration.

Example collection structure:
```javascript
// packages/database/src/collections/Products.js
import { CollectionConfig } from 'davincios/types';

export const Products: CollectionConfig = {
  slug: 'products',
  admin: {
    useAsTitle: 'name',
    defaultSort: '-createdAt',
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'description',
      type: 'textarea',
    },
    {
      name: 'price',
      type: 'number',
      required: true,
      min: 0,
    },
    // ... more fields
  ],
};
```

### Customizing the Admin Interface
The DaVinciOS admin is customized in `apps/website/src/app/(DaVinciOS)`. You can modify:
- Layout components in `app/(DaVinciOS)/layout.tsx`
- Individual collection views in `app/(DaVinciOS)/collections/[slug]`
- Custom dashboards and widgets

### Extending with Custom Endpoints
Add custom API routes in `packages/database/src/express` or create new route files in `packages/database/src/routes`.

Example:
```javascript
// packages/database/src/routes/custom.js
import express from 'express';
const router = express.Router();

router.get('/custom-endpoint', async (req, res) => {
  // Your logic here
  res.json({ message: 'Hello from DaVinciOS' });
});

export default router;
```

Then register it in `packages/database/src/davincios.ts`:
```javascript
import customRoutes from './routes/custom';
// ...
export const davincios = build({
  // ...
  express: app => {
    app.use('/api/custom', customRoutes);
  },
});
```

## Shopify Integration

The Shopify MCP (Managed Connection Point) is in `tools/shopify-mcp/`. It handles:
- Product synchronization from Shopify to DaVinciOS
- Inventory updates
- Order webhook processing

Key files:
- `export-all.mjs` - Main export script
- `transformers/` - Data transformation logic
- `webhooks/` - Shopify webhook handlers

To run a full sync:
```bash
node tools/shopify-mcp/export-all.mjs
```

## SEO & URL Mapping

SEO URL mapping and redirect generation is handled by `tools/url-mapper/`. It:
- Maps Shopify URLs to new DaVinciOS URLs
- Generates 301 redirect rules for Netlify/Vercel
- Creates sitemap entries

Configuration is in `tools/url-mapper/config.json`:
```json
{
  "shopify": {
    "productPattern": "/products/:handle",
    "collectionPattern": "/collections/:handle"
  },
  "davincios": {
    "productPattern": "/shop/:handle",
    "collectionPattern": "/category/:handle"
  },
  "redirects": [
    {
      "from": "/old-path",
      "to": "/new-path",
      "status": 301
    }
  ]
}
```

Generate redirects:
```bash
node tools/url-mapper/generate-redirects.mjs
```

## Playwright Scanner with AI Validation

The enhanced crawler in `tools/playwright-scanner/` includes:
- AI-powered content validation using local LLMs
- Broken link detection
- SEO auditing
- Visual regression testing

To run a scan:
```bash
node tools/playwright-scanner/scan.mjs --url https://yoursite.com --ai-validation
```

Configuration is in `tools/playwright-scanner/config.json`.

## Image Optimization Pipeline

Images processed through the Shopify import are optimized via:
- Automatic resizing to multiple widths
- WebP/AVIF conversion
- Lazy loading attributes
- CDN upload (if configured)

See `tools/image-optimizer/` for the pipeline scripts.

## RFQ Cart Enhancements

The Request for Quote cart now includes:
- DaVinciOS-powered product recommendations
- AI-generated quote suggestions
- Integrated inventory checks
- Custom form validation

Enhancements are in `apps/website/src/components/cart/` and `apps/website/src/lib/rfq/`.

## Deployment

### Vercel (Recommended)
1. Push to GitHub
2. Import project in Vercel
3. Set environment variables
4. Vercel will automatically build and deploy

### Docker
```bash
# Build
docker build -t davincios-app .

# Run
docker run -p 3000:3000 \
  -e DAVINCIOS_SECRET=your-secret \
  -e MONGODB_URI=mongodb://mongo:27017/davincios \
  davincios-app
```

### Manual Server
```bash
npm run build
npm start
```

## Maintenance & Troubleshooting

### Common Issues
1. **Database Connection Failures**
   - Check MONGODB_URI in .env
   - Verify MongoDB instance is running
   - Check network/firewall settings

2. **Shopify Sync Errors**
   - Verify SHOPIFY_ACCESS_TOKEN has required scopes
   - Check API rate limits (headers in response)
   - See logs in `tools/shopify-mcp/logs/`

3. **Admin UI Not Loading**
   - Clear browser cache
   - Check for TypeScript compilation errors
   - Verify Next.js dev server is running on port 3000

### Logs
- Application logs: `logs/` directory
- Shopify MCP logs: `tools/shopify-mcp/logs/`
- Playwright scanner logs: `tools/playwright-scanner/logs/`
- Build logs: `.next/logs/`

### Backup & Restore
```bash
# Backup database
mongodump --uri="$MONGODB_URI" --out=./backups/$(date +%Y-%m-%d)

# Restore
mongorestore --uri="$MONGODB_URI" ./backups/2026-06-15/davincios/
```

## Resources
- Official Payload CMS Documentation: https://payloadcms.com/docs
- DaVinciOS API Reference: http://localhost:3000/api/admin (when running)
- Shopify API Documentation: https://shopify.dev/docs/api
- MongoDB Documentation: https://docs.mongodb.com/

## Changelog
See `tools/rebrand/change-log.json` for details of the Payload → DaVinciOS rename operation.

## Contributing
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Ensure all tests pass
5. Submit a pull request

## License
This project is licensed under the MIT License - see the LICENSE file for details.