# Quote Cart Inline Product Browser

## The Genius Idea

While users are on the RFQ cart page, they often realize they forgot to add something. Currently they must click "Continue Shopping" → browse → add → navigate back to cart. This creates friction.

**Solution:** Embed a product search + browse panel directly inside the QuoteCart page. Users can search, filter by category, and add products to their RFQ cart without ever leaving the page.

## Design

```
┌─────────────────────────────────────────────────────────────┐
│ ← Continue Shopping  /  Request for Quotation               │
│                                                             │
│ [1. Review Items] ─── [2. Contact Details] ─── [3. Submit]  │
│                                                             │
│ ┌──────────────────────┐  ┌──────────────────────────────┐  │
│ │  Your Selection      │  │  Order Summary                │  │
│ │                      │  │  Items (3)       ₱45,000     │  │
│ │  🛋️ Sofia Sofa      │  │  Delivery       Quoted sep.  │  │
│ │  ₱25,000 × 1  [−|1|+]│  │  ──────────────────────     │  │
│ │  Notes:...           │  │  Total est.     ₱45,000     │  │
│ │                      │  │                              │  │
│ │  🪑 Milan Chair     │  │  Contact Details              │  │
│ │  ₱8,000 × 2  [−|2|+]│  │  [Name] [Phone] [Email]     │  │
│ │                      │  │  [Submit RFQ]                │  │
│ │  [+ Add More Items]  │  │                              │  │
│ │  ────────────────────│  └──────────────────────────────┘  │
│ │  🔍 Search products  │                                    │
│ │  [Sofas] [Tables] [All]                                   │
│ │  ┌──────────────────┐ ┌──────────────────┐               │
│ │  │ 🛋️ Oslo Sofa    │ │ 🛋️ Milan Sofa   │               │
│ │  │ ₱32,000         │ │ ₱28,000         │               │
│ │  │ [Add to RFQ]    │ │ [Add to RFQ]    │               │
│ │  └──────────────────┘ └──────────────────┘               │
│ │  [Load More...]                                           │
│ └──────────────────────────────────────────────────────────┘
```

## Implementation

1. Add a "➕ Add More Items" button at the bottom of the cart items list
2. When clicked, show an inline product browser panel
3. Products load from `/api/products` with search + category filter
4. Each product has an "Add to RFQ" button that adds to cart and closes the panel
5. Category filter chips: [All] [Sofas] [Tables] [Chairs] [Lighting]

No page navigation needed. Everything happens in the same view.
