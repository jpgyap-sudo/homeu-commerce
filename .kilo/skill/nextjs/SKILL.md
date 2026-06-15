# Next.js Skill — HomeU Commerce

Resources, patterns, and architecture for the Next.js 16 + DaVinciOS CMS 3.x application at [`apps/website/`](apps/website/).

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js | 16.2.9 |
| CMS / Backend | DaVinciOS | 3.85.1 |
| Database | PostgreSQL (via DaVinciOS) | 16 |
| Rich Text | Lexical Editor | (DaVinciOS plugin) |
| Database ORM | Drizzle ORM | (via DaVinciOS) |
| Image optimization | Sharp | 0.35.1 |
| Runtime | Node.js | 20 (Alpine in Docker) |
| Language | TypeScript | 6.0.3 |
| UI Library | React | 19.2.7 |

## Project Structure

```
apps/website/
├── next.config.mjs          # Next.js + DaVinciOS config
├── package.json             # Dependencies
├── tsconfig.json            # TypeScript config
├── public/                  # Static assets
│   ├── robots.txt
│   └── .gitkeep
└── src/
    ├── DaVinciOS.config.ts    # DaVinciOS CMS config (collections, DB, admin)
    ├── app/
    │   ├── globals.css      # Global styles
    │   ├── layout.tsx       # Root layout
    │   ├── page.tsx         # Homepage
    │   └── (DaVinciOS)/       # DaVinciOS admin routes (internal)
    │       ├── layout.tsx
    │       ├── admin/       # Admin panel UI
    │       └── api/         # DaVinciOS REST & GraphQL API endpoints
    ├── collections/         # DaVinciOS collection schemas
    │   ├── Products.ts
    │   ├── Categories.ts
    │   ├── Pages.ts
    │   ├── Media.ts
    │   └── RFQRequests.ts
    └── components/          # React components
        └── QuoteCart.tsx
```

## Key Config Files

| File | Purpose |
|------|---------|
| [`daVinciOS.config.ts`](apps/website/src/daVinciOS.config.ts) | CMS config: collections, DB connection, CORS, CSRF, cookie settings |
| [`next.config.mjs`](apps/website/next.config.mjs) | Next.js config: standalone output, image remote patterns, DaVinciOS integration |
| [`Dockerfile`](Dockerfile) | Multi-stage production build (Node 20 Alpine) |
| [`docker-compose.yml`](docker-compose.yml) | PostgreSQL + website containers |
| [`.env.example`](.env.example) | Environment variables template |

## Environment Variables

```bash
# Required
DAVINCIOS_SECRET=         # openssl rand -base64 48 (min 32 chars)
DATABASE_URI=             # postgres://user:password@host:5432/homeu

# URLs
DAVINCIOS_PUBLIC_SERVER_URL=  # https://admin.homeu.ph
NEXT_PUBLIC_SITE_URL=       # https://store.homeu.ph
NEXT_PUBLIC_SITE_NAME=      # HomeU

# Optional
DAVINCIOS_TELEMETRY_DISABLED= # true
```

## App Router Patterns

### Server Component — Fetching from DaVinciOS

```typescript
// app/products/page.tsx
async function getProducts() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/products`, {
    next: { revalidate: 60 }, // ISR every 60s
  })
  if (!res.ok) throw new Error('Failed to fetch products')
  return res.json()
}

export default async function ProductsPage() {
  const { docs: products } = await getProducts()
  return (
    <div className="product-grid">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  )
}
```

### Dynamic Route — Product Detail

```typescript
// app/products/[slug]/page.tsx
export async function generateStaticParams() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/products`)
  const { docs } = await res.json()
  return docs.map((product) => ({ slug: product.slug }))
}

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_SITE_URL}/api/products?where[slug][equals]=${params.slug}`
  )
  const { docs } = await res.json()
  const product = docs[0]
  // Render product detail...
}
```

### Client Component — RFQ Cart

```typescript
'use client'
// Using the QuoteCart utilities
import { addToQuoteCart, getQuoteCart } from '@/components/QuoteCart'

