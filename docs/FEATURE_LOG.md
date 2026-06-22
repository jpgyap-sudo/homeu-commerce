# HomeU Commerce — Feature Log

> **Purpose:** Track features and capabilities implemented in the HomeU system.
> **Canonical gap log:** [`docs/GAP_LOG.md`](docs/GAP_LOG.md) (tracks active issues)
> **Updated:** 2026-06-22

---

## 🛒 Storefront

| Feature | Status | Details |
|---------|--------|---------|
| Product catalog page (`/products`) | ✅ Live | Grid view with search, sort, category filter, pagination, autocomplete |
| Product detail page (`/products/[slug]`) | ✅ Live | Image gallery, specs, badges (New/Sale/3D), QuickRFQ, related products, reviews |
| Category/collection filtering | ✅ Live | Smart collection rules + tag-based + category_id matching |
| Search with autocomplete | ✅ Live | Debounced, suggests matching product titles |
| Product badges (New/Sale/3D) | ✅ Live | Driven by `tags`, `price` vs `sale_price` |
| Product completeness scoring | ✅ Live | Weighted system for images/SEO/price/category/description/dimensions/materials |
| Missing data filters | ✅ Live | `?missing=image,seo,price,category,description,dimensions` |
| Product variants display | ✅ Live | Variants rendered on detail page (size/color/options) |
| Reviews and ratings | ✅ Live | Customer reviews, star ratings on product cards, review submission |
| Featured pieces product picker | ✅ Live | Visual product picker with category tabs, search, multi-select |
| Collection header collage | ✅ Live | Dynamic collage from product images with CSS treatment |
| Smart collection product listing | ✅ Live | Homepage + category page support dynamic rule-based collections |

## 🔐 Customer Portal

| Feature | Status | Details |
|---------|--------|---------|
| Registration | ✅ Live | Email/password, fields validation |
| Login | ✅ Live | Email/password with session cookies |
| Password reset | ✅ Live | Email-delivered reset link via SMTP, token expiry, enumeration prevention |
| Dashboard | ✅ Live | RFQ history, quotation view, profile management |
| Address management | ✅ Live | CRUD for shipping/billing addresses |
| RFQ history | ✅ Live | List and detail views of submitted RFQs |
| Quotation view | ✅ Live | Customer-facing quotation detail with PDF download |

## 🤖 AI Chatbot Concierge

| Feature | Status | Details |
|---------|--------|---------|
| Chat widget | ✅ Live | Floating widget with greeting, quick replies, message history |
| Lead capture | ✅ Live | Persistent lead creation + server-side cart sync |
| Lead lookup | ✅ Live | `GET /api/chat/leads/lookup` with real DB queries |
| Product search | ✅ Live | Direct DB queries with tag/category/materials matching |
| Product recommendations | ✅ Live | AI-powered via POST `/api/products/recommend` |
| Appointment scheduling | ✅ Live | Dynamic categories from DB, calendar picker |
| RFQ submission via chat | ✅ Live | Full RFQ creation without leaving chat |
| Image upload + AI vision | ✅ Live | Upload to local disk, AI analysis for product matching |
| Telegram alerts | ✅ Live | NEW_LEAD, RFQ_SUBMITTED, ESCALATION via configured bot |
| Viber handoff | ✅ Live | Clickable `viber://` link, admin-configurable number |
| Escalation to sales | ✅ Live | SALES_HANDOFF / COMPLAINT intents trigger Telegram + human handoff |
| Widget config endpoint | ✅ Live | `GET /api/chat/widget-config` with DB-first settings |
| Chat history persistence | ✅ Live | Messages stored in `chatbot.messages` table |

## 🛠️ DaVinciOS Admin

| Feature | Status | Details |
|---------|--------|---------|
| Admin dashboard | ✅ Live | Overview of catalog stats, chatbot metrics, lead scoring, recent leads |
| Products CRUD | ✅ Live | List/search/create/edit/delete with full form |
| Categories CRUD | ✅ Live | List/search/create/edit with parent select |
| Customers CRUD | ✅ Live | List/search/create/edit with lead & RFQ history, tags |
| Media library | ✅ Live | Thumbnail grid, upload, edit metadata, delete |
| Pages CRUD | ✅ Live | List/search/create/edit with SEO fields |
| Redirects CRUD | ✅ Live | List/search/create/edit with source/target/type/status |
| Blogs/Articles management | ✅ Live | List/create/edit with tags |
| RFQ management | ✅ Live | List with search/filter/status + detail with Create Quotation action |
| Quotations CRUD | ✅ Live | List/create/edit with PDF download, line items, bank details |
| Admin login with OTP | ✅ Live | Email-delivered OTP, bcrypt hashed, 5-min expiry, 30s resend limit |
| JWT session auth | ✅ Live | 24hr sessions, no fallback secret, min 32-char validation |
| Multi-user admin accounts | ✅ Live | Create/manage admin users with roles |
| Activity log | ✅ Live | Audit trail of admin actions |
| Image Picker field | ✅ Live | `<ImagePickerField>` component for single images |
| Media Picker | ✅ Live | Browse DO Spaces library / Upload / Paste URL — three input modes |
| Rich Text Editor | ✅ Live | TipTap-based `<RichTextEditor>`, HTML output, Image toolbar via MediaPicker |
| Product completeness UI | ✅ Live | `GET /api/products?missing=x` filters, admin UI |

