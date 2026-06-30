/**
 * theme-styles.ts
 * ================
 * THE GENIUS: Runtime CSS generation from section settings.
 *
 * Every section's config (merged with defaults) is fed into this engine
 * which produces a <style> string that applies ALL visual settings:
 * colors, spacing, typography, columns, borders, animations.
 *
 * This is the missing link between the settings schema and the actual
 * rendered HTML — it makes every knob in the admin UI actually work.
 *
 * Output is injected as inline <style> tags scoped to each section by ID.
 *
 * USAGE (in HomeSections.tsx):
 *   import { generateSectionStyles } from '@/lib/theme-styles'
 *   // in the section wrapper div:
 *   <style>{generateSectionStyles(sec.id, cfg, sec.type)}</style>
 *   [section markup using data-section-attr for CSS hooks]
 */

import type { SectionType } from '@/lib/theme-types'

/**
 * Generate scoped CSS for a single section.
 * All settings from theme-builder-settings.ts are consumed here.
 */
export function generateSectionStyles(
  sectionId: number,
  cfg: Record<string, any>,
  type: SectionType
): string {
  const sel = `[data-section-id="${sectionId}"]`
  const styles: string[] = []

  // ── Common background ───────────────────────────────────────────────
  if (cfg.bgColor && cfg.bgColor !== '#ffffff') {
    styles.push(`${sel} { background-color: ${cfg.bgColor}; }`)
  }
  if (cfg.textColor) {
    styles.push(`${sel} { color: ${cfg.textColor}; }`)
  }

  // ── Visibility ─────────────────────────────────────────────────────
  if (cfg.hideMobile) {
    styles.push(`@media (max-width: 768px) { ${sel} { display: none !important; } }`)
  }
  if (cfg.hideDesktop) {
    styles.push(`@media (min-width: 769px) { ${sel} { display: none !important; } }`)
  }

  // ── Spacing ─────────────────────────────────────────────────────────
  const spacingTop = cfg.spacingTop != null ? Number(cfg.spacingTop) : null
  const spacingBottom = cfg.spacingBottom != null ? Number(cfg.spacingBottom) : null
  if (spacingTop !== null) styles.push(`${sel} { padding-top: ${spacingTop}px; }`)
  if (spacingBottom !== null) styles.push(`${sel} { padding-bottom: ${spacingBottom}px; }`)

  // ── Max width ────────────────────────────────────────────────────────
  if (cfg.sectionMaxWidth && cfg.sectionMaxWidth !== 1200) {
    styles.push(`${sel} .page-width { max-width: ${cfg.sectionMaxWidth}px; }`)
  }

  // ── Heading typography ──────────────────────────────────────────────
  if (cfg.headingFontSize) {
    styles.push(`${sel} .section-header__title { font-size: ${cfg.headingFontSize}px !important; }`)
  }
  if (cfg.headingAlign && cfg.headingAlign !== 'center') {
    styles.push(`${sel} .section-header { text-align: ${cfg.headingAlign} !important; }`)
  }
  if (cfg.titleSize) {
    // Used by brand_text, image_with_text, etc.
    styles.push(`${sel} [data-edit="title"] { font-size: ${cfg.titleSize}px !important; }`)
  }
  if (cfg.bodySize) {
    styles.push(`${sel} [data-edit="body"], ${sel} [data-edit="text"] { font-size: ${cfg.bodySize}px !important; }`)
  }

  // ── Universal image controls (focal point, fit, max-width) ──────────
  if (cfg.objectFit && cfg.objectFit !== 'cover') {
    styles.push(`${sel} img[data-section-image] { object-fit: ${cfg.objectFit} !important; }`)
  }
  if (cfg.focalPoint && cfg.focalPoint !== 'center') {
    // Convert 'top left', 'center', 'bottom right' etc. to object-position
    styles.push(`${sel} img[data-section-image] { object-position: ${cfg.focalPoint} !important; }`)
  }
  if (cfg.imageMaxWidth && cfg.imageMaxWidth !== 100) {
    styles.push(`${sel} img[data-section-image] { max-width: ${cfg.imageMaxWidth}% !important; }`)
  }

  // ── Brand text image + animation ─────────────────────────────────────
  if (type === 'brand_text') {
    if (cfg.maxWidth && cfg.maxWidth !== 700) {
      styles.push(`${sel} .homepage-brand-text__body { max-width: ${cfg.maxWidth}px; }`)
    }
  }

  // ── Section-specific ────────────────────────────────────────────────

  // Slideshow
  if (type === 'slideshow') {
    if (cfg.height) styles.push(`${sel} .slideshow { height: ${cfg.height}vh !important; }`)
    if (cfg.minHeight) styles.push(`${sel} .slideshow { min-height: ${cfg.minHeight}px !important; }`)
    if (cfg.maxHeight) styles.push(`${sel} .slideshow { max-height: ${cfg.maxHeight}px !important; }`)
    // Mobile override — inline theme styles beat external CSS, so this MUST be in the same <style> block
    styles.push(`@media (max-width: 768px) { ${sel} .slideshow { height: 55vw !important; min-height: 260px !important; max-height: 400px !important; } }`)
    styles.push(`@media (max-width: 480px) { ${sel} .slideshow__heading { font-size: 20px !important; } }`)
    styles.push(`@media (max-width: 480px) { ${sel} .slideshow__subheading { font-size: 12px !important; } }`)
    styles.push(`@media (max-width: 480px) { ${sel} .slideshow__btn { font-size: 11px !important; padding: 8px 18px !important; } }`)
    if (cfg.contentAlign && cfg.contentAlign !== 'center') {
      styles.push(`${sel} .slideshow__overlay { text-align: ${cfg.contentAlign} !important; }`)
    }
    if (cfg.contentPosition) {
      const alignments: Record<string, string> = {
        top: 'flex-start', center: 'center', bottom: 'flex-end',
      }
      styles.push(`${sel} .slideshow__overlay { justify-content: ${alignments[cfg.contentPosition] || 'flex-end'}; }`)
    }
  }

  // Collection Grid
  if (type === 'collection_grid') {
    if (cfg.columnsDesktop && cfg.columnsDesktop !== 3) {
      styles.push(`${sel} .homeu-collection-grid { grid-template-columns: repeat(${cfg.columnsDesktop}, minmax(0, 1fr)) !important; }`)
    }
    if (cfg.columnsTablet && cfg.columnsTablet !== 2) {
      styles.push(`@media (max-width: 900px) { ${sel} .homeu-collection-grid { grid-template-columns: repeat(${cfg.columnsTablet}, minmax(0, 1fr)) !important; } }`)
    }
    if (cfg.gap && cfg.gap !== 30) {
      styles.push(`${sel} .homeu-collection-grid { gap: ${cfg.gap}px !important; }`)
    }
    if (cfg.aspectRatio && cfg.aspectRatio !== '1:1') {
      const [w, h] = cfg.aspectRatio.split(':').map(Number)
      if (w && h) styles.push(`${sel} .homeu-collection-card { aspect-ratio: ${w}/${h} !important; }`)
    }
    if (cfg.overlayColor) {
      styles.push(`${sel} .homeu-collection-card__media::after { content: ''; position: absolute; inset: 0; background: ${cfg.overlayColor}; z-index: 1; }`)
    }
    if (cfg.hoverEffect === 'scale' || cfg.hoverEffect === 'both') {
      styles.push(`${sel} .homeu-collection-card__link:hover .homeu-collection-card__image { transform: scale(1.06); transition: transform 0.4s ease; }`)
    }
    if (cfg.hoverEffect === 'darken' || cfg.hoverEffect === 'both') {
      styles.push(`${sel} .homeu-collection-card__link:hover .homeu-collection-card__media::after { content: ''; position: absolute; inset: 0; background: rgba(0,0,0,0.3); z-index: 1; }`)
    }
    if (cfg.cardRadius && cfg.cardRadius > 0) {
      styles.push(`${sel} .homeu-collection-card { border-radius: ${cfg.cardRadius}px !important; }`)
    }
    if (cfg.titleColor && cfg.titleColor !== '#ffffff') {
      styles.push(`${sel} .homeu-collection-card__title { color: ${cfg.titleColor} !important; }`)
    }
    if (cfg.titleSize && cfg.titleSize !== 29) {
      styles.push(`${sel} .homeu-collection-card__title { font-size: ${cfg.titleSize}px !important; }`)
    }
  }

  // Featured Products
  if (type === 'featured_products') {
    if (cfg.columnsDesktop && cfg.columnsDesktop !== 5) {
      styles.push(`${sel} .product-grid { grid-template-columns: repeat(${cfg.columnsDesktop}, 1fr) !important; }`)
    }
    if (cfg.columnsTablet && cfg.columnsTablet !== 3) {
      styles.push(`@media (max-width: 900px) { ${sel} .product-grid { grid-template-columns: repeat(${cfg.columnsTablet}, 1fr) !important; } }`)
    }
    if (cfg.gap && cfg.gap !== 24) {
      styles.push(`${sel} .product-grid { gap: ${cfg.gap}px !important; }`)
    }
    if (cfg.titleSize) {
      styles.push(`${sel} .grid-product__title { font-size: ${cfg.titleSize}px !important; }`)
    }
    if (cfg.priceSize) {
      styles.push(`${sel} .grid-product__price { font-size: ${cfg.priceSize}px !important; }`)
    }
    if (cfg.columnsMobile && cfg.columnsMobile !== 2) {
      styles.push(`@media (max-width: 600px) { ${sel} .product-grid { grid-template-columns: repeat(${cfg.columnsMobile}, 1fr) !important; } }`)
    }
    if (cfg.imageAspectRatio && cfg.imageAspectRatio !== '3:4') {
      const [w, h] = cfg.imageAspectRatio.split(':').map(Number)
      if (w && h) styles.push(`${sel} .grid-product__image-wrap { aspect-ratio: ${w}/${h} !important; }`)
    }
    if (cfg.showPrice === false) {
      styles.push(`${sel} .grid-product__price { display: none; }`)
    }
    if (cfg.showViewAll === false) {
      styles.push(`${sel} .homepage-featured-products__more { display: none; }`)
    }
    if (cfg.imageRadius && cfg.imageRadius !== 3) {
      styles.push(`${sel} .grid-product__image-wrap { border-radius: ${cfg.imageRadius}px !important; }`)
    }
    if (cfg.showSaleBadge === false) {
      styles.push(`${sel} .grid-product__price--original { display: none; }`)
    }
    if (cfg.saleBadgeColor) {
      styles.push(`${sel} .grid-product__price--original { color: ${cfg.saleBadgeColor}; }`)
    }
    if (cfg.hoverEffect === 'shadow') {
      styles.push(`${sel} .grid-product__link:hover .grid-product__image { transform: none; }`)
      styles.push(`${sel} .grid-product__link:hover { box-shadow: 0 6px 24px rgba(0,0,0,0.12); }`)
    } else if (cfg.hoverEffect === 'none') {
      styles.push(`${sel} .grid-product__link:hover .grid-product__image { transform: none; }`)
    }
  }

  // Instagram
  if (type === 'instagram') {
    if (cfg.columnsDesktop && cfg.columnsDesktop !== 6) {
      styles.push(`${sel} .homepage-instagram__grid { grid-template-columns: repeat(${cfg.columnsDesktop}, 1fr) !important; }`)
    }
    if (cfg.columnsTablet && cfg.columnsTablet !== 3) {
      styles.push(`@media (max-width: 900px) { ${sel} .homepage-instagram__grid { grid-template-columns: repeat(${cfg.columnsTablet}, 1fr) !important; } }`)
    }
    if (cfg.columnsMobile && cfg.columnsMobile !== 2) {
      styles.push(`@media (max-width: 600px) { ${sel} .homepage-instagram__grid { grid-template-columns: repeat(${cfg.columnsMobile}, 1fr) !important; } }`)
    }
    if (cfg.gap != null && cfg.gap !== 4) {
      styles.push(`${sel} .homepage-instagram__grid { gap: ${cfg.gap}px !important; }`)
    }
    if (cfg.tileRadius && cfg.tileRadius > 0) {
      styles.push(`${sel} .homepage-instagram__tile { border-radius: ${cfg.tileRadius}px !important; }`)
    }
    if (cfg.showProfileLink === false) {
      styles.push(`${sel} .homepage-instagram__profile-link { display: none; }`)
    }
  }

  // CTA
  if (type === 'cta') {
    if (cfg.headingSize) styles.push(`${sel} .homepage-cta__inner h2 { font-size: ${cfg.headingSize}px !important; }`)
    if (cfg.textSize) styles.push(`${sel} .homepage-cta__inner p { font-size: ${cfg.textSize}px !important; }`)
    if (cfg.contentMaxWidth) styles.push(`${sel} .homepage-cta__inner { max-width: ${cfg.contentMaxWidth}px; }`)
  }

  // Newsletter
  if (type === 'newsletter') {
    if (cfg.formWidth) styles.push(`${sel} form { max-width: ${cfg.formWidth}px !important; }`)
    if (cfg.inputRadius) styles.push(`${sel} input { border-radius: ${cfg.inputRadius}px !important; }`)
    if (cfg.inputBorderColor) styles.push(`${sel} input { border-color: ${cfg.inputBorderColor} !important; }`)
  }

  // Logo Bar
  if (type === 'logo_bar') {
    if (cfg.logoWidth) styles.push(`${sel} [data-section-media] img { width: ${cfg.logoWidth}px !important; }`)
    if (cfg.logoHeight) styles.push(`${sel} [data-section-media] img { height: ${cfg.logoHeight}px !important; }`)
    if (cfg.gap && cfg.gap !== 36) styles.push(`${sel} [data-section-media] { margin: 0 ${cfg.gap / 2}px; }`)
    if (cfg.grayscale === false) styles.push(`${sel} [data-section-media] img { filter: none !important; }`)
    if (cfg.hoverOpacity && cfg.hoverOpacity !== 70) {
      styles.push(`${sel} [data-section-media] { opacity: ${cfg.hoverOpacity / 100}; }`)
      styles.push(`${sel} [data-section-media]:hover { opacity: 1; }`)
    }
  }

  // Testimonials
  if (type === 'testimonial') {
    if (cfg.columns && cfg.columns !== 3) {
      styles.push(`${sel} > div > div { grid-template-columns: repeat(${cfg.columns}, 1fr) !important; }`)
    }
    if (cfg.showAvatar === false) {
      styles.push(`${sel} [data-section-id="${sectionId}"] img:first-child { display: none; }`)
    }
    if (cfg.quoteStyle && cfg.quoteStyle !== 'italic') {
      styles.push(`${sel} [data-section-id="${sectionId}"] p { font-style: ${cfg.quoteStyle} !important; }`)
    }
    if (cfg.cardBorder && cfg.cardBorder !== '#eef1ed') {
      styles.push(`${sel} > div > div > div { border-color: ${cfg.cardBorder} !important; }`)
    }
    if (cfg.cardRadius && cfg.cardRadius !== 12) {
      styles.push(`${sel} [data-section-id="${sectionId}"] > div > div > div { border-radius: ${cfg.cardRadius}px !important; }`)
    }
    if (cfg.cardBg && cfg.cardBg !== '#ffffff') {
      styles.push(`${sel} [data-section-id="${sectionId}"] > div > div > div { background: ${cfg.cardBg} !important; }`)
    }
  }

  // Stats Counter
  if (type === 'stats_counter') {
    if (cfg.counterBg) styles.push(`${sel} .homepage-stats { background: ${cfg.counterBg} !important; }`)
    if (cfg.counterTextColor) styles.push(`${sel} .homepage-stats { color: ${cfg.counterTextColor} !important; }`)
    if (cfg.numberSize) styles.push(`${sel} .homepage-stats [data-edit*="number"] { font-size: ${cfg.numberSize}px !important; }`)
    if (cfg.labelSize) styles.push(`${sel} .homepage-stats [data-edit*="label"] { font-size: ${cfg.labelSize}px !important; }`)
  }

  // Promo Bar
  if (type === 'promo_bar') {
    if (cfg.fontSize) styles.push(`${sel} > div { font-size: ${cfg.fontSize}px !important; }`)
    if (cfg.sticky) styles.push(`${sel} { position: sticky; top: 0; z-index: 100; }`)
    if (cfg.dismissible) styles.push(`${sel} .promo-dismiss { display: inline-block; cursor: pointer; margin-left: 12px; }`)
  }

  // Video Hero
  if (type === 'video_hero') {
    if (cfg.overlayOpacity && cfg.overlayOpacity > 0) {
      styles.push(`${sel} .homepage-video-hero > div + div { opacity: ${cfg.overlayOpacity / 100}; }`)
    }
    if (cfg.headingSize) styles.push(`${sel} h1 { font-size: ${cfg.headingSize}px !important; }`)
    if (cfg.textColor) styles.push(`${sel} .homepage-video-hero { color: ${cfg.textColor} !important; }`)
    if (cfg.contentMaxWidth) styles.push(`${sel} .homepage-video-hero > div { max-width: ${cfg.contentMaxWidth}px; }`)
    if (cfg.height) styles.push(`${sel} .homepage-video-hero { height: ${cfg.height}vh !important; }`)
    if (cfg.overlayColor) styles.push(`${sel} .homepage-video-hero > div + div { background: ${cfg.overlayColor}; }`)
    // Note: muted/loop are HTML attributes on <video>, handled in HomeSections.tsx renderer
  }

  // Image Bar
  if (type === 'image_bar') {
    if (cfg.height) styles.push(`${sel} .homepage-image-bar { height: ${cfg.height}px !important; }`)
    if (cfg.mobileHeight) styles.push(`@media (max-width: 600px) { ${sel} .homepage-image-bar { height: ${cfg.mobileHeight}px !important; } }`)
    if (cfg.gap) styles.push(`${sel} .homepage-image-bar { gap: ${cfg.gap}px; }`)
    if (cfg.columns) styles.push(`${sel} .homepage-image-bar { grid-template-columns: repeat(${cfg.columns}, 1fr); }`)
    if (cfg.hoverZoom !== false) styles.push(`${sel} .homepage-image-bar__item:hover img { transform: scale(1.08); transition: transform 0.4s ease; }`)
    if (cfg.hoverZoom === false) styles.push(`${sel} .homepage-image-bar__item img { transform: none !important; }`)
  }

  // Image with Text
  if (type === 'image_with_text') {
    if (cfg.imageWidth && cfg.imageWidth !== '50%') {
      styles.push(`${sel} .homepage-image-text__image-wrap { width: ${cfg.imageWidth}; }`)
      styles.push(`${sel} .homepage-image-text__content { width: ${100 - parseInt(cfg.imageWidth)}%; }`)
    }
    if (cfg.contentPadding) {
      styles.push(`${sel} .homepage-image-text__content { padding: ${cfg.contentPadding}px ${Math.min(cfg.contentPadding + 8, 120)}px; }`)
    }
    if (cfg.contentBg) styles.push(`${sel} .homepage-image-text__content { background: ${cfg.contentBg} !important; }`)
    if (cfg.textColor) styles.push(`${sel} [data-edit="text"], ${sel} .homepage-image-text__text { color: ${cfg.textColor} !important; }`)
    if (cfg.textSize) styles.push(`${sel} [data-edit="text"] { font-size: ${cfg.textSize}px !important; }`)
    if (cfg.imagePosition && cfg.imagePosition !== 'left') {
      styles.push(`${sel} .homepage-image-text__inner { flex-direction: row-reverse !important; }`)
    }
    if (cfg.minHeight) styles.push(`${sel} .homepage-image-text__inner { min-height: ${cfg.minHeight}px; }`)
  }

  // Lookbook
  if (type === 'lookbook') {
    if (cfg.columns && cfg.columns !== 3) {
      styles.push(`${sel} > div > div { grid-template-columns: repeat(${cfg.columns}, 1fr) !important; }`)
    }
    if (cfg.showTitle === false) {
      styles.push(`${sel} [data-section-id="${sectionId}"] [data-edit*="title"] { display: none; }`)
    }
    if (cfg.gap && cfg.gap !== 8) {
      styles.push(`${sel} > div > div { gap: ${cfg.gap}px !important; }`)
    }
    if (cfg.itemRadius && cfg.itemRadius !== 8) {
      styles.push(`${sel} [data-section-media] { border-radius: ${cfg.itemRadius}px !important; }`)
    }
  }

  // Category Carousel
  if (type === 'category_carousel') {
    if (cfg.cardWidth) styles.push(`${sel} a { min-width: ${cfg.cardWidth}px; }`)
    if (cfg.imageHeight) styles.push(`${sel} a > div:first-child { height: ${cfg.imageHeight}px !important; }`)
    if (cfg.titleSize) styles.push(`${sel} a h3 { font-size: ${cfg.titleSize}px !important; }`)
    if (cfg.gap && cfg.gap !== 16) styles.push(`${sel} > div > div { gap: ${cfg.gap}px !important; }`)
    if (cfg.cardRadius) styles.push(`${sel} a { border-radius: ${cfg.cardRadius}px !important; }`)
    if (cfg.cardBg) styles.push(`${sel} a { background: ${cfg.cardBg} !important; }`)
  }

  // ── Animation ─────────────────────────────────────────────────────────
  if (cfg.animation && cfg.animation !== 'none') {
    const animMap: Record<string, string> = {
      fadeIn: 'opacity 0', slideUp: 'opacity 0 transform translateY(30px)',
      slideInLeft: 'opacity 0 transform translateX(-40px)',
      slideInRight: 'opacity 0 transform translateX(40px)',
      zoomIn: 'opacity 0 transform scale(0.92)',
    }
    styles.push(`${sel} { ${animMap[cfg.animation] || ''}; }`)
    styles.push(`${sel}.homeu-animated { opacity: 1 !important; transform: none !important; transition: all 0.6s cubic-bezier(0.22, 1, 0.36, 1); }`)
  }

  // ── Custom class injection ─────────────────────────────────────────────
  if (cfg.customClass) {
    styles.push(`.${cfg.customClass.split(' ').join(', .')} { }`)
  }

  return styles.join('\n')
}

