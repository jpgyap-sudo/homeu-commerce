# 🔐 Shopify MCP — Authentication Guide

To give the AI agent direct access to your Shopify store data, you need to create a **Private App** in your Shopify admin and provide the access token.

## Step-by-Step (2 minutes)

### 1. Go to Shopify Admin → Apps

Visit: `https://admin.shopify.com/admin/apps`

Or from your store:
- Click **Settings** → **Apps and sales channels**
- Or directly: `https://admin.shopify.com/store/YOUR_STORE/apps`

### 2. Enable Custom App Development

If you haven't already:
- Scroll down to **Develop apps**
- Click **Allow custom app development**
- Confirm the warning

### 3. Create a Private App

- Click **Create an app**
- Name it: `HomeU Migration (AI Agent)`
- Click **Create app**

### 4. Configure API Scopes

Under **Admin API Integration** → **Scopes**, enable these **read-only** scopes:

| Scope | Why Needed |
|-------|-----------|
| `read_products` | Product list, details, images, variants, SEO |
| `read_content` | Pages, blogs, articles, navigation |
| `read_themes` | Theme files (Liquid, CSS, JS) |
| `read_customers` | (Optional) Customer data |
| `read_orders` | (Optional) Order history |

> **Security note:** These are READ-ONLY scopes. The MCP server cannot modify your store data.

### 5. Get Your Token

- Click **Install app**
- Copy the **Admin API access token** (starts with `shpat_...`)
- **Save it somewhere secure** — it's only shown once!

### 6. Run Auth Setup

```bash
cd tools/shopify-mcp
npm install
node server.mjs --auth-setup
```

Enter:
1. Your store name (e.g., `homeu` for `homeu.myshopify.com`)
2. The Admin API access token

### 7. Verify Connection

```bash
# Show store summary
node server.mjs --summary

# Export all data
node server.mjs --export
```

## What Happens Next

Once authenticated, the MCP server gives the AI agent these capabilities:

```
shopify_list_products     → Full product catalog (images, variants, SEO, tags)
shopify_get_product       → Single product details
shopify_list_collections  → All categories with product mappings
shopify_list_pages        → All pages with content and SEO
shopify_list_blogs        → All blog articles
shopify_get_themes        → Theme list and Liquid template access
shopify_export_all        → Complete export to Payload CMS format
```

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `401 Unauthorized` | Token is invalid or expired. Create a new private app. |
| `403 Forbidden` | Token doesn't have the required scope. Add scope and reinstall. |
| `404 Not Found` | Store name is wrong. Check your myshopify.com domain. |
| Connection refused | Run `node server.mjs --auth-setup` to reconfigure. |

## Security

- The token is stored locally in `tools/shopify-mcp/.shopify-env.json`
- **Never commit this file** (it's in .gitignore)
- The MCP server only makes GET requests (read-only)
- Revoke the token anytime from your Shopify admin
