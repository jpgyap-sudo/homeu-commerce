import { jsPDF } from 'jspdf'

// ── Logo cache ────────────────────────────────────────────────────────────────
// Fetches the brand logo from CDN on first use and caches as base64 for the
// lifetime of the Node.js process. Falls back to the bundled LOGO_BASE64 if
// the fetch fails (e.g. no internet in dev environment).
const LOGO_CDN_URL =
  'https://homeatelierspaces.sgp1.cdn.digitaloceanspaces.com/uploads/661b4f02354d0a3763a4a0331fad557e312abdc19bece013a3d86bbe8582df1a.png'

let _logoBase64Cache: string | null = null
let _logoFetchAttempted = false

async function getLogoBase64(): Promise<string | null> {
  if (_logoFetchAttempted) return _logoBase64Cache
  _logoFetchAttempted = true
  try {
    const res = await fetch(LOGO_CDN_URL)
    if (res.ok) {
      const buf = Buffer.from(await res.arrayBuffer())
      _logoBase64Cache = `data:image/png;base64,${buf.toString('base64')}`
    }
  } catch (e) {
    console.error('[PDF] Failed to fetch brand logo from CDN:', e)
  }
  return _logoBase64Cache
}

// Fetches a theme-configured custom logo (not cached — may change per save).
async function fetchImageBase64(url: string): Promise<string | null> {
  try {
    let fullUrl = url
    if (url.startsWith('/')) {
      const cdnBase = process.env.NEXT_PUBLIC_CDN_URL || 'https://homeatelierspaces.sgp1.cdn.digitaloceanspaces.com'
      fullUrl = `${cdnBase.replace(/\/$/, '')}${url}`
    }
    const res = await fetch(fullUrl)
    if (!res.ok) return null
    const buf = Buffer.from(await res.arrayBuffer())
    const mime = res.headers.get('content-type') || 'image/png'
    return `data:${mime};base64,${buf.toString('base64')}`
  } catch (e) {
    console.error('[PDF] Failed to fetch custom header logo:', e)
    return null
  }
}

interface QuotationItem {
  itemNumber?: number
  title?: string
  productTitle?: string
  description?: string
  material?: string
  dimensions?: string
  color?: string
  imageUrl?: string
  quantity?: number
  unitCost?: number
  unitPrice?: number
  discountPercent?: number
  discountedCost?: number
  total?: number
  totalPrice?: number
}

export interface QuotationData {
  id: number
  quotationNumber?: string
  title?: string
  customerName?: string
  customerEmail?: string
  email?: string
  phone?: string
  deliveryLocation?: string
  projectType?: string
  status?: string
  items: QuotationItem[]
  subtotal: number
  shippingCost?: number
  tax?: number
  total?: number
  grandTotal?: number
  notes?: string
  termsDeliveryLeadtime?: string
  termsPaymentTerms?: string
  termsWarranty?: string
  termsBankDetails?: string
  termsCancellationPolicy?: string
  termsReturnPolicy?: string
  termsRejectionOfItems?: string
  termsRefundPolicy?: string
  validUntil?: string
  createdAt?: string
}

// Settings saved from /admin/theme/quotation (site_settings.theme_quotation).
export interface QuotationTheme {
  template?: 'modern' | 'classic' | 'minimal'
  brandColor?: string
  accentColor?: string
  fontFamily?: string
  headerLogo?: string
  showHeaderLogo?: boolean
  showCompanyName?: boolean
  showAddress?: boolean
  showItemImages?: boolean
  showUnitPrice?: boolean
  showTerms?: boolean
  termsText?: string
  footerText?: string
  showPageNumbers?: boolean
  showWatermark?: boolean
  watermarkText?: string
}

const PAGE_W = 210
const PAGE_H = 297
const M = 15
const CONTENT_W = PAGE_W - M * 2 // 180mm

// Brand Colors (fallbacks when the theme doesn't override them)
const BRAND_GREEN = [23, 63, 47] as const // #173f2f
const INK = [38, 31, 22] as const
const GRAY_BORDER = [210, 210, 210] as const

