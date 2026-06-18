# RFQ Cart App — Skill

## Business Goal
Allow customers to collect products into an RFQ (Request for Quotation) cart, then submit a single quotation request. This is the PRIMARY conversion flow for HomeU (not traditional checkout).

## Current State
- RFQ cart exists in localStorage (`rfq_cart`)
- API routes partially built: `api/rfq/route.ts`
- No proper admin UI for managing RFQ requests
- Cart items are not persisted to DB until submission

## MVP Build Plan

### Data Model (existing tables)
```
rfq_requests — id, customer_name, customer_email, customer_phone, notes, status, created_at
rfq_requests_items — id, rfq_id, product_id, quantity, notes
```

### Frontend: RFQ Cart Widget
- Slide-out cart panel (similar to Shopify's cart drawer)
- List of products with quantity + remove
- "Request Quotation" CTA → inline form (name, email, phone, message)
- Summary: total items, estimated total (if prices visible)

### API Endpoints
```
POST /api/rfq/cart/sync       — Save cart from localStorage to server (auth optional)
POST /api/rfq/cart/submit     — Submit quotation request
GET  /api/admin/rfq            — Admin listings
GET  /api/admin/rfq/:id        — Single RFQ detail
PATCH /api/admin/rfq/:id       — Update status
```

### Admin UI
- `/admin/rfq` — List of RFQ requests with status filter
- Status workflow: New → Viewed → Quoted → Follow-up → Won/Lost
- Quick actions: Create quotation, Mark as contacted
- Product list with images

### Analytics Events
- `rfq_add_to_cart` — Product added
- `rfq_view_cart` — Cart opened
- `rfq_begin_checkout` — Form started
- `rfq_submit` — Quotation requested

## Security
- Rate limit: 5 submissions per email per hour
- Zod validation on all inputs
- Honeypot field on form
- Admin auth via getSession()
