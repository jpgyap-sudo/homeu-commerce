import { jsPDF } from 'jspdf'

interface QuotationItem {
  title: string
  quantity: number
  unitPrice: number
  totalPrice: number
}

interface QuotationData {
  id: number
  title: string
  customerName: string
  customerEmail: string
  status: string
  items: QuotationItem[]
  subtotal: number
  tax: number
  total: number
  notes: string
  bankDetails: { accountName: string; accountNumber: string; bankName: string }
  terms: string
  warranty: string
  validUntil: string
  createdAt: string
}

export function generateQuotationPDF(data: QuotationData): Uint8Array {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageW = 210
  const margin = 20
  const contentW = pageW - margin * 2
  let y = margin

  // ── Header ──
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(22)
  doc.setTextColor(12, 21, 36) // navy
  doc.text('HOMEU.PH', margin, y)
  y += 8

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 100, 100)
  doc.text('Furniture & Home Collections', margin, y)
  doc.text('store.homeatelier.ph | sales@homeatelier.ph', margin, y + 5)
  y += 14

  // ── Divider ──
  doc.setDrawColor(201, 160, 80)
  doc.setLineWidth(0.5)
  doc.line(margin, y, pageW - margin, y)
  y += 8

  // ── Document Title ──
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(12, 21, 36)
  doc.text('QUOTATION', margin, y)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 100, 100)
  doc.text(`#${data.id} — ${data.status.toUpperCase()}`, pageW - margin, y, { align: 'right' })
  y += 10

  // ── Customer Info ──
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(30, 30, 30)
  doc.text(`Customer: ${data.customerName || '(No name)'}`, margin, y)
  doc.text(`Email: ${data.customerEmail || '—'}`, margin, y + 5)
  doc.text(`Date: ${new Date(data.createdAt).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}`, pageW - margin, y, { align: 'right' })
  if (data.validUntil) doc.text(`Valid Until: ${new Date(data.validUntil).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}`, pageW - margin, y + 5, { align: 'right' })
  y += 16

  // ── Items Table ──
  doc.setDrawColor(220, 220, 220)
  doc.setFillColor(245, 242, 237)
  doc.rect(margin, y, contentW, 8, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(60, 60, 60)
  doc.text('Item', margin + 4, y + 5.5)
  doc.text('Qty', margin + 100, y + 5.5, { align: 'center' })
  doc.text('Unit Price', margin + 120, y + 5.5, { align: 'right' })
  doc.text('Total', pageW - margin - 4, y + 5.5, { align: 'right' })
  y += 8

  data.items.forEach((item, i) => {
    const bg = i % 2 === 0 ? 255 : 250
    doc.setFillColor(bg, bg, bg)
    doc.rect(margin, y, contentW, 8, 'F')

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(30, 30, 30)
    doc.text(item.title || `Item ${i + 1}`, margin + 4, y + 5.5, { maxWidth: 92 })
    doc.text(String(item.quantity || 1), margin + 100, y + 5.5, { align: 'center' })
    doc.text(`₱${(item.unitPrice || 0).toLocaleString()}`, margin + 120, y + 5.5, { align: 'right' })
    doc.text(`₱${(item.totalPrice || 0).toLocaleString()}`, pageW - margin - 4, y + 5.5, { align: 'right' })
    y += 8
  })

  // ── Totals ──
  y += 4
  doc.setDrawColor(201, 160, 80)
  doc.line(margin + 100, y, pageW - margin, y)
  y += 5

  const addTotalLine = (label: string, amount: number, bold = false) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    doc.setFontSize(bold ? 11 : 9)
    doc.setTextColor(bold ? 12 : 80, bold ? 21 : 80, bold ? 36 : 80)
    doc.text(label, margin + 100, y, { align: 'right' })
    doc.text(`₱${amount.toLocaleString()}`, pageW - margin - 4, y, { align: 'right' })
    y += 6
  }
  addTotalLine('Subtotal:', data.subtotal)
  addTotalLine('Tax:', data.tax || 0)
  addTotalLine('Total:', data.total, true)

  // ── Bank Details ──
  if (data.bankDetails) {
    y += 8
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(12, 21, 36)
    doc.text('Payment Details', margin, y)
    y += 6
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(80, 80, 80)
    if (data.bankDetails.bankName) doc.text(`Bank: ${data.bankDetails.bankName}`, margin, y); y += 5
    if (data.bankDetails.accountName) doc.text(`Account Name: ${data.bankDetails.accountName}`, margin, y); y += 5
    if (data.bankDetails.accountNumber) doc.text(`Account Number: ${data.bankDetails.accountNumber}`, margin, y); y += 5
  }

  // ── Terms ──
  if (data.terms) {
    y += 8
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(12, 21, 36)
    doc.text('Terms & Conditions', margin, y)
    y += 5
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(100, 100, 100)
    const termsLines = doc.splitTextToSize(data.terms, contentW)
    doc.text(termsLines, margin, y)
    y += termsLines.length * 4 + 4
  }

  // ── Warranty ──
  if (data.warranty) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(12, 21, 36)
    doc.text('Warranty', margin, y)
    y += 5
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(100, 100, 100)
    const warrantyLines = doc.splitTextToSize(data.warranty, contentW)
    doc.text(warrantyLines, margin, y)
    y += warrantyLines.length * 4 + 4
  }

  // ── Footer ──
  y = 275 // bottom of A4
  doc.setDrawColor(200, 200, 200)
  doc.line(margin, y, pageW - margin, y)
  y += 5
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(150, 150, 150)
  doc.text('Thank you for choosing HomeU.ph — Luxury Furniture & Home Collections', pageW / 2, y, { align: 'center' })
  doc.text(`Generated ${new Date().toLocaleDateString('en-PH')} by DaVinciOS Command Center`, pageW / 2, y + 4, { align: 'center' })

  return new Uint8Array(doc.output('arraybuffer'))
}