const BANK_DETAILS = [
  'Bank Name: EASTWEST BANK',
  'Account Name: HOME ATELIER',
  'Account Number: 200012649842',
].join('\n')

type RGB = readonly [number, number, number]
type BaseFont = 'helvetica' | 'times' | 'courier'

function hexToRgb(hex: string | undefined, fallback: RGB): RGB {
  if (!hex) return fallback
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return fallback
  const n = parseInt(m[1], 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function pickFont(fontFamily?: string): BaseFont {
  const f = (fontFamily || '').toLowerCase()
  if (f.includes('georgia') || f.includes('times')) return 'times'
  if (f.includes('courier')) return 'courier'
  return 'helvetica'
}

function money(value: number | undefined, withCurrency = false): string {
  const n = Number(value || 0)
  const formatted = n.toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return withCurrency ? `PHP ${formatted}` : formatted
}

function plainDate(value?: string): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleDateString('en-PH', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
  })
}

function clean(value: unknown): string {
  return String(value || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeItem(item: QuotationItem, index: number) {
  const unitCost = Number(item.unitCost ?? item.unitPrice ?? 0)
  const discountedCost = Number(item.discountedCost ?? unitCost)
  const quantity = Number(item.quantity || 1)
  const total = Number(item.total ?? item.totalPrice ?? discountedCost * quantity)
  const description = clean(item.description || item.productTitle || item.title || `Item ${index + 1}`)
  const details = [item.material, item.dimensions, item.color].map(clean).filter(Boolean)
  return {
    itemNumber: item.itemNumber || index + 1,
    imageUrl: item.imageUrl || '',
    description,
    details,
    quantity,
    unitCost,
    discountedCost,
    total,
  }
}

// Item table column layout — image/unit-price columns collapse to 0 and
// their width is redistributed into the description column when a theme
// toggle hides them.
function buildTableLayout(showItemImages: boolean, showUnitPrice: boolean) {
  const w = {
    item: 10,
    image: showItemImages ? 25 : 0,
    qty: 10,
    unit: showUnitPrice ? 20 : 0,
    total: 24,
  }
  const desc = CONTENT_W - w.item - w.image - w.qty - w.unit - w.total
  const widths = { ...w, desc }
  let x = M
  const cols: Record<keyof typeof widths, number> = {} as any
  for (const key of ['item', 'image', 'desc', 'qty', 'unit', 'total'] as const) {
    cols[key] = x
    x += widths[key]
  }
  return { widths, cols }
}

function drawTableHeader(doc: jsPDF, y: number, brand: RGB, font: BaseFont, layout: ReturnType<typeof buildTableLayout>) {
  const { widths, cols } = layout
  doc.setFillColor(...brand)
  doc.rect(M, y, CONTENT_W, 6.5, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont(font, 'bold')
  doc.setFontSize(7)

  doc.text('ITEM #', cols.item + widths.item / 2, y + 4.5, { align: 'center' })
  if (widths.image > 0) doc.text('IMAGE', cols.image + widths.image / 2, y + 4.5, { align: 'center' })
  doc.text('DESCRIPTION', cols.desc + 2, y + 4.5)
  doc.text('QTY', cols.qty + widths.qty / 2, y + 4.5, { align: 'center' })
  if (widths.unit > 0) doc.text('UNIT COST', cols.unit + widths.unit - 2, y + 4.5, { align: 'right' })
  doc.text('TOTAL', cols.total + widths.total - 2, y + 4.5, { align: 'right' })

  return y + 6.5
}

function drawTableRowGrid(doc: jsPDF, y: number, rowH: number, layout: ReturnType<typeof buildTableLayout>) {
  const { widths, cols } = layout
  doc.setDrawColor(...GRAY_BORDER)
  doc.setLineWidth(0.15)
  doc.rect(M, y, CONTENT_W, rowH)
  if (widths.image > 0) doc.line(cols.image, y, cols.image, y + rowH)
  doc.line(cols.desc, y, cols.desc, y + rowH)
  doc.line(cols.qty, y, cols.qty, y + rowH)
  if (widths.unit > 0) doc.line(cols.unit, y, cols.unit, y + rowH)
  doc.line(cols.total, y, cols.total, y + rowH)
}

function drawSignatureBlock(doc: jsPDF, y: number, font: BaseFont) {
  doc.setDrawColor(...GRAY_BORDER)
  doc.setLineWidth(0.2)

  // Signature lines
  doc.line(M, y, M + 70, y)
  doc.line(M + 110, y, M + 180, y)

  doc.setFont(font, 'bold')
  doc.setFontSize(6.5)
  doc.setTextColor(...INK)
  doc.text('Authorized by: CATHLYN ROMA', M, y + 4)
  doc.text('Date', M + 110, y + 4)

  doc.setFont(font, 'normal')
  doc.setFontSize(6)
  doc.text('Home Atelier Representative', M, y + 7.5)
  doc.text('Client Signature / Date of Confirmation', M + 110, y + 7.5)
}

function drawFooter(doc: jsPDF, footerText: string, font: BaseFont) {
  doc.setFont(font, 'normal')
  doc.setFontSize(6.5)
  doc.setTextColor(120, 120, 120)
  doc.text(footerText, PAGE_W / 2, PAGE_H - 12, { align: 'center' })
}

export async function generateQuotationPDF(data: QuotationData, theme?: QuotationTheme | null): Promise<Uint8Array> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true })
  const items = (data.items || []).map(normalizeItem)
  const grandTotal = Number(data.grandTotal ?? data.total ?? data.subtotal + Number(data.shippingCost || 0))
  const createdDate = plainDate(data.createdAt) || plainDate(new Date().toISOString())

  // ── Theme resolution ──────────────────────────────────────────────────────
  const template = theme?.template || 'modern'
  const brand = hexToRgb(theme?.brandColor, BRAND_GREEN)
  const filled = template !== 'minimal' // solid color header bars vs. outlined
  const font = pickFont(theme?.fontFamily)
  const showHeaderLogo = theme?.showHeaderLogo !== false
  const showCompanyName = theme?.showCompanyName !== false
  const showAddress = theme?.showAddress !== false
  const showItemImages = theme?.showItemImages !== false
  const showUnitPrice = theme?.showUnitPrice !== false
  const showTerms = theme?.showTerms !== false
  const footerText = theme?.footerText || 'If you have any questions about this quotation, please contact sales@homeu.ph'
  const showPageNumbers = Boolean(theme?.showPageNumbers)
  const showWatermark = Boolean(theme?.showWatermark)
  const watermarkText = theme?.watermarkText || 'DRAFT'
  const layout = buildTableLayout(showItemImages, showUnitPrice)

  function sectionHeaderStyle() {
    if (filled) {
      doc.setFillColor(...brand)
    } else {
      doc.setDrawColor(...brand)
      doc.setLineWidth(0.3)
    }
  }

  // Compute discount (only show if positive)
  const shippingCost = Number(data.shippingCost || 0)
  const discountAmount = Math.max(0, data.subtotal - (grandTotal - shippingCost))
  const hasDiscount = discountAmount > 0.005 // more than half a centavo

  // Draw Page 1 Branding and metadata
  doc.setFont(font, 'normal')
  doc.setTextColor(...INK)

  // 1. Brand Logo (theme override, falling back to default CDN logo, PNG/JPEG)
  let logoBase64: string | null = null
  if (showHeaderLogo) {
    if (theme?.headerLogo) logoBase64 = await fetchImageBase64(theme.headerLogo)
    if (!logoBase64) logoBase64 = await getLogoBase64()
  }

  let headerBottomY = 10
  if (showHeaderLogo && logoBase64) {
    try {
      const format = logoBase64.startsWith('data:image/png') ? 'PNG' : 'JPEG'
      doc.addImage(logoBase64, format, M, 10, 65, 22.5)
      headerBottomY = 32.5
    } catch (err) {
      console.error('Error adding brand logo to PDF:', err)
      logoBase64 = null
    }
  }
  if ((!showHeaderLogo || !logoBase64) && showCompanyName) {
    doc.setFont(font === 'helvetica' ? 'times' : font, 'bold')
    doc.setFontSize(16)
    doc.setTextColor(...brand)
    doc.text('Home Atelier', M, 24)
    doc.setFont(font, 'normal')
    doc.setFontSize(6)
    doc.text('MODERN LIVING', M + 1, 28)
    headerBottomY = 33
  }

  if (showAddress) {
    doc.setFont(font, 'normal')
    doc.setFontSize(6.5)
    doc.setTextColor(...INK)
    doc.text('Phone: +63 2 8703 1996', M, headerBottomY + 4)
    doc.text('Email: sales@homeu.ph', M, headerBottomY + 7.5)
  }

  // 2. Order details (Right block)
  doc.setFont(font, 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(...brand)
  doc.text('ORDER DETAILS', PAGE_W - M, 20, { align: 'right' })

  doc.setDrawColor(...brand)
  doc.setLineWidth(0.2)
  doc.rect(PAGE_W - M - 45, 23, 45, 8)

  doc.setFont(font, 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...INK)
  doc.text(data.quotationNumber || `Q-${data.id}`, PAGE_W - M - 22.5, 28.5, { align: 'center' })

  doc.setFont(font, 'normal')
  doc.setFontSize(6.5)
  doc.text(`Date: ${createdDate}`, PAGE_W - M, 36, { align: 'right' })

  // 3. Intro sentence
  doc.setFont(font, 'normal')
  doc.setFontSize(7)
  doc.setTextColor(...INK)
  doc.text('Thank you for ordering your new beloved furnishing piece at Home Atelier. Below is detail of your order for confirmation.', M, 46)

  // 3b. Validity/terms note from the theme builder (short disclaimer line)
  let introExtraY = 0
  if (showTerms && theme?.termsText) {
    doc.setFont(font, 'italic')
    doc.setFontSize(6.5)
    doc.setTextColor(110, 110, 110)
    const validityLines = doc.splitTextToSize(clean(theme.termsText), CONTENT_W)
    doc.text(validityLines, M, 50)
    introExtraY = validityLines.length * 3.2 + 2
  }

  // 4. Client & Delivery side-by-side Info Box
  const infoY = 50 + introExtraY
  const colW = CONTENT_W / 2

  // Header blocks
  sectionHeaderStyle()
  if (filled) {
    doc.rect(M, infoY, colW, 5, 'F')
    doc.rect(M + colW, infoY, colW, 5, 'F')
  } else {
    doc.rect(M, infoY, colW, 5)
    doc.rect(M + colW, infoY, colW, 5)
  }

  doc.setFont(font, 'bold')
  doc.setFontSize(6.5)
  doc.setTextColor(...(filled ? [255, 255, 255] as const : brand))
  doc.text('CLIENT INFORMATION', M + 2, infoY + 3.8)
  doc.text('DELIVERY INFORMATION', M + colW + 2, infoY + 3.8)

  // Outer borders
  doc.setDrawColor(...GRAY_BORDER)
  doc.setLineWidth(0.15)
  doc.rect(M, infoY, CONTENT_W, 16)
  doc.line(M + colW, infoY, M + colW, infoY + 16)

  // Information Text content
  doc.setTextColor(...INK)
  doc.setFont(font, 'bold')
  doc.setFontSize(7)
  doc.text(clean(data.customerName || 'Client'), M + 2, infoY + 9.5)

  doc.setFont(font, 'normal')
  doc.setFontSize(6.5)
  if (data.phone) {
    doc.text(`Phone: ${clean(data.phone)}`, M + 2, infoY + 13.5)
  }
  if (data.customerEmail || data.email) {
    doc.text(`Email: ${clean(data.customerEmail || data.email)}`, M + 2, infoY + 17)
  }

  // Delivery text wraps inside 86mm width
  const deliveryAddress = clean(data.deliveryLocation || 'TBA')
  const deliveryLines = doc.splitTextToSize(deliveryAddress, colW - 4)
  doc.text(deliveryLines, M + colW + 2, infoY + 9.5)

  // 5. Items Table
  let y = 73 + introExtraY
  y = drawTableHeader(doc, y, brand, font, layout)

  for (const [, item] of items.entries()) {
    const title = item.description
    const descLines = doc.splitTextToSize(title, layout.widths.desc - 4)

    // Process details list (materials, dimensions, color, etc.)
    const detailsArr = (item.details || []).map(clean).filter(Boolean)
    const detailLines: string[] = []
    for (const det of detailsArr) {
      detailLines.push(...doc.splitTextToSize(det, layout.widths.desc - 6))
    }

    const textH = (descLines.length + detailLines.length) * 3.5 + 4
    const rowH = Math.max(30, textH)

    // Check for page overflow
    if (y + rowH > 235) {
      drawFooter(doc, footerText, font)
      doc.addPage()
      y = M + 5
      y = drawTableHeader(doc, y, brand, font, layout)
    }

    drawTableRowGrid(doc, y, rowH, layout)

    // A. Item Number
    doc.setFont(font, 'normal')
    doc.setFontSize(7)
    doc.setTextColor(...INK)
    doc.text(String(item.itemNumber), layout.cols.item + layout.widths.item / 2, y + rowH / 2, { align: 'center' })

    // B. Product Image Thumbnail
    if (showItemImages) {
      const img = item.imageUrl
      if (img && img.startsWith('data:image/')) {
        try {
          const format = img.startsWith('data:image/png') ? 'PNG' : 'JPEG'
          doc.addImage(img, format, layout.cols.image + 1.5, y + 2, 22, 26)
        } catch (err) {
          console.error('Error drawing image inside cell:', err)
          doc.setFontSize(5.5)
          doc.setTextColor(140, 140, 140)
          doc.text('[Image]', layout.cols.image + layout.widths.image / 2, y + rowH / 2, { align: 'center' })
        }
      } else {
        doc.setFontSize(5.5)
        doc.setTextColor(140, 140, 140)
        doc.text('No Image', layout.cols.image + layout.widths.image / 2, y + rowH / 2, { align: 'center' })
      }
    }

    // C. Description & Specs
    doc.setTextColor(...INK)
    doc.setFont(font, 'bold')
    doc.setFontSize(7)

    // Draw product title
    let ty = y + 4.5
    for (const line of descLines) {
      doc.text(line, layout.cols.desc + 2, ty)
      ty += 3.5
    }

    // Draw details specs
    doc.setFont(font, 'normal')
    doc.setFontSize(6)
    doc.setTextColor(100, 100, 100)
    for (const line of detailLines) {
      doc.text(line, layout.cols.desc + 3, ty)
      ty += 3.2
    }

    // D. Qty, Unit Cost, Total
    doc.setTextColor(...INK)
    doc.setFont(font, 'normal')
    doc.setFontSize(7)

    doc.text(String(item.quantity), layout.cols.qty + layout.widths.qty / 2, y + rowH / 2, { align: 'center' })
    if (showUnitPrice) {
      doc.text(money(item.unitCost), layout.cols.unit + layout.widths.unit - 2, y + rowH / 2, { align: 'right' })
    }

    doc.setFont(font, 'bold')
    doc.text(money(item.total), layout.cols.total + layout.widths.total - 2, y + rowH / 2, { align: 'right' })

    y += rowH
  }

  if (items.length === 0) {
    doc.rect(M, y, CONTENT_W, 12)
    doc.setFontSize(7)
    doc.text('No items in this quotation.', M + CONTENT_W / 2, y + 7, { align: 'center' })
    y += 12
  }

  // 6. Terms Block and Totals Split Columns
  y += 5
  if (y + 42 > 235) {
    drawFooter(doc, footerText, font)
    doc.addPage()
    y = M + 5
  }

  const termsW = 110
  const termRows: [string, string][] = [
    ['Delivery Leadtime', data.termsDeliveryLeadtime || 'Please allow 2-4 weeks for manufacturing and delivery depending on availability.'],
    ['Payment Terms', data.termsPaymentTerms || '50% down payment upon order confirmation. Remaining 50% due before delivery.'],
    ['Warranty', data.termsWarranty || 'All furniture pieces come with a standard manufacturer warranty covering manufacturing defects.'],
    ['Bank Details', data.termsBankDetails || BANK_DETAILS],
  ]

  // Compute terms box height
  let termLinesCount = 0
  for (const [, val] of termRows) {
    termLinesCount += doc.splitTextToSize(clean(val), termsW - 28).length
  }
  const termsH = Math.max(34, 6 + termLinesCount * 3.1 + termRows.length * 1.5)

  // Draw Terms Header bar
  sectionHeaderStyle()
  if (filled) {
    doc.rect(M, y, termsW, 4.5, 'F')
  } else {
    doc.rect(M, y, termsW, 4.5)
  }
  doc.setFont(font, 'bold')
  doc.setFontSize(6.5)
  doc.setTextColor(...(filled ? [255, 255, 255] as const : brand))
  doc.text('TERMS & CONDITIONS', M + 2, y + 3.2)

  // Draw Terms Box borders
  doc.setDrawColor(...GRAY_BORDER)
  doc.setLineWidth(0.15)
  doc.rect(M, y, termsW, termsH)

  // Draw Term lines
  doc.setTextColor(...INK)
  let ty = y + 8
  doc.setFontSize(6)
  for (const [label, value] of termRows) {
    doc.setFont(font, 'bold')
    doc.text(`${label.toUpperCase()}:`, M + 2, ty)
    doc.setFont(font, 'normal')
    const wrapped = doc.splitTextToSize(clean(value), termsW - 27)
    doc.text(wrapped, M + 25, ty)
    ty += wrapped.length * 3.1 + 1.5
  }

  // Draw Totals Block (Right side)
  const totalsX = M + 120
  const totalsValueX = M + CONTENT_W - 2

  doc.setFontSize(7.5)
  doc.setTextColor(...INK)

  // Subtotal row
  doc.setFont(font, 'bold')
  doc.text('SUBTOTAL:', totalsX, y + 4.5)
  doc.setFont(font, 'normal')
  doc.text('PHP', totalsX + 28, y + 4.5)
  doc.text(money(data.subtotal), totalsValueX, y + 4.5, { align: 'right' })

  let totalsOffsetY = 11

  // Discount row — only rendered when there is an actual discount
  if (hasDiscount) {
    doc.setFont(font, 'bold')
    doc.text('DISCOUNT:', totalsX, y + totalsOffsetY)
    doc.setFont(font, 'normal')
    doc.text('PHP', totalsX + 28, y + totalsOffsetY)
    doc.setTextColor(180, 30, 30)
    doc.text(`-${money(discountAmount)}`, totalsValueX, y + totalsOffsetY, { align: 'right' })
    doc.setTextColor(...INK)
    totalsOffsetY += 6.5
  }

  // Shipping Cost row
  doc.setFont(font, 'bold')
  doc.text('SHIPPING FEE:', totalsX, y + totalsOffsetY)
  doc.setFont(font, 'normal')
  doc.text('PHP', totalsX + 28, y + totalsOffsetY)
  const shippingText = shippingCost > 0 ? money(shippingCost) : 'TO FOLLOW'
  doc.text(shippingText, totalsValueX, y + totalsOffsetY, { align: 'right' })
  totalsOffsetY += 6.5

  // Amount Due (brand color / grand total)
  sectionHeaderStyle()
  if (filled) {
    doc.rect(totalsX, y + totalsOffsetY, CONTENT_W - 120, 7.5, 'F')
  } else {
    doc.rect(totalsX, y + totalsOffsetY, CONTENT_W - 120, 7.5)
  }

  doc.setFont(font, 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...(filled ? [255, 255, 255] as const : brand))
  doc.text('AMOUNT DUE:', totalsX + 2, y + totalsOffsetY + 5.2)
  doc.text('PHP', totalsX + 28, y + totalsOffsetY + 5.2)
  doc.text(money(grandTotal), totalsValueX, y + totalsOffsetY + 5.2, { align: 'right' })

  y += Math.max(termsH + 6, 32)

  const policyBlocks: [string, string][] = [
    ['Cancellation Policy', data.termsCancellationPolicy || 'Customers are free to cancel the confirmed preorder with us within 3 days during placement of order thru written notice and mutual confirmation. Upon cancellation confirmation, a 5% cancellation fee will apply. If a customer’s situation changes, the delivery date may be rescheduled to an earlier or later date. An additional charge will apply if a customer requests a delivery date to be earlier than its original date.'],
    ['Return Policy', data.termsReturnPolicy || '• In case of dispute such as wrong item delivered, you may return the goods or deliver them to our specified address without undue delay and in any case within 7 days from the date on which you communicated the request of return.\n• You are responsible for the return\'s delivery charge and decrease in the value of the goods resulting from the handling of the goods other than that necessary to establish the nature, characteristics and functioning of the goods.\n• The returned goods must be returned in resalable conditions.\n• Please note, in the case of non-resalability, the amount equivalent to the decrease in the value of the asset can always be withheld.'],
    ['Rejection of Items', data.termsRejectionOfItems || 'In the event that items delivered are rejected by the client, the client shall be responsible for the delivery and handling fees for both the outbound and return trips. This includes all costs associated with the transportation, packaging, and handling of the items.'],
    ['Refund Policy', data.termsRefundPolicy || 'Refunds will be processed in accordance with the cancellation policy, subject to administrative fees.'],
  ].filter((row): row is [string, string] => clean(row[1]).length > 0)

  doc.setFontSize(6.5)
  for (const [label, value] of policyBlocks) {
    const wrappedValue = doc.splitTextToSize(clean(value), CONTENT_W - 4)
    const blockH = wrappedValue.length * 3 + 6

    if (y + blockH > 240) {
      drawFooter(doc, footerText, font)
      doc.addPage()
      y = M + 5
    }

    doc.setFillColor(248, 248, 248)
    doc.rect(M, y, CONTENT_W, blockH, 'F')
    doc.setDrawColor(...GRAY_BORDER)
    doc.rect(M, y, CONTENT_W, blockH)

    doc.setFont(font, 'bold')
    doc.setTextColor(...brand)
    doc.text(label, M + 2.5, y + 4.5)

    doc.setFont(font, 'normal')
    doc.setTextColor(...INK)
    doc.setFontSize(6)
    doc.text(wrappedValue, M + 2.5, y + 8)

    y += blockH + 3
  }

  // 8. Signatures Block at bottom of last page
  if (y > 230) {
    drawFooter(doc, footerText, font)
    doc.addPage()
    y = M + 15
  } else {
    y = 245
  }

  drawSignatureBlock(doc, y, font)
  drawFooter(doc, footerText, font)

  // 9. Watermark + page numbers — applied to every page in a final pass
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    if (showWatermark) {
      doc.setFont(font, 'bold')
      doc.setFontSize(72)
      doc.setTextColor(230, 230, 230)
      doc.text(watermarkText, PAGE_W / 2, PAGE_H / 2, { align: 'center', angle: 35 })
    }
    if (showPageNumbers) {
      doc.setFont(font, 'normal')
      doc.setFontSize(6.5)
      doc.setTextColor(120, 120, 120)
      doc.text(`Page ${i} of ${totalPages}`, PAGE_W - M, PAGE_H - 12, { align: 'right' })
    }
  }

  return new Uint8Array(doc.output('arraybuffer'))
}
