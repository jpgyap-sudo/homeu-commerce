-- Migration 018: Native reviews platform (replaces Judge.me)
-- See plans/reviews-platform-architecture.md for the full design.
--
-- All reviews — storefront-submitted, chat-submitted, admin-created, or
-- CSV-imported — land in `reviews`. Moderation is always manual (no
-- auto-approve): every row starts at status='pending' except admin-created
-- ones, which the admin trusts by construction and are approved immediately.
-- fraud_score/fraud_reasons are advisory signals shown in the moderation
-- queue, never used to auto-decide anything.
--
-- reviewer_email is stored for the admin's own reference only — it is never
-- rendered on the storefront, in any public API response, or in JSON-LD.

CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
  order_ref_type TEXT CHECK (order_ref_type IN ('quotation', 'rfq_request')),
  order_ref_id INTEGER,
  customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
  reviewer_name TEXT,
  reviewer_email TEXT,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title TEXT,
  body TEXT,
  body_original_lang TEXT,
  body_translated_en TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'flagged')),
  fraud_score INTEGER DEFAULT 0,
  fraud_reasons JSONB DEFAULT '[]',
  verified_purchase BOOLEAN DEFAULT false,
  source TEXT NOT NULL DEFAULT 'storefront' CHECK (source IN ('storefront', 'chat', 'email_request', 'admin', 'import')),
  imported_from_judgeme BOOLEAN DEFAULT false,
  review_date TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  published_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(status);
CREATE INDEX IF NOT EXISTS idx_reviews_review_date ON reviews(review_date DESC);

CREATE TABLE IF NOT EXISTS review_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  media_id INTEGER REFERENCES media(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_review_photos_review_id ON review_photos(review_id);

CREATE TABLE IF NOT EXISTS review_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  admin_user_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
  body TEXT NOT NULL,
  ai_drafted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_review_replies_review_id ON review_replies(review_id);

CREATE TABLE IF NOT EXISTS review_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_ref_type TEXT CHECK (order_ref_type IN ('quotation', 'rfq_request')),
  order_ref_id INTEGER,
  customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
  product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
  channel TEXT CHECK (channel IN ('email', 'telegram', 'viber', 'chat')),
  scheduled_for TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'sent', 'responded', 'cancelled')),
  review_id UUID REFERENCES reviews(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_review_requests_scheduled_for ON review_requests(scheduled_for) WHERE status = 'scheduled';

ALTER TABLE products ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS avg_rating NUMERIC(3,2) DEFAULT 0;
