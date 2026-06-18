# Instagram RFQ Integration Skill

## Purpose
Connect Instagram posts to the Request for Quotation (RFQ) system. When a customer clicks a shoppable product tag on an Instagram post, they can add it to their RFQ cart and submit a quotation request.

## User Flow
```
Instagram Post (storefront)
  └── Hover → reveals shoppable product tags
       └── Click product → "Add to RFQ Cart" button
            └── RFQ Cart updated (localStorage + server)
                 └── Customer submits RFQ form
                      └── Admin receives RFQ with product reference
                           └── Admin creates quotation
```

## Integration Points

### 1. Shoppable Hotspot on Instagram Feed
```tsx
// In InstagramFeed.tsx InstagramCell component
{cell.products && cell.products.length > 0 && (
  <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
    {cell.products.map(p => (
      <span key={p.id} style={{ background:'#fff', color:'#000',
        fontSize:10, fontWeight:600, padding:'3px 8px', borderRadius:999 }}>
        🛒 {p.title}
      </span>
    ))}
  </div>
)}
```

### 2. Product → RFQ Cart Bridge
When a product from Instagram is added to cart, record the source:
```typescript
// lib/rfq-cart.ts
export function addToCart(productId: number, source: string = 'instagram') {
  const cart = JSON.parse(localStorage.getItem('rfq_cart') || '[]')
  cart.push({ productId, source, addedFrom: window.location.pathname, timestamp: Date.now() })
  localStorage.setItem('rfq_cart', JSON.stringify(cart))
}
```

### 3. RFQ Tracking
Store the Instagram post reference in the RFQ request:
```typescript
// app/api/rfq/route.ts
await query(
  `INSERT INTO rfq_requests (customer_name, customer_email, product_ids, source_page, instagram_post_id)
   VALUES ($1, $2, $3, $4, $5)`,
  [name, email, JSON.stringify(productIds), 'instagram_feed', instagramPostId]
)
```

## Database Fields to Add
```sql
ALTER TABLE rfq_requests ADD COLUMN IF NOT EXISTS instagram_post_id INTEGER;
ALTER TABLE rfq_requests ADD COLUMN IF NOT EXISTS source_page VARCHAR;
ALTER TABLE rfq_requests_items ADD COLUMN IF NOT EXISTS instagram_clicked BOOLEAN DEFAULT FALSE;
```

## Analytics Integration
Track which Instagram posts drive the most RFQs:
```sql
SELECT
  ip.id, ip.caption, ip.permalink,
  COUNT(DISTINCT rfq.id) as rfq_count,
  COUNT(DISTINCT q.id) as quote_count
FROM instagram_posts ip
LEFT JOIN rfq_requests rfq ON rfq.instagram_post_id = ip.id
LEFT JOIN quotations q ON q.rfq_id = rfq.id
GROUP BY ip.id
ORDER BY rfq_count DESC
```

## Dashboard Widget Idea
Add an "Instagram → RFQ Pipeline" card on the analytics page:
```
📸 Instagram Posts → RFQ Conversion
┌─────────────────────────────────────────┐
│ Post A (Summer Sofa)     12 RFQs  3 Qts │
│ Post B (Dining Set)       8 RFQs  2 Qts │
│ Post C (Bed Frame)        5 RFQs  0 Qts │
└─────────────────────────────────────────┘
```
