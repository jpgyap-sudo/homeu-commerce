/**
 * Smart Grid Layout Engine — computes optimal cell placements
 * for any grid type and image collection.
 */

export type GridType = 'masonry' | 'metro' | 'classic' | 'collage' | 'carousel' | 'spotlight' | 'polaroid'

export interface GridConfig {
  type: GridType
  columns: number
  rows: number
  gap: number
  images: GridImage[]
  spotlightIndex?: number
}

export interface GridImage {
  id: number
  url: string
  width: number
  height: number
  alt?: string
  products?: { id: number; title: string; handle: string; x: number; y: number }[]
}

export interface GridCell {
  imageId: number
  url: string
  alt?: string
  colStart: number
  rowStart: number
  colSpan: number
  rowSpan: number
  aspectRatio: number
  products?: { id: number; title: string; handle: string; x: number; y: number }[]
}

/** Pre-built grid templates */
export const GRID_TEMPLATES: Record<string, { cols: number; rows: number; gaps: number[]; name: string }> = {
  '2x2':       { cols: 2, rows: 2, gaps: [4, 8, 12, 16], name: 'Compact' },
  '3x3':       { cols: 3, rows: 3, gaps: [4, 8, 12, 16], name: 'Classic' },
  '4x4':       { cols: 4, rows: 4, gaps: [4, 8, 12, 16], name: 'Balanced' },
  '4x6':       { cols: 4, rows: 6, gaps: [4, 8, 12], name: 'Tall' },
  '6x6':       { cols: 6, rows: 6, gaps: [2, 4, 8], name: 'Gallery' },
  '6x4':       { cols: 6, rows: 4, gaps: [2, 4, 8, 12], name: 'Wide' },
  '8x4':       { cols: 8, rows: 4, gaps: [2, 4], name: 'Panorama' },
  '1x5':       { cols: 1, rows: 5, gaps: [8, 12, 16], name: 'Story' },
  '5x1':       { cols: 5, rows: 1, gaps: [4, 8, 12], name: 'Banner' },
}

export function computeGrid(config: GridConfig): GridCell[] {
  switch (config.type) {
    case 'masonry':  return computeMasonry(config)
    case 'metro':    return computeMetro(config)
    case 'classic':  return computeClassic(config)
    case 'collage':  return computeCollage(config)
    case 'carousel': return computeCarousel(config)
    case 'spotlight':return computeSpotlight(config)
    case 'polaroid': return computePolaroid(config)
    default:         return computeMasonry(config)
  }
}

/** Masonry — Pinterest-style waterfall with varying cell heights */
function computeMasonry({ images, columns, gap }: GridConfig): GridCell[] {
  const colHeights = new Array(columns).fill(0)
  const cells: GridCell[] = []

  images.forEach(img => {
    const ar = img.width && img.height ? img.width / img.height : 1
    const col = colHeights.indexOf(Math.min(...colHeights))
    const rowSpan = Math.max(1, Math.round(ar * 2)) // taller for portrait
    const colSpan = ar > 1.4 ? 2 : 1 // wide images span 2 cols

    cells.push({
      imageId: img.id, url: img.url, alt: img.alt,
      colStart: col, rowStart: colHeights[col],
      colSpan: Math.min(colSpan, columns - col),
      rowSpan,
      aspectRatio: ar,
      products: img.products,
    })
    colHeights[col] += rowSpan
    if (colSpan > 1) {
      for (let i = 1; i < colSpan && col + i < columns; i++) {
        colHeights[col + i] = Math.max(colHeights[col + i], colHeights[col])
      }
    }
  })
  return cells
}

