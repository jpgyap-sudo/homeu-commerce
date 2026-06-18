# Instagram Gallery Frontend Skill

## Purpose
Render Instagram feed grids on the HomeU storefront using the `/api/instagram` endpoint and the smart grid engine. Supports 7 layout algorithms, shoppable hotspots, and hover overlays.

## Component Architecture
```
InstagramFeed (client component)
  └── fetches /api/instagram?slug={slug}&limit={limit}
       └── InstagramCell (per-image, hover overlay + product tags)
```

## Component: `components/instagram/InstagramFeed.tsx`

### Props
```typescript
interface Props {
  slug?: string       // Specific grid slug (or default newest posts)
  limit?: number      // Max posts (default 12)
  columns?: number    // Grid columns (default 4)
  gap?: number        // Spacing in px (default 8)
  className?: string  // Extra CSS classes
}
```

### Usage on Storefront
```tsx
// On homepage
import InstagramFeed from '@/components/instagram/InstagramFeed'
<InstagramFeed limit={8} columns={4} />

// Specific grid
<InstagramFeed slug="summer-collection-2026" columns={6} gap={4} />
```

## Layout Algorithms (via grid-engine.ts)

| Algorithm | Best For | Cell Sizing |
|-----------|----------|-------------|
| **masonry** | Product feeds, UGC | Aspect-ratio auto-sizing, tall/wide detection |
| **metro** | Editorial, magazine | Alternating 1×1, 2×1, 1×2, 2×2 tiles |
| **classic** | Clean catalogs | Uniform N×M, all cells equal |
| **collage** | Artistic, luxury | Organic overlapping, pattern cycling |
| **carousel** | Story highlights | Single row, horizontal scroll |
| **spotlight** | Promotions | Hero image (2×) + supporting grid |
| **polaroid** | Lifestyle, casual | Framed, consistent sizing |

## CSS Grid Pattern (from Pasilobus study)
```scss
.instagram-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
}

.instagram-grid img {
  width: 100%;
  aspect-ratio: 1 / 1;
  object-fit: cover;
  border-radius: 12px;
  transition: transform 400ms ease;
}

.instagram-grid a:hover img {
  transform: scale(1.03);
}
```

## Shoppable Hotspot Pattern
Each image cell can have product hotspots. On hover, show product tags:
```tsx
{cell.products?.map(p => (
  <Link key={p.id} href={`/products/${p.handle}`}
    style={{
      background: '#fff', color: '#000',
      fontSize: 10, fontWeight: 600,
      padding: '3px 8px', borderRadius: 999,
    }}>
    🛒 {p.title}
  </Link>
))}
```

## Loading State Pattern
Show skeleton grid while fetching:
```tsx
if (!loaded) return (
  <div style={{ display:'grid', gridTemplateColumns:`repeat(${columns},1fr)`, gap }}>
    {Array.from({length:6}).map((_,i) =>
      <div key={i} style={{ aspectRatio:'1', background:'var(--luxe-warm-200)',
        borderRadius:8, animation:'luxeShimmer 2s infinite' }} />
    )}
  </div>
)
```

## Edge Cases to Handle
- Empty posts → return `null` (don't render empty section)
- Broken images → `onError` handler with placeholder
- Slow network → keep skeleton until fetch completes
- No products tagged → hide product overlay entirely
- Single post → still renders correctly in grid

## nocodeapi Pattern (Web Component)
The nocodeapi/embed-instagram-feed repo uses a web component approach:
```html
<embed-instagram-feed url="Your API URL"></embed-instagram-feed>
```
Our equivalent: React component that reads from `/api/instagram` — same principle, but server-rendered for SEO.

## Pasilobus Pattern (Shopify Snippet)
Pasilobus uses a Liquid snippet + jQuery Instafeed.js:
```
<div id="instafeed" data-access-token="..." data-user-id="..."></div>
<script>new Instafeed({...}).run();</script>
```
Our improvement: No jQuery dependency. Native React with server-side grid computation.
