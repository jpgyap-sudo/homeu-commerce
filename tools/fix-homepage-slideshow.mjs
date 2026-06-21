/**
 * fix-homepage-slideshow.mjs
 * ===========================
 * The live homepage_sections.slideshow.config had 3 fabricated placeholder
 * slides ("Modern Living, Curated" etc.) instead of the real homeu.ph hero
 * banner. Replaced with the actual 4 slides scraped from https://homeu.ph/ —
 * same images (already mirrored to DO Spaces), same button labels/links.
 */
import pg from 'pg'

const SLIDES = [
  {
    image: 'https://homeatelierspaces.sgp1.cdn.digitaloceanspaces.com/cdn-mirror/e32e2818f312726fc3f70db598f646101adfb6c47e4ac6b6c707f76067d3f808.webp',
    buttonText: 'Shop Sofa',
    buttonLink: '/products?category=sofa',
  },
  {
    image: 'https://homeatelierspaces.sgp1.cdn.digitaloceanspaces.com/cdn-mirror/0f1d7a550f6dd8787bcaeb3125accee1fd0e65bf436c5f6657e684581b432fca.jpg',
    buttonText: 'Shop seating',
    buttonLink: '/products?category=seating',
  },
  {
    image: 'https://homeatelierspaces.sgp1.cdn.digitaloceanspaces.com/cdn-mirror/4faa06ec064fd6c05b5bf3bb7ed47f90c1a6fe8ba54089bb6f6c3d4085d68cdd.jpg',
  },
  {
    image: 'https://homeatelierspaces.sgp1.cdn.digitaloceanspaces.com/cdn-mirror/fc61c37b91a2f74a7533ba6e04f4cc7fc47e5ee90e6e38927e9e4ab52e018415.webp',
    buttonText: 'Shop table',
    buttonLink: '/products?category=table',
  },
]

const conn = process.env.DATABASE_URI || process.env.DATABASE_URL || 'postgres://homeu:homeu@localhost:5432/homeu'
const pool = new pg.Pool({ connectionString: conn, connectionTimeoutMillis: 8000 })

const run = async () => {
  const res = await pool.query(
    `UPDATE homepage_sections SET config = jsonb_set(config, '{slides}', $1::jsonb), updated_at = NOW() WHERE type = 'slideshow'`,
    [JSON.stringify(SLIDES)]
  )
  console.log('homepage slideshow rows updated:', res.rowCount)
  await pool.end()
}
run().catch((e) => { console.error('failed:', e.message); process.exit(1) })
