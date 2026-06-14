# Shopify Admin Study Notes

Use this as the HomeU reference when shaping DaVinciOS admin workflows after Shopify's merchant backend.

## Official Sources Studied

- GraphQL Admin API overview: https://shopify.dev/docs/api/admin-graphql/latest
- Product creation: https://shopify.dev/docs/api/admin-graphql/latest/mutations/productCreate
- Product update: https://shopify.dev/docs/api/admin-graphql/latest/mutations/productUpdate
- Product object/model: https://shopify.dev/docs/api/admin-graphql/latest/objects/Product
- Inventory quantities: https://shopify.dev/docs/api/admin-graphql/latest/objects/InventoryQuantity
- Inventory levels: https://shopify.dev/docs/api/admin-graphql/latest/objects/InventoryLevel
- Set inventory quantities: https://shopify.dev/docs/api/admin-graphql/latest/mutations/inventorySetQuantities
- Customer object: https://shopify.dev/docs/api/admin-graphql/latest/objects/Customer
- Discount model entry points: https://shopify.dev/docs/api/admin-graphql/latest/objects/DiscountNode

## Shopify Patterns To Mirror

### Products

Shopify treats Products as an operator-first list with quick scanning by product name, status, inventory, category/type, channels, vendor, and media.
HomeU should make product creation obvious, and the list should answer:

- Is this product active, draft, or archived?
- Is inventory tracked?
- What is the available quantity?
- What category and product type is it in?
- Is it visible in the RFQ catalog or only a draft?
- Does it have vendor/source data from migration?

### Inventory

Shopify separates product details from inventory states. Inventory is tracked by item and location, with quantities such as available, committed, incoming, reserved, and on-hand.
HomeU phase 1 can use a simpler model:

- `inventoryTracked`
- `inventoryQuantity`
- future `inventoryLocations`
- future `inventoryMovements`

For safer future stock updates, copy Shopify's compare-and-swap idea: require the caller to compare the last known quantity before writing a new one.

### Collections

Shopify uses collections as merchandising groups. HomeU categories currently cover the browse/SEO need, but a future smart collection layer can add:

- manual product picks
- rule-based collections
- campaign collections
- room/style/material collections

### Customers

Shopify customer records carry contact data, spend/order history, marketing preference, and timeline/events.
HomeU should evolve customers into:

- customer profile
- RFQ history
- internal notes
- lead status
- account role for backend access

### Orders And RFQs

HomeU is RFQ-first, not checkout-first. Shopify's Orders and Draft Orders map better to HomeU's quote workflow than cart checkout:

- New RFQ
- Contacted
- Quoted
- Quotation Sent
- Closed Won
- Closed Lost

Future innovation: turn RFQs into quote documents, moodboards, room packages, and suggested bundles.

### Analytics

Shopify surfaces operational analytics near the list view. HomeU can add useful cards above core lists:

- products missing images
- products missing SEO fields
- active redirects pending verification
- RFQs awaiting response
- estimated quote value by status
- top requested categories

## HomeU Difference

Do not clone Shopify blindly. Shopify is broad commerce. HomeU needs a smarter furniture/RFQ backend:

- bulk quote operations
- room/project type context
- migration SEO health
- furniture dimensions/materials
- customer project notes
- AI-assisted pricing and follow-up recommendations
