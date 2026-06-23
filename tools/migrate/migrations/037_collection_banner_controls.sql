ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS banner_image_url TEXT,
  ADD COLUMN IF NOT EXISTS banner_focal_x INTEGER NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS banner_focal_y INTEGER NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS banner_image_scale INTEGER NOT NULL DEFAULT 100;

UPDATE categories
SET banner_image_scale = 100
WHERE banner_image_scale IS NULL;

UPDATE categories
SET banner_focal_x = 50
WHERE banner_focal_x IS NULL;

UPDATE categories
SET banner_focal_y = 50
WHERE banner_focal_y IS NULL;