## 🎨 Theme Builder

| Feature | Status | Details |
|---------|--------|---------|
| Theme section registry | ✅ Live | 22 section types with metadata and settings |
| Storefront renderers | ✅ Live | 18 body section types with renderer branches |
| API endpoints | ✅ Live | Section CRUD, reorder, settings schema |
| Preview bridge | ✅ Live | Select, inline text, image, product, insert, reorder message handlers |
| CSS generation | ✅ Live | `theme-styles.ts` generates scoped CSS from settings |
| Slideshow section | ✅ Live | Configurable slides, buttons, mobile image |
| Collection/featured grid | ✅ Live | Configurable columns, aspect ratio, hover, overlay |
| Image with text | ✅ Live | Position, typography, button |
| Image bar | ✅ Live | Columns, hover zoom |
| Testimonials | ✅ Live | Avatar, columns, border, style |
| Stats/counters | ✅ Live | Suffix, columns, animation |
| Blog posts | ✅ Live | Columns, date, category, image sizing |
| Instagram feed | ✅ Live | Responsive columns, gap, profile link |
| Video | ✅ Live | Muted, loop, overlay opacity |
| Lookbook | ✅ Live | Title visibility |
| Promo banner | ✅ Live | Sticky, dismissible |
| Featured Products (curated) | ✅ Live | Visual product picker with category filter and multi-select |
| Header settings | ✅ Live | Logo, navigation, announcement bar |
| Footer sections | ✅ Live | Quick links, social media, newsletter, copyright |
| Palette/color settings | ✅ Live | Admin-editable via settings page |
| Typography settings | ✅ Live | Fonts, sizes configured through admin |
| Custom CSS injection | ✅ Live | Per-section custom CSS support |

## 📊 Analytics & Operations

| Feature | Status | Details |
|---------|--------|---------|
| Admin analytics dashboard | ✅ Live | Summary cards, lead volume chart, conversion funnel, top products, pipeline breakdown |
| Live visitor tracking | ✅ Live | Page view heartbeat tracking |
| Traffic analytics | ✅ Live | Page views, visitors, referrers over time |
| Product interest tracking | ✅ Live | Most-viewed products, category interest |
| Lead scoring | ✅ Live | Event-sourcing ledger, Hot/Qualified/Warm/Cold breakdown |
| Conversion funnel | ✅ Live | Visit → Lead → RFQ → Quotation pipeline visualization |
| Reports (CSV/JSON) | ✅ Live | Exportable analytics reports with persisted preferences |
| Workflow tasks | ✅ Live | Task creation, status tracking, activity logging |

## 📧 Growth & Communication

| Feature | Status | Details |
|---------|--------|---------|
| Email integration | ✅ Live | SMTP config via admin panel, mail sending |
| Central Inbox | ✅ Live | Unified view of emails, chats, RFQs |
| Social channels settings | ✅ Live | Facebook page ID, Instagram, Viber, WhatsApp config |
| Instagram posts management | ✅ Live | Grid management, post CRUD |
| Newsletter capture | ✅ Live | Email subscription form |
| Campaign management | ✅ Live | Contacts, segments, templates |
| Facebook Messenger webhook | ✅ Live | Inbound message handling |
| Telegram bot alerts | ✅ Live | Real-time NEW_LEAD, RFQ_SUBMITTED, ESCALATION notifications |

## 🔌 Platform Infrastructure

| Feature | Status | Details |
|---------|--------|---------|
| Preflight sweep | ✅ Live | 8 phases, 98 checks before any build/deploy |
| Deploy gate | ✅ Live | Blocks deploy on uncommitted/unpushed work |
| Docker Compose deploy | ✅ Live | Website + Postgres + Ollama containers |
| Tailscale SSH | ✅ Live | VPS reachable only via Tailscale mesh |
| DigitalOcean Spaces CDN | ✅ Live | Asset upload via S3 SDK, CDN delivery, sha256 dedupe |
| Unified config platform | ✅ Live | DB-first, env-fallback, admin-editable settings |
| Migration system | ✅ Live | Timestamped SQL migrations with ledger |
| Shopify import tools | ✅ Live | Full import pipeline: customers, products, categories, pages, images |
| SEO audit tool | ✅ Live | Automated SEO health checks |
| Theme analyzer | ✅ Live | Component map, setting-to-renderer tracing |
| Admin wiring audit | ✅ Live | 20+ contract checks for admin features |
| Customer import tools | ✅ Live | CSV, SQL, and Docker-based import paths |
| Designer club import | ✅ Live | 1,597 designer customers migrated from Shopify |
| Judgeme reviews import | ✅ Live | Full review history import format |

