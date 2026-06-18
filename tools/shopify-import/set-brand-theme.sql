-- Set Home Atelier logo (DO Spaces), brand serif header font, and homepage
-- typography/alignment to match the original homeu.ph look.
SET client_min_messages TO WARNING;

INSERT INTO site_settings (key, value, updated_at) VALUES
('header_settings',
 $j${"logoUrl":"https://homeatelierspaces.sgp1.cdn.digitaloceanspaces.com/cdn-mirror/2a5c7d7e923f96124bb1ce5da171b2510e39af5ec786b9ee0a9c4d8f25d432ac.png","logoMaxWidth":170,"bgColor":"#ffffff","textColor":"#2a2a2a","sticky":true,"fontFamily":"'Cormorant Garamond', serif","navFontSize":16}$j$::jsonb,
 NOW())
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

INSERT INTO site_settings (key, value, updated_at) VALUES
('custom_css',
 $j$"/* Brand serif (matches the Home Atelier logo) */ .h1,.h2,.h3,h1,h2,h3,.homepage-brand-text__title,.section-header__title,.homepage-image-text__title,.homepage-cta h2{font-family:'Cormorant Garamond',Georgia,serif;letter-spacing:.01em;font-weight:500;} /* Nav: title-case like the original, gentle spacing */ .site-nav__link--main{text-transform:none;letter-spacing:.04em;font-weight:500;} /* Centered headings & captions across the homepage */ .index-section .section-header{text-align:center;} .homepage-brand-text{text-align:center;} .homepage-brand-text__body{max-width:760px;margin-left:auto;margin-right:auto;} .collection-list__title,.grid-product__title,.grid-product__vendor,.grid-product__price{text-align:center;} .section-header__title{margin-bottom:8px;}"$j$::jsonb,
 NOW())
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

SELECT key, left(value::text, 70) AS preview FROM site_settings WHERE key IN ('header_settings','custom_css');
