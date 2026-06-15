/**
 * Chatbot Product Seeder
 * 
 * Seeds sample products into the chatbot's product catalog for MVP testing.
 * Run with: npx ts-node tools/chatbot/seed-products.ts
 * 
 * These products are used by the product recommendation engine
 * to match against visitor queries and uploaded images.
 */

export interface SeedProduct {
  id: string
  title: string
  category: string
  description: string
  referencePrice: number
  currency: string
  imageUrl: string
  tags: string[]
  materials: string[]
  colors: string[]
  styleTags: string[]
  dimensions: string
  url: string
}

const seedProducts: SeedProduct[] = [
  {
    id: 'chair-modern-beige-001',
    title: 'Modern Upholstered Dining Chair — Beige',
    category: 'Dining Chair',
    description: 'Contemporary dining chair with beige fabric upholstery and solid walnut wood legs. Perfect for modern restaurants and homes.',
    referencePrice: 8500,
    currency: 'PHP',
    imageUrl: '/images/products/modern-dining-chair-beige.jpg',
    tags: ['dining', 'chair', 'upholstered', 'indoor', 'seating'],
    materials: ['fabric', 'wood'],
    colors: ['beige', 'walnut'],
    styleTags: ['modern', 'contemporary', 'minimalist'],
    dimensions: 'W45 x D50 x H85 cm',
    url: '/products/modern-upholstered-dining-chair-beige',
  },
  {
    id: 'chair-velvet-green-002',
    title: 'Velvet Accent Chair — Emerald Green',
    category: 'Accent Chair',
    description: 'Luxurious velvet accent chair in emerald green with gold-finished metal legs. A statement piece for living rooms and lounges.',
    referencePrice: 12500,
    currency: 'PHP',
    imageUrl: '/images/products/velvet-accent-chair-green.jpg',
    tags: ['accent', 'chair', 'velvet', 'living-room', 'lounge'],
    materials: ['velvet', 'metal'],
    colors: ['green', 'gold'],
    styleTags: ['luxury', 'glam', 'modern'],
    dimensions: 'W65 x D70 x H90 cm',
    url: '/products/velvet-accent-chair-emerald-green',
  },
  {
    id: 'sofa-linen-gray-003',
    title: 'Linen 3-Seater Sofa — Light Gray',
    category: 'Sofa',
    description: 'Clean-lined 3-seater sofa in light gray linen fabric with removable covers. Ideal for contemporary living spaces.',
    referencePrice: 45000,
    currency: 'PHP',
    imageUrl: '/images/products/linen-sofa-gray.jpg',
    tags: ['sofa', 'linen', '3-seater', 'living-room', 'seating'],
    materials: ['linen', 'foam', 'wood'],
    colors: ['gray', 'light gray'],
    styleTags: ['modern', 'scandinavian', 'minimalist'],
    dimensions: 'W200 x D85 x H80 cm',
    url: '/products/linen-3-seater-sofa-light-gray',
  },
  {
    id: 'pendant-brass-004',
    title: 'Brass Pendant Light — Ø40cm',
    category: 'Pendant Light',
    description: 'Elegant brass pendant light with opal glass shade. Suitable for dining rooms, cafes, and entryways.',
    referencePrice: 6500,
    currency: 'PHP',
    imageUrl: '/images/products/brass-pendant-light.jpg',
    tags: ['lighting', 'pendant', 'brass', 'dining', 'indoor'],
    materials: ['brass', 'glass'],
    colors: ['brass', 'white', 'gold'],
    styleTags: ['modern', 'vintage', 'elegant'],
    dimensions: 'Ø40 x H30 cm, cord 120cm',
    url: '/products/brass-pendant-light-40cm',
  },
  {
    id: 'table-marble-dining-005',
    title: 'Marble Dining Table — 180cm',
    category: 'Dining Table',
    description: 'Stunning marble-top dining table with brushed stainless steel base. Seats 6-8 persons.',
    referencePrice: 78000,
    currency: 'PHP',
    imageUrl: '/images/products/marble-dining-table.jpg',
    tags: ['dining', 'table', 'marble', '6-seater', '8-seater'],
    materials: ['marble', 'stainless steel'],
    colors: ['white', 'gray', 'silver'],
    styleTags: ['modern', 'luxury', 'contemporary'],
    dimensions: 'W180 x D90 x H75 cm',
    url: '/products/marble-dining-table-180cm',
  },
  {
    id: 'floor-lamp-arc-006',
    title: 'Arc Floor Lamp — Black',
    category: 'Floor Lamp',
    description: 'Iconic arc floor lamp with black metal shade and marble base. Perfect reading or ambient lighting.',
    referencePrice: 9500,
    currency: 'PHP',
    imageUrl: '/images/products/arc-floor-lamp-black.jpg',
    tags: ['lighting', 'floor-lamp', 'arc', 'living-room', 'reading'],
    materials: ['metal', 'marble'],
    colors: ['black', 'white', 'brass'],
    styleTags: ['modern', 'mid-century', 'iconic'],
    dimensions: 'H195 x L160 cm base',
    url: '/products/arc-floor-lamp-black',
  },
  {
    id: 'bookshelf-oak-007',
    title: 'Oak Open Bookshelf — 5-Tier',
    category: 'Bookshelf',
    description: 'Minimalist open bookshelf in natural oak veneer. Five tiers of display and storage.',
    referencePrice: 22000,
    currency: 'PHP',
    imageUrl: '/images/products/oak-bookshelf-5tier.jpg',
    tags: ['storage', 'bookshelf', 'oak', 'living-room', 'office'],
    materials: ['oak veneer', 'engineered wood'],
    colors: ['oak', 'natural'],
    styleTags: ['modern', 'scandinavian', 'minimalist'],
    dimensions: 'W80 x D35 x H200 cm',
    url: '/products/oak-open-bookshelf-5-tier',
  },
  {
    id: 'rug-wool-geometric-008',
    title: 'Wool Geometric Rug — 200x300cm',
    category: 'Rug',
    description: 'Hand-tufted wool rug with geometric pattern in neutral tones. Adds texture and warmth to any room.',
    referencePrice: 18500,
    currency: 'PHP',
    imageUrl: '/images/products/wool-geometric-rug.jpg',
    tags: ['rug', 'wool', 'geometric', 'living-room', 'bedroom'],
    materials: ['wool'],
    colors: ['beige', 'gray', 'cream'],
    styleTags: ['modern', 'geometric', 'bohemian'],
    dimensions: 'W200 x L300 cm',
    url: '/products/wool-geometric-rug-200x300',
  },
  {
    id: 'ceiling-fan-white-009',
    title: 'Sleek Ceiling Fan — White with Light',
    category: 'Ceiling Fan',
    description: 'Modern ceiling fan with integrated LED light. Remote control with 3 speed settings.',
    referencePrice: 7500,
    currency: 'PHP',
    imageUrl: '/images/products/ceiling-fan-white.jpg',
    tags: ['ceiling-fan', 'lighting', 'cooling', 'bedroom', 'living-room'],
    materials: ['metal', 'ABS'],
    colors: ['white', 'silver'],
    styleTags: ['modern', 'sleek', 'minimalist'],
    dimensions: 'Ø132 cm, 3 blades',
    url: '/products/sleek-ceiling-fan-white-with-light',
  },
  {
    id: 'cabinet-oak-sideboard-010',
    title: 'Oak Sideboard Cabinet — 2-Door',
    category: 'Cabinet',
    description: 'Elegant oak sideboard with 2 doors and 3 drawers. Ample storage for dining room essentials.',
    referencePrice: 32000,
    currency: 'PHP',
    imageUrl: '/images/products/oak-sideboard-cabinet.jpg',
    tags: ['cabinet', 'sideboard', 'storage', 'dining-room', 'oak'],
    materials: ['oak wood', 'metal'],
    colors: ['oak', 'natural', 'black'],
    styleTags: ['modern', 'scandinavian', 'mid-century'],
    dimensions: 'W120 x D40 x H75 cm',
    url: '/products/oak-sideboard-cabinet-2-door',
  },
]

export default seedProducts

// If run directly, output as JSON
if (require.main === module) {
  console.log(JSON.stringify(seedProducts, null, 2))
  console.log(`\nTotal products: ${seedProducts.length}`)
}
