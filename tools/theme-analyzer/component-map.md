# Component Map — Debut Theme to Next.js Migration

## Site Header
- **File:** `components/SiteHeader.tsx`
- **Source:** Shopify Debut theme navigation + logo
- **Props:** none (reads from `data/site-config.json` and `data/navigation.json`)

## Site Footer
- **File:** `components/SiteFooter.tsx`
- **Source:** Shopify Debut theme footer + social links
- **Props:** none (reads from `data/site-config.json`)

## Homepage Slideshow
- **File:** `components/HomepageSlideshow.tsx`
- **Source:** Shopify Debut theme slideshow section
- **Props:** `config` — slideshow settings from homepage_sections.config

## Product DNA Card
- **File:** `components/ProductDNACard.tsx`
- **Source:** Custom admin dashboard widget
- **Props:** `summary`, `products` — DNA score data from API

## Instagram Feed
- **File:** `components/instagram/InstagramFeed.tsx`
- **Source:** Custom, based on Mintt Studio + Pasilobus patterns
- **Props:** `slug`, `limit`, `columns`, `gap`, `className`, `showCaption`, `lazyLoad`

## Chat Widget
- **File:** `components/chat/ChatWidget.tsx`
- **Source:** Custom concierge chatbot
- **Props:** none (self-contained)

## Live Visitors
- **File:** `components/LiveVisitors.tsx`
- **Source:** Custom analytics component
- **Props:** none (reads from API)

## Admin Shell
- **File:** `app/admin/AdminShell.tsx`
- **Source:** Custom admin layout
- **Props:** `children`

## Page View Tracker
- **File:** `components/PageViewTracker.tsx`
- **Source:** Custom analytics tracker
- **Props:** none
