import { jsPDF } from 'jspdf'

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

type LabeledText = [string, string]

const PAGE_W = 210
const M = 12
const CONTENT_W = PAGE_W - M * 2
const INK = [38, 31, 22] as const
const RULE = [73, 59, 40] as const
const BANK_DETAILS = [
  'Bank Name: EASTWEST BANK',
  'Account Name: LUMITEC LIGHTING SPECIALIST INC',
  'Account Number: 200012649842',
].join('\n')

const TABLE_WIDTHS = {
  item: 7,
  image: 42,
  desc: 65,
  qty: 12,
  unit: 22,
  disc: 22,
  total: 16,
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

async function imageToDataUrl(src?: string): Promise<string | null> {
  if (!src) return null
  if (src.startsWith('data:image/')) return src
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 4000)
    const res = await fetch(src, { signal: controller.signal })
    clearTimeout(timeout)
    if (!res.ok) return null
    const contentType = res.headers.get('content-type') || 'image/jpeg'
    if (!contentType.startsWith('image/')) return null
    const bytes = Buffer.from(await res.arrayBuffer())
    return `data:${contentType};base64,${bytes.toString('base64')}`
  } catch {
    return null
  }
}

function textBlock(doc: jsPDF, text: string, x: number, y: number, maxW: number, lineH: number) {
  const sourceLines = String(text || '')
    .replace(/<[^>]+>/g, ' ')
    .split(/\r?\n/)
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .filter(Boolean)
  const lines = sourceLines.length > 0
    ? sourceLines.flatMap((line) => doc.splitTextToSize(line, maxW))
    : doc.splitTextToSize(clean(text), maxW)
  doc.text(lines, x, y)
  return y + lines.length * lineH
}

function wrappedLineCount(doc: jsPDF, text: string, maxW: number): number {
  const sourceLines = String(text || '')
    .replace(/<[^>]+>/g, ' ')
    .split(/\r?\n/)
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .filter(Boolean)
  if (sourceLines.length === 0) return doc.splitTextToSize(clean(text), maxW).length
  return sourceLines.reduce((sum, line) => sum + doc.splitTextToSize(line, maxW).length, 0)
}

