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
const M = 18
const CONTENT_W = PAGE_W - M * 2
const INK = [38, 31, 22] as const
const RULE = [73, 59, 40] as const

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
  const lines = doc.splitTextToSize(clean(text), maxW)
  doc.text(lines, x, y)
  return y + lines.length * lineH
}

function sectionBar(doc: jsPDF, label: string, x: number, y: number, w: number, align: 'left' | 'center' = 'left') {
  doc.setFillColor(...RULE)
  doc.rect(x, y, w, 3.2, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(5.5)
  doc.text(label.toUpperCase(), align === 'center' ? x + w / 2 : x + 1.2, y + 2.35, { align })
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
  doc.rect(154, 25, 18, 5)
  doc.setFont('helvetica', 'normal')
  doc.text(data.quotationNumber || `Q-${data.id}`, 163, 28.2, { align: 'center' })
  doc.text(`Date: ${createdDate}`, 163, 34, { align: 'center' })

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
  const cols = {
    item: M,
    image: M + 6,
    desc: M + 47,
    qty: M + 106,
    unit: M + 125,
    disc: M + 142,
    total: M + 160,
  }
  const widths = {
    item: 6,
    image: 41,
    desc: 59,
    qty: 7,
    unit: 19,
    disc: 18,
    total: CONTENT_W - 150,
  }

  sectionBar(doc, 'Item #', cols.item, y, widths.item, 'center')
  sectionBar(doc, 'Image', cols.image, y, widths.image, 'center')
  sectionBar(doc, 'Description', cols.desc, y, widths.desc, 'center')
  sectionBar(doc, 'Qty', cols.qty, y, widths.qty, 'center')
  sectionBar(doc, 'Unit Cost', cols.unit, y, widths.unit, 'center')
  sectionBar(doc, 'Disc. Cost', cols.disc, y, widths.disc, 'center')
  sectionBar(doc, 'Total', cols.total, y, widths.total, 'center')
  y += 3.2

  for (const [index, item] of items.entries()) {
    const lines = [item.description, ...item.details].filter(Boolean)
    const descLines = doc.splitTextToSize(lines.join('\n'), widths.desc - 3)
    const rowH = Math.max(28, 6 + descLines.length * 3.3)

    if (y + rowH > 225) {
      doc.addPage()
      y = M
    }

    doc.setDrawColor(200, 200, 200)
    doc.rect(cols.item, y, CONTENT_W, rowH)
    doc.line(cols.image, y, cols.image, y + rowH)
    doc.line(cols.desc, y, cols.desc, y + rowH)
    doc.line(cols.qty, y, cols.qty, y + rowH)
    doc.line(cols.unit, y, cols.unit, y + rowH)
    doc.line(cols.disc, y, cols.disc, y + rowH)
    doc.line(cols.total, y, cols.total, y + rowH)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6)
    doc.setTextColor(...INK)
    doc.text(String(item.itemNumber), cols.item + widths.item / 2, y + rowH / 2, { align: 'center' })

    const img = imageData[index]
    if (img) {
      try {
        const format = img.startsWith('data:image/png') ? 'PNG' : 'JPEG'
        doc.addImage(img, format, cols.image + 10, y + 5, 20, 20)
      } catch {
        doc.setTextColor(140, 140, 140)
        doc.text('Image unavailable', cols.image + widths.image / 2, y + rowH / 2, { align: 'center' })
      }
    }

    doc.setTextColor(...INK)
    doc.setFont('helvetica', 'bold')
    doc.text(descLines.slice(0, 1), cols.desc + 2, y + 5)
    doc.setFont('helvetica', 'normal')
    if (descLines.length > 1) doc.text(descLines.slice(1), cols.desc + 2, y + 8.4)
    doc.text(String(item.quantity), cols.qty + widths.qty / 2, y + rowH / 2, { align: 'center' })
    doc.text(money(item.unitCost), cols.unit + widths.unit - 1.5, y + rowH / 2, { align: 'right' })
    doc.text(money(item.discountedCost), cols.disc + widths.disc - 1.5, y + rowH / 2, { align: 'right' })
    doc.text(money(item.total), cols.total + widths.total - 1.5, y + rowH / 2, { align: 'right' })
    y += rowH
  }

  if (items.length === 0) {
    doc.rect(M, y, CONTENT_W, 16)
    doc.setFontSize(6)
    doc.text('No items in this quotation.', M + CONTENT_W / 2, y + 9, { align: 'center' })
    y += 16
  }

  y += 3
  const termsX = M
  const termsW = 100
  const totalsX = M + 122
  sectionBar(doc, '', termsX, y, termsW)
  doc.setDrawColor(200, 200, 200)
  doc.rect(termsX, y, termsW, 31)
  doc.setTextColor(...INK)
  const termRows: LabeledText[] = [
    ['Delivery Leadtime', data.termsDeliveryLeadtime],
    ['Payment Terms', data.termsPaymentTerms],
    ['Warranty', data.termsWarranty],
    ['Bank Details', data.termsBankDetails],
  ].filter((row): row is LabeledText => clean(row[1]).length > 0)
  let ty = y + 7
  doc.setFontSize(5.7)
  for (const [label, value] of termRows.slice(0, 4)) {
    doc.setFont('helvetica', 'bold')
    doc.text(`${label.toUpperCase()}:`, termsX + 1.5, ty)
    doc.setFont('helvetica', 'normal')
    ty = textBlock(doc, clean(value), termsX + 26, ty, termsW - 28, 3.2)
    ty += 1.2
  }

  doc.setFontSize(5.8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(90, 20, 20)
  doc.text('TOTAL AMOUNT:', totalsX, y + 3)
  doc.text('PHP', totalsX + 27, y + 3)
  doc.text(money(data.subtotal), M + CONTENT_W - 1.5, y + 3, { align: 'right' })
  doc.text('SHIPPING FEE:', totalsX, y + 10)
  doc.text('PHP', totalsX + 27, y + 10)
  doc.text(Number(data.shippingCost || 0) > 0 ? money(data.shippingCost) : 'TO FOLLOW', M + CONTENT_W - 1.5, y + 10, { align: 'right' })
  doc.text('AMOUNT DUE:', totalsX, y + 20)
  doc.text('PHP', totalsX + 27, y + 20)
  doc.text(money(grandTotal), M + CONTENT_W - 1.5, y + 20, { align: 'right' })
  doc.setTextColor(...INK)

  y += 38
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