## 🗺️ Data Model & Schema

| Feature | Status | Details |
|---------|--------|---------|
| Products | ✅ Live | Full schema: title, slug, description, price, sale_price, tags, materials, dimensions, variants, images, SEO |
| Categories/Collections | ✅ Live | Normal + smart collections with rules engine |
| Customers | ✅ Live | Tags, addresses, RFQ history, designer flag |
| RFQ Requests | ✅ Live | Items, customer, status, delivery info, quotations link |
| Quotations | ✅ Live | Line items, totals, bank details, terms, PDF output |
| Pages | ✅ Live | SEO fields, content (jsonb/HTML) |
| Redirects | ✅ Live | Source/target/type/status/priority |
| Media | ✅ Live | DO Spaces-backed, CDN URLs, sha256 deduplication |
| Blog posts/Articles | ✅ Live | Tags, author, publish date, image |
| Instagram posts | ✅ Live | Grids, hotspots, product links |
| Site settings | ✅ Live | Unified key-value store with admin UI |
| Chatbot tables | ✅ Live | Leads, conversations, messages, RFQ carts, appointments, signals, scores |
| Inbox tables | ✅ Live | Messages, contacts, conversations, channels |
| Workflows/tasks | ✅ Live | Task definition and runtime tables |
| Analytics | ✅ Live | Page views, visitors, insights |
| Password reset | ✅ Live | Token table with expiry and usage tracking |
| OTP codes | ✅ Live | Bcrypt-hashed, expiry-tracked, rate-limited |

---

## 🔄 Resolved Gap History

All resolved gaps from [`docs/GAP_LOG.md`](docs/GAP_LOG.md) map to features listed above:

| Gap ID | Feature(s) Enabled | Resolved Date |
|--------|-------------------|---------------|
| CRIT-001 | Lead persistence | 2026-06-16 |
| CRIT-002 | Chat message persistence | 2026-06-16 |
| CRIT-003 | RFQ requests API | 2026-06-20 |
| CRIT-004 | Admin OTP via email | 2026-06-21 |
| HIGH-001 | Server-side RFQ cart | 2026-06-16 |
| HIGH-002 | Telegram alerts | 2026-06-16 |
| HIGH-003 | Lead scoring dashboard | 2026-06-16 |
| HIGH-004 | Product listing/detail pages | 2026-06-16 |
| HIGH-005 | Collections DB migration | 2026-06-16 |
| HIGH-006 | Chatbot DB integration | 2026-06-16 |
| HIGH-007 | SEOHealth types | 2026-06-16 |
| HIGH-008 | Collection type definitions | 2026-06-16 |
| HIGH-009 | Admin CRUD pages (6 collections) | 2026-06-16 |
| HIGH-010 | JWT secret validation | 2026-06-21 |
| HIGH-011 | Password reset email | 2026-06-21 |
| MED-001 | Message router dedup | 2026-06-16 |
| MED-002 | Dynamic appointment categories | 2026-06-16 |
| MED-003 | Analytics dashboard | 2026-06-16 |
| MED-006 | Bulk product edit API | 2026-06-18 |
| MED-007 | Missing-data filters | 2026-06-18 |
| MED-009 | Products route (dead link fix) | 2026-06-16 |
| MED-010 | Customer links fix | 2026-06-16 |
| MED-011 | /api/customers/me endpoint | 2026-06-16 |
| MED-012 | Admin back-link fix | 2026-06-16 |
| MED-013 | Admin dashboard page | 2026-06-16 |
| MED-014 | Loading skeleton | 2026-06-16 |
| MED-015 | Admin RFQ management | 2026-06-16 |
| MED-017 | Build script cleanup | 2026-06-16 |
| MED-019 | Stale packages cleanup | 2026-06-18 |
| MED-020 | PayloadCms-ui.tgz cleanup | Preflight sweep |
| MED-024 | Docker tags rename | 2026-06-18 |
| RES-004 | Analytics wiring audit | 2026-06-21 |
| RES-005 | RFQ chat + inbox schema | 2026-06-21 |
| RES-006 | Unified settings platform | 2026-06-21 |
| RES-007 | DO Spaces media upload | 2026-06-21 |

---

> **Next:** Review this feature log against [`docs/GAP_LOG.md`](docs/GAP_LOG.md) regularly to ensure features are documented as they ship.
