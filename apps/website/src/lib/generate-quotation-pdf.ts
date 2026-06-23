import { jsPDF } from 'jspdf'
import { LOGO_BASE64 } from './logo-base64'

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

interface QuotationData {
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

const PAGE_W = 210
const PAGE_H = 297
const M = 15
const CONTENT_W = PAGE_W - M * 2 // 180mm

// Brand Colors
const BRAND_GREEN = [23, 63, 47] as const // #173f2f
const ACCENT_GOLD = [201, 160, 80] as const // #c9a050
const INK = [38, 31, 22] as const
const GRAY_BORDER = [210, 210, 210] as const

const BANK_DETAILS = [
  'Bank Name: EASTWEST BANK',
  'Account Name: LUMITEC LIGHTING SPECIALIST INC',
  'Account Number: 200012649842',
].join('\n')

const TABLE_WIDTHS = {
  item: 10,
  image: 25,
  desc: 71,
  qty: 10,
  unit: 20,
  disc: 20,
  total: 24,
}

const TABLE_COLS = {
  item: M,
  image: M + TABLE_WIDTHS.item,
  desc: M + TABLE_WIDTHS.item + TABLE_WIDTHS.image,
  qty: M + TABLE_WIDTHS.item + TABLE_WIDTHS.image + TABLE_WIDTHS.desc,
  unit: M + TABLE_WIDTHS.item + TABLE_WIDTHS.image + TABLE_WIDTHS.desc + TABLE_WIDTHS.qty,
  disc: M + TABLE_WIDTHS.item + TABLE_WIDTHS.image + TABLE_WIDTHS.desc + TABLE_WIDTHS.qty + TABLE_WIDTHS.unit,
  total: M + TABLE_WIDTHS.item + TABLE_WIDTHS.image + TABLE_WIDTHS.desc + TABLE_WIDTHS.qty + TABLE_WIDTHS.unit + TABLE_WIDTHS.disc,
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

function drawTableHeader(doc: jsPDF, y: number) {
  doc.setFillColor(...BRAND_GREEN)
  doc.rect(M, y, CONTENT_W, 6.5, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  
  // Center headers
  doc.text('ITEM #', TABLE_COLS.item + TABLE_WIDTHS.item / 2, y + 4.5, { align: 'center' })
  doc.text('IMAGE', TABLE_COLS.image + TABLE_WIDTHS.image / 2, y + 4.5, { align: 'center' })
  doc.text('DESCRIPTION', TABLE_COLS.desc + 2, y + 4.5)
  doc.text('QTY', TABLE_COLS.qty + TABLE_WIDTHS.qty / 2, y + 4.5, { align: 'center' })
  
  // Right headers
  doc.text('UNIT COST', TABLE_COLS.unit + TABLE_WIDTHS.unit - 2, y + 4.5, { align: 'right' })
  doc.text('DISC. COST', TABLE_COLS.disc + TABLE_WIDTHS.disc - 2, y + 4.5, { align: 'right' })
  doc.text('TOTAL', TABLE_COLS.total + TABLE_WIDTHS.total - 2, y + 4.5, { align: 'right' })
  
  return y + 6.5
}

function drawTableRowGrid(doc: jsPDF, y: number, rowH: number) {
  doc.setDrawColor(...GRAY_BORDER)
  doc.setLineWidth(0.15)
  doc.rect(M, y, CONTENT_W, rowH)
  doc.line(TABLE_COLS.image, y, TABLE_COLS.image, y + rowH)
  doc.line(TABLE_COLS.desc, y, TABLE_COLS.desc, y + rowH)
  doc.line(TABLE_COLS.qty, y, TABLE_COLS.qty, y + rowH)
  doc.line(TABLE_COLS.unit, y, TABLE_COLS.unit, y + rowH)
  doc.line(TABLE_COLS.disc, y, TABLE_COLS.disc, y + rowH)
  doc.line(TABLE_COLS.total, y, TABLE_COLS.total, y + rowH)
}

function drawSignatureBlock(doc: jsPDF, y: number) {
  doc.setDrawColor(...GRAY_BORDER)
  doc.setLineWidth(0.2)
  
  // Signature lines
  doc.line(M, y, M + 70, y)
  doc.line(M + 110, y, M + 180, y)
  
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(6.5)
  doc.setTextColor(...INK)
  doc.text('Authorized by: CATHLYN ROMA', M, y + 4)
  doc.text('Date', M + 110, y + 4)
  
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6)
  doc.text('Home Atelier Representative', M, y + 7.5)
  doc.text('Client Signature / Date of Confirmation', M + 110, y + 7.5)
}

function drawFooter(doc: jsPDF, isLastPage = false, data?: QuotationData) {
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.5)
  doc.setTextColor(120, 120, 120)
  
  const footerText = 'If you have any questions about this quotation, please contact sales@homeu.ph'
  doc.text(footerText, PAGE_W / 2, PAGE_H - 12, { align: 'center' })
}

export async function generateQuotationPDF(data: QuotationData): Promise<Uint8Array> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true })
  const items = (data.items || []).map(normalizeItem)
  const grandTotal = Number(data.grandTotal ?? data.total ?? data.subtotal + Number(data.shippingCost || 0))
  const createdDate = plainDate(data.createdAt) || plainDate(new Date().toISOString())

  // Draw Page 1 Branding and metadata
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...INK)

  // 1. Branding Logo and details
  try {
    doc.addImage(LOGO_BASE64, 'JPEG', M, 15, 48, 16)
  } catch (err) {
    console.error('Error adding brand logo to PDF:', err)
    doc.setFont('times', 'bold')
    doc.setFontSize(16)
    doc.setTextColor(...BRAND_GREEN)
    doc.text('Home Atelier', M, 24)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6)
    doc.text('MODERN LIVING', M + 1, 28)
  }

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.5)
  doc.setTextColor(...INK)
  doc.text('Phone: +63 2 8703 1996', M, 36)
  doc.text('Email: sales@homeu.ph', M, 39.5)

  // 2. Order details (Right block)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(...BRAND_GREEN)
  doc.text('ORDER DETAILS', PAGE_W - M, 20, { align: 'right' })
  
  doc.setDrawColor(...BRAND_GREEN)
  doc.setLineWidth(0.2)
  doc.rect(PAGE_W - M - 45, 23, 45, 8)
  
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...INK)
  doc.text(data.quotationNumber || `Q-${data.id}`, PAGE_W - M - 22.5, 28.5, { align: 'center' })
  
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.5)
  doc.text(`Date: ${createdDate}`, PAGE_W - M, 36, { align: 'right' })

  // 3. Intro sentence
  doc.setFontSize(7)
  doc.setTextColor(...INK)
  doc.text('Thank you for ordering your new beloved furnishing piece at Home Atelier. Below is detail of your order for confirmation.', M, 46)

  // 4. Client & Delivery side-by-side Info Box
  const infoY = 50
  const colW = CONTENT_W / 2
  
  // Header blocks
  doc.setFillColor(...BRAND_GREEN)
  doc.rect(M, infoY, colW, 5, 'F')
  doc.rect(M + colW, infoY, colW, 5, 'F')
  
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(6.5)
  doc.setTextColor(255, 255, 255)
  doc.text('CLIENT INFORMATION', M + 2, infoY + 3.8)
  doc.text('DELIVERY INFORMATION', M + colW + 2, infoY + 3.8)
  
  // Outer borders
  doc.setDrawColor(...GRAY_BORDER)
  doc.setLineWidth(0.15)
  doc.rect(M, infoY, CONTENT_W, 16)
  doc.line(M + colW, infoY, M + colW, infoY + 16)
  
  // Information Text content
  doc.setTextColor(...INK)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.text(clean(data.customerName || 'Client'), M + 2, infoY + 9.5)
  
  doc.setFont('helvetica', 'normal')
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
  let y = 73
  y = drawTableHeader(doc, y)

  for (const [index, item] of items.entries()) {
    const title = item.description
    const descLines = doc.splitTextToSize(title, TABLE_WIDTHS.desc - 4)
    
    // Process details list (materials, dimensions, color, etc.)
    const detailsArr = (item.details || []).map(clean).filter(Boolean)
    const detailLines: string[] = []
    for (const det of detailsArr) {
      detailLines.push(...doc.splitTextToSize(det, TABLE_WIDTHS.desc - 6))
    }

    const textH = (descLines.length + detailLines.length) * 3.5 + 4
    const rowH = Math.max(30, textH)

    // Check for page overflow
    if (y + rowH > 235) {
      drawFooter(doc)
      doc.addPage()
      y = M + 5
      y = drawTableHeader(doc, y)
    }

    drawTableRowGrid(doc, y, rowH)

    // A. Item Number
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(...INK)
    doc.text(String(item.itemNumber), TABLE_COLS.item + TABLE_WIDTHS.item / 2, y + rowH / 2, { align: 'center' })

    // B. Product Image Thumbnail
    const img = item.imageUrl
    if (img && img.startsWith('data:image/')) {
      try {
        const format = img.startsWith('data:image/png') ? 'PNG' : 'JPEG'
        doc.addImage(img, format, TABLE_COLS.image + 1.5, y + 2, 22, 26)
      } catch (err) {
        console.error('Error drawing image inside cell:', err)
        doc.setFontSize(5.5)
        doc.setTextColor(140, 140, 140)
        doc.text('[Image]', TABLE_COLS.image + TABLE_WIDTHS.image / 2, y + rowH / 2, { align: 'center' })
      }
    } else {
      doc.setFontSize(5.5)
      doc.setTextColor(140, 140, 140)
      doc.text('No Image', TABLE_COLS.image + TABLE_WIDTHS.image / 2, y + rowH / 2, { align: 'center' })
    }

    // C. Description & Specs
    doc.setTextColor(...INK)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    
    // Draw product title
    let ty = y + 4.5
    for (const line of descLines) {
      doc.text(line, TABLE_COLS.desc + 2, ty)
      ty += 3.5
    }

    // Draw details specs
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6)
    doc.setTextColor(100, 100, 100)
    for (const line of detailLines) {
      doc.text(line, TABLE_COLS.desc + 3, ty)
      ty += 3.2
    }

    // D. Qty, Unit Cost, Discounted Cost, Total (Currency Symbol Omitted)
    doc.setTextColor(...INK)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    
    doc.text(String(item.quantity), TABLE_COLS.qty + TABLE_WIDTHS.qty / 2, y + rowH / 2, { align: 'center' })
    doc.text(money(item.unitCost), TABLE_COLS.unit + TABLE_WIDTHS.unit - 2, y + rowH / 2, { align: 'right' })
    doc.text(money(item.discountedCost), TABLE_COLS.disc + TABLE_WIDTHS.disc - 2, y + rowH / 2, { align: 'right' })
    
    doc.setFont('helvetica', 'bold')
    doc.text(money(item.total), TABLE_COLS.total + TABLE_WIDTHS.total - 2, y + rowH / 2, { align: 'right' })

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
    drawFooter(doc)
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
  doc.setFillColor(...BRAND_GREEN)
  doc.rect(M, y, termsW, 4.5, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(6.5)
  doc.setTextColor(255, 255, 255)
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
    doc.setFont('helvetica', 'bold')
    doc.text(`${label.toUpperCase()}:`, M + 2, ty)
    doc.setFont('helvetica', 'normal')
    const wrapped = doc.splitTextToSize(clean(value), termsW - 27)
    doc.text(wrapped, M + 25, ty)
    ty += wrapped.length * 3.1 + 1.5
  }

  // Draw Totals Block (Right side)
  const totalsX = M + 120
  const totalsValueX = M + CONTENT_W - 2
  
  doc.setFontSize(7.5)
  doc.setTextColor(...INK)

  // Subtotal
  doc.setFont('helvetica', 'bold')
  doc.text('TOTAL AMOUNT:', totalsX, y + 4.5)
  doc.setFont('helvetica', 'normal')
  doc.text('PHP', totalsX + 28, y + 4.5)
  doc.text(money(data.subtotal), totalsValueX, y + 4.5, { align: 'right' })

  // Shipping Cost
  doc.setFont('helvetica', 'bold')
  doc.text('SHIPPING FEE:', totalsX, y + 11)
  doc.setFont('helvetica', 'normal')
  doc.text('PHP', totalsX + 28, y + 11)
  const shippingText = Number(data.shippingCost || 0) > 0 ? money(data.shippingCost) : 'TO FOLLOW'
  doc.text(shippingText, totalsValueX, y + 11, { align: 'right' })

  // Amount Due (Accent Gold / Grand Total)
  doc.setFillColor(...BRAND_GREEN)
  doc.rect(totalsX, y + 16, CONTENT_W - 120, 7.5, 'F')
  
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(255, 255, 255)
  doc.text('AMOUNT DUE:', totalsX + 2, y + 21.2)
  doc.text('PHP', totalsX + 28, y + 21.2)
  doc.text(money(grandTotal), totalsValueX, y + 21.2, { align: 'right' })

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
      drawFooter(doc)
      doc.addPage()
      y = M + 5
    }

    doc.setFillColor(248, 248, 248)
    doc.rect(M, y, CONTENT_W, blockH, 'F')
    doc.setDrawColor(...GRAY_BORDER)
    doc.rect(M, y, CONTENT_W, blockH)

    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...BRAND_GREEN)
    doc.text(label, M + 2.5, y + 4.5)

    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...INK)
    doc.setFontSize(6)
    doc.text(wrappedValue, M + 2.5, y + 8)

    y += blockH + 3
  }

  // 8. Signatures Block at bottom of last page
  if (y > 230) {
    drawFooter(doc)
    doc.addPage()
    y = M + 15
  } else {
    y = 245
  }

  drawSignatureBlock(doc, y)
  drawFooter(doc, true, data)

  return new Uint8Array(doc.output('arraybuffer'))
}
