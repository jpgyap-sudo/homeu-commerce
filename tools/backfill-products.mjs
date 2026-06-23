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

function extractDimensionsFromDescription(html) {
  const text = cleanHtml(html);
  const lines = text.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // 1. Colon pattern
    const colonMatch = line.match(/^(?:dimensions|dimension|size)\s*:\s*(.+)$/i);
    if (colonMatch) {
      return cleanField(colonMatch[1]);
    }
    
    // 2. Line label-only pattern
    if (/^(?:dimensions|dimension|size)$/i.test(line)) {
      const dimLines = [];
      for (let j = i + 1; j < lines.length; j++) {
        const nextLine = lines[j].trim();
        // Break conditions
        if (/^(?:materials|material|bulb|light|ip|max|note|made to order|delivery)\b/i.test(nextLine)) {
          break;
        }
        if (/^[a-z0-9\s]+:/i.test(nextLine) && !nextLine.match(/^(?:small|large|medium|W\d+|L\d+|H\d+|D\d+|dia|ø|diameter|width|height|depth)/i)) {
          break;
        }
        dimLines.push(nextLine);
      }
      if (dimLines.length > 0) {
        return cleanField(dimLines.join(', '));
      }
    }
  }
  return null;
}

function extractMaterialsFromDescription(html) {
  const text = cleanHtml(html);
  const lines = text.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // 1. Colon pattern
    const colonMatch = line.match(/^(?:materials|material)\s*:\s*(.+)$/i);
    if (colonMatch) {
      return cleanField(colonMatch[1]);
    }
    
    // 2. Line label-only pattern
    if (/^(?:materials|material)$/i.test(line)) {
      const matLines = [];
      for (let j = i + 1; j < lines.length; j++) {
        const nextLine = lines[j].trim();
        if (/^(?:dimensions|dimension|size|bulb|light|ip|max|note|made to order|delivery)\b/i.test(nextLine)) {
          break;
        }
        if (/^[a-z0-9\s]+:/i.test(nextLine)) {
          break;
        }
        matLines.push(nextLine);
      }
      if (matLines.length > 0) {
        return cleanField(matLines.join(', '));
      }
    }
  }
  return null;
}

async function run() {
  console.log(`Connecting to: ${connectionString.replace(/\/\/.*@/, '//***@')}`);
  const { rows } = await pool.query('SELECT id, title, description, dimensions, materials FROM products');
  console.log(`Loaded ${rows.length} products`);

  let updatedCount = 0;
  for (const r of rows) {
    const parsedDim = extractDimensionsFromDescription(r.description);
    const parsedMat = extractMaterialsFromDescription(r.description);
    
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