/** Metro — Windows Phone style, varied spans fill a uniform grid */
function computeMetro({ images, columns, rows }: GridConfig): GridCell[] {
  const cells: GridCell[] = []
  const occupied = new Set<string>()
  let idx = 0

  for (let r = 0; r < rows && idx < images.length; r++) {
    for (let c = 0; c < columns && idx < images.length; c++) {
      if (occupied.has(`${r},${c}`)) continue
      const img = images[idx++]
      const ar = img.width && img.height ? img.width / img.height : 1
      // Alternate between 2x2, 1x2, 2x1, 1x1 based on position
      const key = ((r * columns + c) % 4)
      let cs = 1, rs = 1
      if (key === 0 && c + 1 < columns && r + 1 < rows && ar > 1.2) { cs = 2; rs = 2 }
      else if (key === 1 && r + 1 < rows && ar < 0.9) { cs = 1; rs = 2 }
      else if (key === 2 && c + 1 < columns && ar > 1.2) { cs = 2; rs = 1 }

      cells.push({ imageId: img.id, url: img.url, alt: img.alt, colStart: c, rowStart: r, colSpan: cs, rowSpan: rs, aspectRatio: ar, products: img.products })
      for (let rr = 0; rr < rs; rr++)
        for (let cc = 0; cc < cs; cc++)
          occupied.add(`${r + rr},${c + cc}`)
    }
  }
  return cells
}

/** Classic — uniform grid, all cells equal */
function computeClassic({ images, columns }: GridConfig): GridCell[] {
  return images.map((img, i) => ({
    imageId: img.id, url: img.url, alt: img.alt,
    colStart: i % columns, rowStart: Math.floor(i / columns),
    colSpan: 1, rowSpan: 1,
    aspectRatio: img.width && img.height ? img.width / img.height : 1,
    products: img.products,
  }))
}

/** Collage — overlapping organic layout with varied sizes */
function computeCollage({ images, columns, rows }: GridConfig): GridCell[] {
  const cells: GridCell[] = []
  const patterns = [
    [2,2], [1,1], [1,2], [2,1], [1,1], [2,1], [1,2], [2,2], [1,1],
  ]
  let r = 0, c = 0, pi = 0

  images.forEach(img => {
    const [cs, rs] = patterns[pi % patterns.length]
    if (c + cs > columns) { c = 0; r += 2 }
    cells.push({
      imageId: img.id, url: img.url, alt: img.alt,
      colStart: c, rowStart: r,
      colSpan: cs, rowSpan: rs,
      aspectRatio: img.width && img.height ? img.width / img.height : 1,
      products: img.products,
    })
    c += cs
    if (c >= columns) { c = 0; r += 2 }
    pi++
  })
  return cells
}

/** Carousel — single row horizontal scroll */
function computeCarousel({ images }: GridConfig): GridCell[] {
  return images.map((img, i) => ({
    imageId: img.id, url: img.url, alt: img.alt,
    colStart: i, rowStart: 0, colSpan: 1, rowSpan: 1,
    aspectRatio: img.width && img.height ? img.width / img.height : 1,
    products: img.products,
  }))
}

/** Spotlight — one hero image (2x span) + rest in grid */
function computeSpotlight({ images, columns }: GridConfig): GridCell[] {
  const cells: GridCell[] = []
  images.forEach((img, i) => {
    if (i === 0) {
      cells.push({ imageId: img.id, url: img.url, alt: img.alt, colStart: 0, rowStart: 0, colSpan: Math.min(2, columns), rowSpan: 2, aspectRatio: img.width && img.height ? img.width / img.height : 1, products: img.products })
    } else {
      const idx = i - 1
      const col = (idx % columns)
      const row = 2 + Math.floor(idx / columns)
      cells.push({ imageId: img.id, url: img.url, alt: img.alt, colStart: col, rowStart: row, colSpan: 1, rowSpan: 1, aspectRatio: img.width && img.height ? img.width / img.height : 1, products: img.products })
    }
  })
  return cells
}

/** Polaroid — white-bordered framed look, staggered rotations */
function computePolaroid({ images, columns }: GridConfig): GridCell[] {
  return images.map((img, i) => ({
    imageId: img.id, url: img.url, alt: img.alt,
    colStart: i % columns, rowStart: Math.floor(i / columns),
    colSpan: 1, rowSpan: 1,
    aspectRatio: img.width && img.height ? img.width / img.height : 1,
    products: img.products,
  }))
}
