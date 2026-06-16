# HomeU Commerce — Configuration

## Overview

HomeU Commerce uses a custom Next.js 16 backend with direct PostgreSQL integration. Configuration is handled through environment variables and a few key config files — no CMS framework config file.

## Configuration Files

| File | Purpose |
|------|---------|
| `apps/website/next.config.mjs` | Next.js config: standalone output, image remote patterns |
| `apps/website/tsconfig.json` | TypeScript config |
| `docker-compose.yml` | PostgreSQL + website containers |
| `Dockerfile` | Multi-stage production build |
| `.env.example` | Environment variables template |

## Environment Variables

### Required

| Variable | Description |
|----------|-------------|
| `DATABASE_URI` | PostgreSQL connection string (`postgres://user:pass@host:5432/db`) |
| `JWT_SECRET` | Secret key for JWT admin authentication |
| `DAVINCIOS_SECRET` | Secret key for CMS operations |
| `DAVINCIOS_PUBLIC_SERVER_URL` | Public URL of the admin instance |
| `NEXT_PUBLIC_SITE_URL` | Public URL of the storefront |

### Optional

| Variable | Description |
|----------|-------------|
| `AI_PROVIDER` | Chatbot AI provider: `gemini`, `openai`, or `ollama` |
| `GEMINI_API_KEY` | Google Gemini API key |
| `OPENAI_API_KEY` | OpenAI API key |
| `OLLAMA_BASE_URL` | Ollama server URL (default: `http://localhost:11434`) |
| `TELEGRAM_BOT_TOKEN` | Telegram bot token for sales alerts |
| `TELEGRAM_GROUP_CHAT_ID` | Telegram group chat ID for alerts |
| `DO_SPACES_REGION` | DigitalOcean Spaces region (e.g., `sgp1`) |
| `DO_SPACES_BUCKET` | Spaces bucket name |
| `DO_SPACES_CDN_ENDPOINT` | CDN endpoint for uploaded media |
| `DO_SPACES_KEY` | Spaces access key |
| `DO_SPACES_SECRET` | Spaces secret key |
| `S3_ENDPOINT` | S3-compatible endpoint for chat uploads |
| `S3_BUCKET` | S3 bucket for chat uploads |
| `SALES_VIBER_NUMBER` | Sales team Viber number |
| `SALES_EMAIL` | Sales team email |

## Database

All data is stored in PostgreSQL. The schema is defined in `homeu-schema.sql`. Key tables:

- `customers` — Admin and customer accounts (bcrypt password hashing)
- `products` — Product catalog with pricing and SEO metadata
- `categories` — Category taxonomy
- `media` — Uploaded assets (DigitalOcean Spaces URLs)
- `pages` — Content pages
- `redirects` — URL redirects
- `rfq_requests` — Quote requests
- `quotations` — Formal quotes
- Chat tables: `chat_visitors`, `chat_leads`, `chat_messages`, `chat_ledger`

## API Architecture

All API routes are custom Next.js route handlers in `apps/website/src/app/api/`. Database access goes through `@/lib/db` (the `pg` package). Admin authentication uses JWT tokens via `@/lib/auth` (the `jose` package).

## Verification

```bash
cd apps/website
npm exec tsc -- --noEmit   # Type check
npm run build              # Production build
npm run dev                # Development server
```
