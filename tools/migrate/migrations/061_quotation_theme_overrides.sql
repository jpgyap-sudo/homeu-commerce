-- Per-quotation overrides for the global Quotation Theme Builder settings
-- (site_settings.theme_quotation). Lets staff override 1-2 fields (e.g. hide
-- watermark, swap footer text) for a single quotation without touching the
-- global theme. Merged on top of the global theme in the PDF route.
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS theme_overrides jsonb;
