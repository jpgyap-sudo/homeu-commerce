# Admin Panel Speed Optimization Plan

## Current Bottlenecks

### Critical
1. **`force-dynamic` on admin layout** — ALL admin pages bypass Next.js cache. Every page load is SSR.
2. **3 Google Font families (Playfair Display + Inter + JetBrains Mono)** — ~150KB blocking CSS download
3. **23KB admin-legacy.css + 28KB luxury-theme.css** — large CSS files loaded synchronously

### High
4. **AdminShell.tsx (322 lines)** — entire sidebar is a client component rendered on every page
5. **`quotations` badge hardcoded '83'** — stale, never updates, causes re-render
6. **No caching headers** on admin API calls

### Medium
7. **Dashboard runs 3+ queries** on every load (revalidated every 120s, but still SSR)
8. **Images in admin sidebar have no lazy loading**
9. **No bundle splitting** — all admin JS is one chunk

## Implementations

### Fix 1: Font Loading Strategy
Replace blocking Google Fonts with `display=swap` and preconnect + preload approach
- Keeps render-blocking minimal
- Uses `font-display: swap` to avoid invisible text

### Fix 2: CSS Optimization
- Mark CSS as non-render-blocking for non-critical admin sections
- Use `media="print" onload="this.media='all'"` pattern

### Fix 3: Sidebar Performance
- Remove hardcoded badge value
- Make sidebar collapsible sections lazy-initialized

### Fix 4: Analytics Speed Report
- Add Speed tab under Analytics showing real-user performance metrics
- Compare against industry benchmarks

### Fix 5: Admin Caching
- Add `stale-while-revalidate` headers to admin pages
- Keep `force-dynamic` only on pages that need real-time data
