# Native Reviews Platform — Architecture Plan

> Replaces Judge.me. Source data: `homeu-ph-all-published-reviews-in-judgeme-format-2026-06-21.csv` (167 reviews, 138 products, 2021-07 to 2026-02).

## Data audit findings (must read before importing)

The Judge.me export has integrity problems that gate how migration must work:

- 159 of 167 reviews are 5-star, 8 are 4-star — zero negative reviews.
- Reviewer emails include disposable domains: `tutanota.com`, `fanicle.com`, `bmixr.com`, `eoopy.com`. One address (`hansgo888@tutanota.com`) accounts for 21 of the 167 reviews.
- The store owner's own email appears as reviewer on 4 reviews.
- 29 of 167 rows are `source: admin` (manually entered, not customer-submitted).
- 0 reviews have photos; 0 have merchant replies.

Implication: none of this data may be auto-published into `aggregateRating`/`reviewCount` JSON-LD. Google's [structured-data policy](https://developers.google.com/search/docs/appearance/structured-data/sd-policies) bans non-customer and undisclosed-incentivized reviews; importing fabricated/self-authored reviews into indexed schema risks a manual action. The import pipeline below screens every row and defaults to `pending`, not `approved`.

## Competitive scan

| Capability | Judge.me | Yotpo | Loox | Stamped | Okendo |
|---|---|---|---|---|---|
| Post-purchase email request | ✓ | ✓ | ✓ | ✓ | ✓ |
| Photo/video reviews | ✓ | ✓ | ✓✓ | ✓ | ✓ |
| Incentivized photo reviews | ✓ | ✓ | ✓✓ | ✓ | ✓ |
| Q&A | ✓ | ✓ | — | ✓ | ✓ |
| AI review summary | — | paid tier | — | — | ✓ |
| Merchant reply | ✓ | ✓ | ✓ | ✓ | ✓ |
| Verified purchase | self-reported | self-reported | self-reported | self-reported | self-reported |
| SMS request | paid add-on | ✓ | — | paid | ✓ |
| Shoppable UGC gallery | — | ✓ | ✓✓ | — | ✓ |

Universal gap: "verified purchase" everywhere is just "clicked the email link" — none of them tie a review to real order/fulfillment data, because they're generic apps with no visibility into a merchant's actual backend. We have that visibility (`orders`, `quotations`, `rfq_requests`).

## Genius features (differentiators)

1. **Cryptographic verified-purchase** — review requests are generated from real `orders`/`quotations`/`rfq_requests` rows; the submission form is locked to that order. "Verified Buyer" is true by construction, not a trusted checkbox.
2. **In-chat review collection** — the existing persistent RFQ chat (built same day as this plan) can ask for a rating/review inline post-delivery; far higher completion than an email link.
3. **AI-personalized request copy** — uses the existing `getAIProvider()` to draft a message referencing the actual product + conversation history, sent via the customer's already-engaged channel (email/Telegram/Viber).
4. **Auto-translate Tagalog/Taglish reviews** for English-query SEO reach, with a "see original" toggle — real signal in this dataset, no competitor localizes for PH.
5. **Fraud screening as a core feature** — disposable-domain detection, IP/velocity checks, duplicate-text detection. Required given the audit findings above; no competitor does this seriously.
6. **AI review-summary digest** ("Customers say: sturdy, great for small spaces, fast delivery") generated from the real corpus, cached — Yotpo/Okendo gate this behind paid tiers.
7. **Review → RFQ funnel** — a review naming a use case surfaces a "Get a quote for something similar" CTA, tying social proof back into the actual revenue motion.
8. **One-click AI-drafted merchant reply** — addresses the current 0% reply rate; admin edits before publish.
9. **Project/room-level reviews** — one review can span multiple linked products (a whole room), matching an interior-furniture business better than single-SKU review models.

## Database schema