/**
 * Generate ALL section styles at once, used by the layout.
 * Returns a complete <style> tag string.
 */
export function generateAllSectionStyles(
  sections: Array<{ id: number; type: SectionType; config: Record<string, any> }>
): string {
  return sections.map(s => generateSectionStyles(s.id, s.config, s.type)).join('\n')
}

/**
 * Animation CSS — keyframes and base classes.
 * Injected once in the layout.
 */
export const ANIMATION_CSS = `
/* ── Theme Builder Animation System ─────────────────────────── */
@keyframes homeu-fadeIn {
  from { opacity: 0; } to { opacity: 1; }
}
@keyframes homeu-slideUp {
  from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); }
}
@keyframes homeu-slideInLeft {
  from { opacity: 0; transform: translateX(-40px); } to { opacity: 1; transform: translateX(0); }
}
@keyframes homeu-slideInRight {
  from { opacity: 0; transform: translateX(40px); } to { opacity: 1; transform: translateX(0); }
}
@keyframes homeu-zoomIn {
  from { opacity: 0; transform: scale(0.92); } to { opacity: 1; transform: scale(1); }
}
[data-section-id].homeu-animated {
  animation-duration: 0.6s;
  animation-fill-mode: both;
  animation-timing-function: cubic-bezier(0.22, 1, 0.36, 1);
}
[data-section-id].homeu-animated[data-anim="fadeIn"] { animation-name: homeu-fadeIn; }
[data-section-id].homeu-animated[data-anim="slideUp"] { animation-name: homeu-slideUp; }
[data-section-id].homeu-animated[data-anim="slideInLeft"] { animation-name: homeu-slideInLeft; }
[data-section-id].homeu-animated[data-anim="slideInRight"] { animation-name: homeu-slideInRight; }
[data-section-id].homeu-animated[data-anim="zoomIn"] { animation-name: homeu-zoomIn; }
[data-section-id].homeu-animated[data-anim-delay] { animation-delay: attr(data-anim-delay ms); }
`

/**
 * Animated gradient text for brand logo / headings.
 * THE GENIUS: Makes any text element flow through a moving gradient.
 * Applied via CSS class.
 */
export const GRADIENT_TEXT_CSS = `
/* ── Animated Gradient Text ─────────────────────────────────── */
.homeu-gradient-text {
  background: linear-gradient(
    90deg,
    var(--theme-primary, #173f2f) 0%,
    var(--theme-secondary, #b88935) 25%,
    var(--theme-accent, #151a17) 50%,
    var(--theme-secondary, #b88935) 75%,
    var(--theme-primary, #173f2f) 100%
  );
  background-size: 200% 100%;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: homeu-gradient-shift 4s ease-in-out infinite;
}
@keyframes homeu-gradient-shift {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}
`
