import pg from 'pg';
const { Pool } = pg;

const connectionString =
  process.env.DATABASE_URI ||
  process.env.DB_URI ||
  'postgres://homeu:homeu_local_password@localhost:5432/homeu';

const pool = new Pool({ connectionString });

function cleanHtml(html) {
  if (!html) return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<li[^>]*>/gi, '\n')
    .replace(/<p[^>]*>/gi, '\n')
    .replace(/<div[^>]*>/gi, '\n')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&middot;/gi, '·')
    .replace(/&times;/gi, 'x')
    .split('\n')
    .map(line => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n');
}

function cleanField(val) {
  if (!val) return null;
  let s = val.trim();
  s = s.replace(/(?:MADE TO ORDER|CHECK OUT SWATCHES|COLLECTION ITEMS|CONTACT US FOR|DELIVERY IN|Note:).*$/i, '');
  s = s.replace(/(?:Dimensions|Dimension|Size)\s*:.*$/i, '');
  s = s.trim();
  s = s.replace(/[,;.\-\s·\/]+$/, '');
  s = s.trim();
  if (s.length > 255) {
    s = s.substring(0, 252) + '...';
  }
  return s || null;
}

async function run() {
  console.log(`Connecting to: ${connectionString.replace(/\/\/.*@/, '//***@')}`);
  const { rows } = await pool.query('SELECT id, title, description, dimensions, materials FROM products');
  console.log(`Loaded ${rows.length} products`);

  let updatedCount = 0;
  for (const r of rows) {
    const text = cleanHtml(r.description);
    
    const dimMatch = text.match(/(?:dimensions|dimension|size)\s*:\s*([^\n;]+)/i);
    const matMatch = text.match(/(?:materials|material)\s*:\s*([^\n;]+)/i);
    
    const parsedDim = dimMatch ? cleanField(dimMatch[1]) : null;
    const parsedMat = matMatch ? cleanField(matMatch[1]) : null;
    
    const newDim = (!r.dimensions || !r.dimensions.trim()) ? parsedDim : null;
    const newMat = (!r.materials || !r.materials.trim()) ? parsedMat : null;
    
    if (newDim || newMat) {
      const finalDim = newDim || r.dimensions;
      const finalMat = newMat || r.materials;
      
      await pool.query(
        'UPDATE products SET dimensions = $1, materials = $2 WHERE id = $3',
        [finalDim, finalMat, r.id]
      );
      updatedCount++;
      if (updatedCount <= 10) {
        console.log(`Updated "${r.title}":`);
        if (newDim) console.log(`  Dim: "${newDim}"`);
        if (newMat) console.log(`  Mat: "${newMat}"`);
      }
    }
  }
  
  console.log(`\nSuccessfully backfilled ${updatedCount} products!`);
  await pool.end();
}

run().catch(console.error);