function sectionBar(doc: jsPDF, label: string, x: number, y: number, w: number, align: 'left' | 'center' = 'left') {
  doc.setFillColor(...RULE)
  doc.rect(x, y, w, 3.2, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(5.5)
  doc.text(label.toUpperCase(), align === 'center' ? x + w / 2 : x + 1.2, y + 2.35, { align })
}

function drawTableHeader(doc: jsPDF, y: number) {
  sectionBar(doc, 'Item #', TABLE_COLS.item, y, TABLE_WIDTHS.item, 'center')
  sectionBar(doc, 'Image', TABLE_COLS.image, y, TABLE_WIDTHS.image, 'center')
  sectionBar(doc, 'Description', TABLE_COLS.desc, y, TABLE_WIDTHS.desc, 'center')
  sectionBar(doc, 'Qty', TABLE_COLS.qty, y, TABLE_WIDTHS.qty, 'center')
  sectionBar(doc, 'Unit Cost', TABLE_COLS.unit, y, TABLE_WIDTHS.unit, 'center')
  sectionBar(doc, 'Disc. Cost', TABLE_COLS.disc, y, TABLE_WIDTHS.disc, 'center')
  sectionBar(doc, 'Total', TABLE_COLS.total, y, TABLE_WIDTHS.total, 'center')
  return y + 3.2
}

function drawTableRowGrid(doc: jsPDF, y: number, rowH: number) {
  doc.setDrawColor(200, 200, 200)
  doc.setLineWidth(0.15)
  doc.rect(M, y, CONTENT_W, rowH)
  doc.line(TABLE_COLS.image, y, TABLE_COLS.image, y + rowH)
  doc.line(TABLE_COLS.desc, y, TABLE_COLS.desc, y + rowH)
  doc.line(TABLE_COLS.qty, y, TABLE_COLS.qty, y + rowH)
  doc.line(TABLE_COLS.unit, y, TABLE_COLS.unit, y + rowH)
  doc.line(TABLE_COLS.disc, y, TABLE_COLS.disc, y + rowH)
  doc.line(TABLE_COLS.total, y, TABLE_COLS.total, y + rowH)
}

function footer(doc: jsPDF, data: QuotationData) {
  const date = plainDate(data.createdAt) || plainDate(new Date().toISOString())
  doc.setDrawColor(...RULE)
  doc.setLineWidth(0.15)
  doc.line(66, 247, 112, 247)
  doc.line(151, 247, 168, 247)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(5.4)
  doc.setTextColor(...INK)
  doc.text(clean(data.customerName || 'Client').toUpperCase(), 89, 245.8, { align: 'center' })
  doc.text(date, 159.5, 245.8, { align: 'center' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(4.7)
  doc.text('Authorized by', 89, 249.5, { align: 'center' })
  doc.text('Date', 159.5, 249.5, { align: 'center' })
  doc.text('If you have any questions about this quotation, please contact sales@homeu.ph', 66, 260)
}

export async function generateQuotationPDF(data: QuotationData): Promise<Uint8Array> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true })
  const items = (data.items || []).map(normalizeItem)
  const imageData = await Promise.all(items.map((item) => imageToDataUrl(item.imageUrl)))
  const grandTotal = Number(data.grandTotal ?? data.total ?? data.subtotal + Number(data.shippingCost || 0))
  const createdDate = plainDate(data.createdAt) || plainDate(new Date().toISOString())

  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...INK)
  doc.setFont('times', 'bold')
  doc.setFontSize(12)
  doc.text('Home Atelier', M, 24)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(4.7)
  doc.text('MODERN LIVING', M + 11.5, 27.5)
  doc.setFontSize(5.8)
  doc.text('Phone: +63 2 8703 1996', M, 34)
  doc.text('Email: sales@homeu.ph', M, 37)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(5.5)
  doc.text('ORDER DETAILS', 160, 24, { align: 'center' })
  doc.setDrawColor(...RULE)
  doc.setLineWidth(0.2)
  doc.rect(154, 25, 22, 5)
  doc.setFont('helvetica', 'normal')
  doc.text(data.quotationNumber || `Q-${data.id}`, 165, 28.2, { align: 'center' })
  doc.text(`Date: ${createdDate}`, 165, 34, { align: 'center' })

  doc.setFontSize(5.6)
  doc.text('Thank you for ordering your new beloved furnishing piece at Home Atelier. Below is detail of your order for confirmation.', M, 43)

  const infoY = 47
  sectionBar(doc, 'Client Information', M, infoY, CONTENT_W / 2)
  sectionBar(doc, 'Delivery Information', M + CONTENT_W / 2, infoY, CONTENT_W / 2)
  doc.setDrawColor(200, 200, 200)
  doc.rect(M, infoY, CONTENT_W, 12)
  doc.line(M + CONTENT_W / 2, infoY, M + CONTENT_W / 2, infoY + 12)
  doc.setTextColor(...INK)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(5.8)
  doc.text(clean(data.customerName || 'Client'), M + 1.5, infoY + 7)
  doc.setFont('helvetica', 'normal')
  if (data.phone) doc.text(clean(data.phone), M + 1.5, infoY + 10)
  doc.text(clean(data.deliveryLocation || '56 Valencia QC'), M + CONTENT_W / 2 + 1.5, infoY + 7)

  let y = 66
  y = drawTableHeader(doc, y)

  for (const [index, item] of items.entries()) {
    const lines = [item.description, ...item.details].filter(Boolean)
    const descLines = doc.splitTextToSize(lines.join('\n'), TABLE_WIDTHS.desc - 4)
    const rowH = Math.max(30, 7 + descLines.length * 3.2)

    if (y + rowH > 218) {
      doc.addPage()
      y = M
      y = drawTableHeader(doc, y)
    }

    drawTableRowGrid(doc, y, rowH)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6)
    doc.setTextColor(...INK)
    doc.text(String(item.itemNumber), TABLE_COLS.item + TABLE_WIDTHS.item / 2, y + rowH / 2, { align: 'center' })

    const img = imageData[index]
    if (img) {
      try {
        const format = img.startsWith('data:image/png') ? 'PNG' : 'JPEG'
        doc.addImage(img, format, TABLE_COLS.image + 9, y + 5, 24, Math.min(22, rowH - 8))
      } catch {
        doc.setTextColor(140, 140, 140)
        doc.text('Image unavailable', TABLE_COLS.image + TABLE_WIDTHS.image / 2, y + rowH / 2, { align: 'center' })
      }
    }

    doc.setTextColor(...INK)
    doc.setFont('helvetica', 'bold')
    doc.text(descLines.slice(0, 1), TABLE_COLS.desc + 2, y + 6)
    doc.setFont('helvetica', 'normal')
    if (descLines.length > 1) doc.text(descLines.slice(1), TABLE_COLS.desc + 2, y + 9.3)
    doc.text(String(item.quantity), TABLE_COLS.qty + TABLE_WIDTHS.qty / 2, y + rowH / 2, { align: 'center' })
    doc.text(money(item.unitCost), TABLE_COLS.unit + TABLE_WIDTHS.unit - 1.5, y + rowH / 2, { align: 'right' })
    doc.text(money(item.discountedCost), TABLE_COLS.disc + TABLE_WIDTHS.disc - 1.5, y + rowH / 2, { align: 'right' })
    doc.text(money(item.total), TABLE_COLS.total + TABLE_WIDTHS.total - 1.5, y + rowH / 2, { align: 'right' })
    y += rowH
  }

  if (items.length === 0) {
    doc.rect(M, y, CONTENT_W, 16)
    doc.setFontSize(6)
    doc.text('No items in this quotation.', M + CONTENT_W / 2, y + 9, { align: 'center' })
    y += 16
  }

  y += 3
  if (y > 198) {
    doc.addPage()
    y = M
  }
  const termsX = M
  const termsW = 112
  const totalsX = M + 128
  const totalsValueX = M + CONTENT_W - 1.5
  const termRows: LabeledText[] = [
    ['Delivery Leadtime', data.termsDeliveryLeadtime || 'Please allow 2-4 weeks for manufacturing and delivery depending on availability.'],
    ['Payment Terms', data.termsPaymentTerms || '50% down payment upon order confirmation. Remaining 50% due before delivery.'],
    ['Warranty', data.termsWarranty || 'All furniture pieces come with a standard manufacturer warranty covering manufacturing defects.'],
    ['Bank Details', BANK_DETAILS],
  ]
  const termLineCounts = termRows.map(([, value]) => wrappedLineCount(doc, value, termsW - 33))
  const termsH = Math.max(38, 8 + termLineCounts.reduce((sum, count) => sum + count * 3 + 2.2, 0))

  sectionBar(doc, '', termsX, y, termsW)
  doc.setDrawColor(200, 200, 200)
  doc.rect(termsX, y, termsW, termsH)
  doc.setTextColor(...INK)
  let ty = y + 7
  doc.setFontSize(5.7)
  for (const [label, value] of termRows) {
    doc.setFont('helvetica', 'bold')
    doc.text(`${label.toUpperCase()}:`, termsX + 1.5, ty)
    doc.setFont('helvetica', 'normal')
    ty = textBlock(doc, clean(value), termsX + 31, ty, termsW - 33, 3)
    ty += 1.2
  }

  doc.setFontSize(5.8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(90, 20, 20)
  doc.text('TOTAL AMOUNT:', totalsX, y + 3)
  doc.text('PHP', totalsX + 27, y + 3)
  doc.text(money(data.subtotal), totalsValueX, y + 3, { align: 'right' })
  doc.text('SHIPPING FEE:', totalsX, y + 10)
  doc.text('PHP', totalsX + 27, y + 10)
  doc.text(Number(data.shippingCost || 0) > 0 ? money(data.shippingCost) : 'TO FOLLOW', totalsValueX, y + 10, { align: 'right' })
  doc.text('AMOUNT DUE:', totalsX, y + 20)
  doc.text('PHP', totalsX + 27, y + 20)
  doc.text(money(grandTotal), totalsValueX, y + 20, { align: 'right' })
  doc.setTextColor(...INK)

  y += Math.max(termsH + 8, 40)
  const policyBlocks: LabeledText[] = [
    ['Cancellation', data.termsCancellationPolicy],
    ['Return', data.termsReturnPolicy],
    ['Rejection of Items', data.termsRejectionOfItems],
    ['Refund Policy', data.termsRefundPolicy],
  ].filter((row): row is LabeledText => clean(row[1]).length > 0)

  doc.setFontSize(5.5)
  for (const [label, value] of policyBlocks) {
    if (y > 225) {
      footer(doc, data)
      doc.addPage()
      y = M
    }
    doc.setFont('helvetica', 'bold')
    doc.text(label, M, y)
    y += 3.2
    doc.setFont('helvetica', 'normal')
    y = textBlock(doc, clean(value), M, y, CONTENT_W, 3.1) + 2.4
  }

  footer(doc, data)
  return new Uint8Array(doc.output('arraybuffer'))
}