```sql
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id INTEGER REFERENCES products(id),
  order_ref_type TEXT CHECK (order_ref_type IN ('order','quotation','rfq_request')),
  order_ref_id INTEGER,
  customer_id INTEGER,
  reviewer_name TEXT,
  reviewer_email TEXT,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title TEXT,
  body TEXT,
  body_original_lang TEXT,
  body_translated_en TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','flagged')),
  fraud_score INTEGER DEFAULT 0,
  fraud_reasons JSONB DEFAULT '[]',
  verified_purchase BOOLEAN DEFAULT false,
  source TEXT CHECK (source IN ('storefront','chat','email_request','import')),
  imported_from_judgeme BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  published_at TIMESTAMPTZ
);

CREATE TABLE review_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID REFERENCES reviews(id) ON DELETE CASCADE,
  media_id INTEGER REFERENCES media(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE review_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID REFERENCES reviews(id) ON DELETE CASCADE,
  admin_user_id INTEGER,
  body TEXT NOT NULL,
  ai_drafted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE review_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_ref_type TEXT,
  order_ref_id INTEGER,
  customer_id INTEGER,
  product_id INTEGER REFERENCES products(id),
  channel TEXT CHECK (channel IN ('email','telegram','viber','chat')),
  scheduled_for TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  status TEXT DEFAULT 'scheduled',
  review_id UUID REFERENCES reviews(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE products ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS avg_rating NUMERIC(3,2) DEFAULT 0;
```

## API surface

- `GET /api/products/[id]/reviews` — public, paginated, `status='approved'` only
- `POST /api/reviews` — submit; requires a valid order-ref token from the request link/chat
- `GET /api/admin/reviews`, `PATCH /api/admin/reviews/[id]` — moderation queue, bulk actions
- `POST /api/admin/reviews/[id]/reply?ai_draft=1` — merchant reply with AI-draft helper
- `POST /api/system/reviews/request-queue` — cron-triggered: finds delivered orders past the configured delay, enqueues `review_requests`
- `reviews` namespace added to the existing `lib/app-config.ts` registry — request delay, channel priority, incentive code, auto-approve threshold

## Admin UI

- `/admin/reviews` — moderation queue with fraud-score column, bulk approve/reject, AI-reply button
- `/admin/settings/reviews` — new tab in the existing Settings nav, same pattern as Store/AI/CDN pages
- Dashboard widget: rating trend, response rate, pending-moderation count

## Storefront

- `<ReviewsSection>` on product pages — list, photos via existing `MediaPicker`/DO Spaces pipeline, submission form gated to verified buyers
- `Product` JSON-LD with `aggregateRating`/`reviewCount`, generated only from approved rows
- AI summary card above the list
- "Get a quote for something similar" CTA on relevant reviews

## Workflow

```
Order/RFQ marked delivered
  → review_requests row enqueued (delay from settings, default 7 days)
  → AI drafts personalized message → sent via customer's preferred channel
  → customer taps stars / writes review (chat-inline or web form), pre-filled & locked to that order
  → fraud screen runs automatically (disposable email, IP velocity, duplicate text)
  → score above threshold → auto-approved; below threshold → moderation queue
  → admin approves/rejects/replies (AI-drafted reply available)
  → on approval: products.avg_rating/review_count refreshed, JSON-LD regenerated
  → review visible on product page + contributes to AI summary digest
```

## Migration workflow (one-time, gated)

```
CSV → tools/reviews-import-judgeme-csv.mjs
  → parse, dedupe by reviewer_email+product+date
  → run the same fraud screen (disposable domains, source='admin', self-email matches)
  → write ALL rows with status='pending', imported_from_judgeme=true, verified_purchase=false
  → admin reviews the flagged subset in /admin/reviews before any go live
  → only approved rows ever reach JSON-LD output
```

## Build phases

1. Schema + import script + fraud screen (no UI) — get the CSV in safely, correctly flagged
2. Admin moderation page — start approving real reviews immediately
3. Storefront display + JSON-LD — reviews go live, SEO schema starts working
4. Request queue + multi-channel send — acquisition engine going forward
5. AI features — summary digest, personalized requests, AI-drafted replies, translation
