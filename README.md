# HomeU Commerce

A custom e-commerce platform for HomeU furniture — built on Next.js 16 with direct PostgreSQL integration, JWT-based admin authentication, and an AI-powered concierge chatbot.

## Git Workflow

The canonical repository is hosted on **GitHub** (`origin`). Multiple developers work on this project across different laptops — always treat GitHub as the single source of truth.

**Before making any changes:**
```bash
git pull origin master   # or your current branch
```

**Before committing:**
```bash
git pull origin master   # rebase on latest to avoid conflicts
git add <files>
git commit -m "description"
git push origin master
```

If you have uncommitted work that conflicts with upstream, `git stash`, pull, then `git stash pop` and resolve conflicts locally. Never force-push to `master`.

## Stack

- **Frontend:** Next.js 16 (App Router), React 19, CSS Modules
- **Backend:** Next.js API routes with PostgreSQL (`pg` package)
- **Auth:** JWT-based admin/customer authentication via `jose`, bcrypt password hashing
- **AI Chatbot:** Google Gemini / OpenAI / Ollama-powered concierge
- **Media:** DigitalOcean Spaces (S3-compatible) CDN
- **Deploy:** Docker Compose (PostgreSQL + website container)

## Key Features

- **Product catalog** — Furniture products with pricing, inventory, categories, and SEO metadata
- **RFQ workflow** — Customers submit quote requests; staff convert to formal quotations
- **Admin panel** — Custom admin at `/admin/` for managing products, categories, customers, RFQs, quotations, media, pages, and redirects
- **Concierge chatbot** — AI-powered chat widget for product discovery, RFQ submission, lead capture, and appointment scheduling
- **Customer portal** — Registered customers track RFQ/quote status at `/customer/dashboard`

## Project Structure

```
apps/website/
  src/
    app/
      admin/          — Admin panel pages (dashboard, products, categories, etc.)
      api/            — REST API routes
      products/       — Customer-facing product pages
      customer/       — Customer dashboard
    collections/       — Collection type definitions
    globals/           — Global config definitions
    lib/
      db.ts           — PostgreSQL query helpers
      auth.ts         — JWT authentication
      chatbot/         — AI chatbot services
    types/
      davincios.d.ts   — Stub type definitions
  package.json
  next.config.mjs
  tsconfig.json

docker-compose.yml      — PostgreSQL + website
Dockerfile              — Multi-stage production build
```

## Quick Start

```bash
# Clone and install
cd apps/website
npm install

# Configure environment
cp ../../.env.example .env
# Edit .env with your DATABASE_URI, JWT_SECRET, etc.

# Start PostgreSQL (Docker)
docker-compose up -d postgres

# Apply schema
psql $DATABASE_URI < homeu-schema.sql

# Run dev server
npm run dev
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URI` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes | JWT signing secret for admin auth |
| `DAVINCIOS_SECRET` | Yes | CMS secret key |
| `DAVINCIOS_PUBLIC_SERVER_URL` | Yes | Public admin URL |
| `NEXT_PUBLIC_SITE_URL` | Yes | Public storefront URL |
| `AI_PROVIDER` | No | Chatbot AI: `gemini`, `openai`, or `ollama` |

## Verification

```bash
cd apps/website
npm exec tsc -- --noEmit   # TypeScript check
npm run build              # Production build
npm run dev                # Development server → http://localhost:3000
```