export function AddToQuoteButton({ product }: { product: any }) {
  const handleAdd = () => {
    addToQuoteCart({
      productId: product.id,
      title: product.title,
      sku: product.sku,
      price: product.price,
      quantity: 1,
    })
    alert('Added to quote cart!')
  }
  return <button onClick={handleAdd}>Add to Quote</button>
}
```

## DaVinciOS REST API Endpoints

> All available at `DAVINCIOS_PUBLIC_SERVER_URL/api/{collection}`

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/products` | GET | List products (with pagination) |
| `/api/products/:id` | GET | Single product |
| `/api/products` | POST | Create product (admin) |
| `/api/categories` | GET | List categories |
| `/api/categories/:id` | GET | Single category |
| `/api/pages` | GET | List pages |
| `/api/rfq-requests` | POST | Submit RFQ (public) |
| `/api/rfq-requests` | GET | List RFQs (admin) |
| `/api/media` | GET | List media |
| `/api/graphql` | POST | GraphQL endpoint |

### Query Filtering Examples

```typescript
// Filter by category
`/api/products?where[category][equals]=${categoryId}`

// Search by title
`/api/products?where[title][contains]=${searchTerm}`

// Sort by price
`/api/products?sort=price`

// Pagination
`/api/products?page=1&limit=20`

// Deep populate
`/api/products?depth=2`
```

## DaVinciOS Admin Panel

- **URL:** `admin.homeu.ph/admin` (or `http://localhost:3000/admin` locally)
- **Collections managed:** Products, Categories, Pages, Media, RFQ Requests
- **RFQ workflow:** New → Contacted → Quoted → Closed/Lost

## Build & Deploy

### Local Development
```bash
# Start PostgreSQL (Docker)
docker compose up -d postgres

# Set up .env (copy from .env.example, fill in values)

# Install & run
cd apps/website
npm install
npm run dev
# → http://localhost:3000
```

### Production Build
```bash
# Docker build
docker compose build

# Or from project root
docker build -f docker/build.Dockerfile -t homeu-build .
```

## Resources

### Documentation
- [Next.js 16 Docs](https://nextjs.org/docs)
- [DaVinciOS CMS 3 Docs](https://DaVinciOScms.com/docs)
- [DaVinciOS REST API](https://DaVinciOScms.com/docs/rest-api/overview)
- [DaVinciOS GraphQL API](https://DaVinciOScms.com/docs/graphql/overview)
- [Drizzle ORM](https://orm.drizzle.team/docs/overview)

### Project Docs
| Resource | File |
|----------|------|
| Architecture | [`docs/architecture.md`](docs/architecture.md) |
| Migration Plan | [`docs/migration-plan.md`](docs/migration-plan.md) |
| Status Matrix | [`docs/STATUS.md`](docs/STATUS.md) |
| SEO Rules | [`docs/seo-rules.md`](docs/seo-rules.md) |
| Workflow Diagram | [`docs/WORKFLOW_DIAGRAM.md`](docs/WORKFLOW_DIAGRAM.md) |

### Existing Agent Instructions
| Agent | File |
|-------|------|
| Frontend Builder Agent | [`agents/frontend-builder-agent.md`](agents/frontend-builder-agent.md) |
| Planner Agent | [`agents/planner-agent.md`](agents/planner-agent.md) |
| QA Agent | [`agents/qa-agent.md`](agents/qa-agent.md) |
| SEO Agent | [`agents/seo-agent.md`](agents/seo-agent.md) |

### Tools
| Tool | Path |
|------|------|
| Shopify MCP (data export) | [`tools/shopify-mcp/`](tools/shopify-mcp/) |
| Shopify Import | [`tools/shopify-import/`](tools/shopify-import/) |
| Playwright Scanner | [`tools/playwright-scanner/`](tools/playwright-scanner/) |
| Deployer Agent | [`tools/deployer-agent/`](tools/deployer-agent/) |
| SEO Audit | [`tools/seo-audit/`](tools/seo-audit/) |

### Scanned Shopify Data (Reference)
| Data | File |
|------|------|
| SEO Metadata | [`tools/playwright-scanner/output/data/seo-metadata.json`](tools/playwright-scanner/output/data/seo-metadata.json) |
| Collections | [`tools/playwright-scanner/output/data/collections.json`](tools/playwright-scanner/output/data/collections.json) |
| Page Structure | [`tools/playwright-scanner/output/data/all-pages.json`](tools/playwright-scanner/output/data/all-pages.json) |
| Raw HTML | [`tools/playwright-scanner/output/raw/www.homeu.ph.html`](tools/playwright-scanner/output/raw/www.homeu.ph_.html) |
