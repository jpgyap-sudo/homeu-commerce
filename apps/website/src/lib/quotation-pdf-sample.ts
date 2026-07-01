import type { QuotationData } from './generate-quotation-pdf'

/** Fixture used by the Quotation Theme Builder's live PDF preview and
 *  "send test" email — never a real quotation. */
export const SAMPLE_QUOTATION: QuotationData = {
  id: 0,
  quotationNumber: 'Q-2026-0000',
  customerName: 'Maria Santos',
  customerEmail: 'maria@example.com',
  phone: '+63 917 000 0000',
  deliveryLocation: 'Unit 12B, One Palm Residences, McKinley Hill, Taguig City',
  items: [
    { itemNumber: 1, description: 'Aalto Modern Sofa', material: 'Solid wood, linen blend', dimensions: '220 x 92 x 78 cm', quantity: 1, unitCost: 128184, total: 128184 },
    { itemNumber: 2, description: 'Augustin Pouf', material: 'Boucle fabric', quantity: 2, unitCost: 16000, total: 32000 },
    { itemNumber: 3, description: 'Delivery and handling', quantity: 1, unitCost: 6500, total: 6500 },
  ],
  subtotal: 166684,
  shippingCost: 0,
  total: 166684,
  grandTotal: 166684,
  createdAt: new Date().toISOString(),
}
