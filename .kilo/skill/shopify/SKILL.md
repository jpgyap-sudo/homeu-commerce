# Shopify E-Commerce Skill

## Description
Comprehensive Shopify e-commerce operations for HomeU Commerce: customer management, order processing, product catalog sync, inventory tracking, and Shopify API integration.

## Related Skills
- CRM — Customer relationship management, RFQ workflows, quotation tracking
- Data Sync — Shopify → DaVinciOS CMS data synchronization
- Frontend — Customer-facing storefront components

## Shopify API Resources

### Admin REST API (for internal operations)
- **Base URL**: `https://{shop}.myshopify.com/admin/api/2024-01/`
- **Auth**: Shopify Admin API access token (`X-Shopify-Access-Token`)
- **Scopes needed**: `read_customers`, `write_customers`, `read_orders`, `read_products`, `write_products`, `read_inventory`, `read_price_rules`

### Storefront API (for customer-facing features)
- **Base URL**: `https://{shop}.myshopify.com/api/2024-01/graphql.json`
- **Auth**: Storefront API access token (public)
- **Use cases**: Customer login, product browsing, cart creation

### Key Endpoints
```
# Customers
GET  /admin/api/2024-01/customers.json          — List all customers
GET  /admin/api/2024-01/customers/{id}.json     — Get single customer
POST /admin/api/2024-01/customers.json           — Create customer
PUT  /admin/api/2024-01/customers/{id}.json      — Update customer
GET  /admin/api/2024-01/customers/search.json    — Search customers

# Orders
GET  /admin/api/2024-01/orders.json              — List all orders
GET  /admin/api/2024-01/orders/{id}.json         — Get single order
POST /admin/api/2024-01/orders.json              — Create order (draft)

# Products
GET  /admin/api/2024-01/products.json            — List products
GET  /admin/api/2024-01/products/{id}.json       — Get single product
POST /admin/api/2024-01/products.json            — Create product

# Inventory
GET  /admin/api/2024-01/inventory_levels.json    — Get inventory levels
POST /admin/api/2024-01/inventory_levels/adjust.json — Adjust inventory
```

### Customer Data Model (Shopify)
```json
{
  "customer": {
    "id": 1234567890,
    "first_name": "Juan",
    "last_name": "Dela Cruz",
    "email": "juan@example.com",
    "phone": "+639123456789",
    "note": "VIP customer",
    "state": "enabled",
    "tax_exempt": false,
    "addresses": [{
      "address1": "123 Rizal St",
      "city": "Manila",
      "province": "Metro Manila",
      "country": "Philippines",
      "zip": "1000"
    }]
  }
}
```

### Order Data Model (Shopify)
```json
{
  "order": {
    "id": 9876543210,
    "order_number": 1001,
    "email": "juan@example.com",
    "phone": "+639123456789",
    "customer": { "id": 1234567890 },
    "total_price": "15000.00",
    "subtotal_price": "13500.00",
    "financial_status": "paid",
    "fulfillment_status": "fulfilled",
    "line_items": [{
      "product_id": 555,
      "variant_id": 666,
      "title": "Wooden Dining Table",
      "quantity": 1,
      "price": "13500.00"
    }],
    "note": "Please deliver before Christmas",
    "created_at": "2024-01-15T10:30:00+08:00"
  }
}
```

## Customer Authentication Flow (HomeU)
Since HomeU uses RFQ (Request for Quotation) instead of direct checkout, the customer auth flow is:

1. **Registration**: Customer signs up with Name, Contact Number, Email
2. **Login**: Customer logs in with email + password
3. **Price Visibility**: After login, product prices become visible
4. **RFQ Submission**: Logged-in customers can submit RFQs
5. **RFQ Tracking**: Customers can view RFQ status in their portal

## Implementation Guidelines

### Customer Collection Fields
```
Name       — text, required
Email      — email, required, unique
Phone      — text, required
Password   — (hashed, not stored in Payload — use Payload's built-in auth)
Address    — text (optional)
CreatedAt  — date (auto)
```

### RFQ Status Workflow
```
new → contacted → quoted → quotation_sent → closed (won) / closed (lost)
```

- `new`: Initial submission
- `contacted`: Sales team has reached out
- `quoted`: Quotation has been prepared
- `quotation_sent`: **New** — quotation PDF/email has been sent to customer
- `closed (won)`: Customer accepted the quotation
- `closed (lost)`: Customer declined or no response

### Price Visibility
- **Before login**: Products display "Login to see price" or price notes
- **After login**: Product prices are shown (from `Products.price` field)
- Controlled via frontend conditional rendering based on auth state

## Shopify MCP Tools (available via tools/shopify-mcp/)
- `tools/shopify-mcp/server.mjs` — MCP server for Shopify operations
- `tools/shopify-mcp/auth-helper.mjs` — OAuth flow helper
- `tools/shopify-import/` — Data transformation and import scripts

## Related Files
- `apps/website/src/collections/Customers.ts` — Customer collection
- `apps/website/src/collections/RFQRequests.ts` — RFQ collection
- `apps/website/src/app/api/rfq/route.ts` — RFQ API endpoint
- `apps/website/src/app/customer/` — Customer portal pages
- `apps/website/src/app/login/` — Login page
- `tools/shopify-import/transform-bulk-export.mjs` — Shopify data transformer
