import { readFileSync } from 'fs';

const products = JSON.parse(readFileSync('./tools/playwright-scanner/output/data/products.json', 'utf8'));
const collections = JSON.parse(readFileSync('./tools/playwright-scanner/output/data/collections.json', 'utf8'));
const seo = JSON.parse(readFileSync('./tools/playwright-scanner/output/data/seo-metadata.json', 'utf8'));

console.log('========================================');
console.log('COMPREHENSIVE SCAN vs BACKEND GAP ANALYSIS');
console.log('========================================\n');

// --- PRODUCT FIELD COVERAGE ANALYSIS ---
console.log('--- PRODUCT FIELD COVERAGE ---');
console.log('Live Shopify products use: name, offers (price, currency, availability, sku), brand, image, description');
console.log('Backend Products.ts schema fields: title, slug, sku, status, vendor, productType, price, salePrice, showPrice,');
console.log('  priceNote, inventoryTracked, inventoryQuantity, salesChannel, description, dimensions, materials,');
console.log('  images, category, seoTitle, seoDescription, shopifyOriginalUrl\n');

// Check variant coverage
let totalVariants = 0;
let hasVariants = 0;
products.forEach(p => {
  const ld = p.seo?.jsonLd?.find(j => j['@type'] === 'Product');
  if (ld && ld.offers) {
    totalVariants += ld.offers.length;
    if (ld.offers.length > 1) hasVariants++;
  }
});
console.log(`Products with variants: ${hasVariants}/${products.length}`);
console.log(`Total variants across all products: ${totalVariants}`);
console.log(`VARIANT GAP: Backend has NO variants support — Products.ts has no variant/option fields\n`);

// Check SKU coverage in scan
let withSku = 0;
products.forEach(p => {
  const ld = p.seo?.jsonLd?.find(j => j['@type'] === 'Product');
  if (ld && ld.offers) {
    if (ld.offers.some(o => o.sku)) withSku++;
  }
});
console.log(`Products with SKU in scan: ${withSku}/${products.length}`);

// Check image coverage
let withImages = 0;
products.forEach(p => {
  const realImages = (p.images || []).filter(i => !i.src.includes('facebook.com'));
  if (realImages.length > 0) withImages++;
});
console.log(`Products with product images: ${withImages}/${products.length}`);

// Check description coverage
let withDesc = 0;
products.forEach(p => {
  const ld = p.seo?.jsonLd?.find(j => j['@type'] === 'Product');
  if (ld && ld.description && ld.description.trim()) withDesc++;
});
console.log(`Products with descriptions: ${withDesc}/${products.length}\n`);

// --- COLLECTION FIELD COVERAGE ---
console.log('--- COLLECTION FIELD COVERAGE ---');
console.log('Live Shopify collections: title (from h1), no structured description/metadata in scan');
console.log('Backend Categories.ts schema: title, slug, description, image, seoTitle, seoDescription, shopifyOriginalUrl\n');

// Check collection SEO
let catWithMeta = 0;
let catNoMeta = 0;
collections.forEach(c => {
  if (c.seo && c.seo.metaDescription && c.seo.metaDescription.trim()) catWithMeta++;
  else catNoMeta++;
});
console.log(`Collections WITH metaDescription: ${catWithMeta}/${collections.length}`);
console.log(`Collections WITHOUT metaDescription: ${catNoMeta}/${collections.length}`);

// Check collection OG descriptions (user-written descriptions)
let catWithOgDesc = 0;
collections.forEach(c => {
  if (c.seo && c.seo.ogDescription && c.seo.ogDescription.trim()) catWithOgDesc++;
});
console.log(`Collections WITH ogDescription: ${catWithOgDesc}/${collections.length}\n`);

// Check if ogDescription != metaDescription (indicates a real collection description)
let hasRealDesc = 0;
collections.forEach(c => {
  if (c.seo && c.seo.ogDescription && c.seo.metaDescription && 
      c.seo.ogDescription.trim() !== c.seo.metaDescription.trim()) {
    hasRealDesc++;
  }
});
console.log(`Collections with real description (og != meta): ${hasRealDesc}/${collections.length}\n`);

// --- SEO ANALYSIS ---
console.log('--- SEO ISSUES ---');
const emptyMeta = seo.filter(s => !s.metaDescription || s.metaDescription.trim() === '');
console.log(`1. Empty metaDescription: ${emptyMeta.length}/80 pages`);
const emptyMetaByType = {};
emptyMeta.forEach(s => { emptyMetaByType[s.type] = (emptyMetaByType[s.type]||0)+1; });
Object.entries(emptyMetaByType).forEach(([k,v]) => console.log(`   ${k}: ${v}`));

const emptyH1 = seo.filter(s => !s.h1 || s.h1.trim() === '');
console.log(`\n2. Empty/missing H1: ${emptyH1.length}/80 pages`);
emptyH1.forEach(s => console.log(`   ${s.type} | ${s.url}`));

// Check title format consistency
const titleIssues = seo.filter(s => s.title && s.title.includes('\n'));
console.log(`\n3. Titles with newlines (bad formatting): ${titleIssues.length}/80 pages`);
titleIssues.forEach(s => console.log(`   ${s.type} | ${s.title.substring(0,60)}`));

// Check broken canonical
const canonIssues = seo.filter(s => s.canonical && s.url && s.canonical !== s.url && !s.url.includes(s.canonical));
console.log(`\n4. Canonical URL != page URL: ${canonIssues.length}/80 pages`);
canonIssues.forEach(s => console.log(`   ${s.type} | url: ${s.url} | canonical: ${s.canonical}`));

// Check http vs https in ogImage
const httpImages = seo.filter(s => s.ogImage && s.ogImage.startsWith('http://'));
console.log(`\n5. OG images served over HTTP (not HTTPS): ${httpImages.length}/80 pages`);

// --- JSON STRUCTURE COMPARISON ---
console.log('\n--- MIGRATION READINESS ---');
console.log(`Products to migrate: ${products.length}`);
console.log(`Collections/categories to migrate: ${collections.length}`);
console.log(`Pages (non-product/collection/blog) to migrate: ${seo.filter(s => s.type === 'page').length}`);
console.log(`Blog posts to migrate: ${seo.filter(s => s.type === 'blog').length}`);
console.log(`Policy pages to migrate: ${seo.filter(s => s.type === 'policy').length}`);
console.log(`\nBackend schema supports: Products, Categories, Pages, Media, Redirects, Customers, RFQRequests, Quotations`);

// Check for redirect-mapped content
console.log('\n--- REDIRECT ANALYSIS ---');
const productUrls = products.map(p => p.url);
const collectionUrls = collections.map(c => c.url);
console.log(`${productUrls.length} product URLs need redirects from old Shopify paths`);
console.log(`${collectionUrls.length} collection URLs need redirects from old Shopify paths`);

// Check image CDN - all Shopify
let shopifyImages = 0;
let totalImages = 0;
seo.forEach(s => {
  if (s.ogImage) {
    totalImages++;
    if (s.ogImage.includes('shopify.com') || s.ogImage.includes('homeu.ph/cdn')) shopifyImages++;
  }
});
console.log(`\nOG images pointing to Shopify CDN: ${shopifyImages}/${totalImages}`);
console.log('ACTION: All product/collection images need to be migrated to local storage or DigitalOcean Spaces');

console.log('\n=== END OF ANALYSIS ===');
