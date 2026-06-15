'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface RFQItem {
  productId: string
  title: string
  price?: number
  quantity: number
}

interface RFQCartDrawerProps {
  isOpen: boolean
  onClose: () => void
}

// Load items from localStorage (shared with QuoteCart)
function getCartItems(): RFQItem[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem('homeu_quote_cart')
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.map((item: any) => ({
      productId: item.productId,
      title: item.title,
      price: item.price,
      quantity: Math.max(1, Math.min(999, Math.floor(Number(item.quantity) || 1))),
    }))
  } catch {
    return []
  }
}

export function RFQCartDrawer({ isOpen, onClose }: RFQCartDrawerProps) {
  const router = useRouter()
  const [items, setItems] = useState<RFQItem[]>([])

  useEffect(() => {
    if (isOpen) setItems(getCartItems())
  }, [isOpen])

  function goToRFQPage() {
    onClose()
    router.push('/quote-cart')
  }

  if (!isOpen) return null

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0)
  const estimatedTotal = items.reduce((sum, i) => sum + (i.price || 0) * i.quantity, 0)

  return (
    <>
      <div className="chat-rfq-drawer-overlay" onClick={onClose} />
      <div className="chat-rfq-drawer">
        <div className="chat-rfq-drawer-header">
          <h3>RFQ Cart ({totalItems} {totalItems === 1 ? 'item' : 'items'})</h3>
          <button className="chat-rfq-drawer-close" onClick={onClose}>✕</button>
        </div>

        <div className="chat-rfq-drawer-items">
          {items.length === 0 ? (
            <div className="chat-rfq-drawer-empty">
              Your RFQ cart is empty. Browse products and add items you're interested in.
            </div>
          ) : (
            items.map(item => (
              <div className="chat-rfq-drawer-item" key={item.productId}>
                <div className="chat-rfq-drawer-item-info">
                  <p className="chat-rfq-drawer-item-title">{item.title}</p>
                  <p className="chat-rfq-drawer-item-qty">
                    Qty: {item.quantity}
                    {item.price ? ` × ₱${item.price.toLocaleString('en-PH')}` : ''}
                  </p>
                </div>
                <strong>
                  {item.price
                    ? `₱${(item.price * item.quantity).toLocaleString('en-PH')}`
                    : '—'}
                </strong>
              </div>
            ))
          )}
        </div>

        {items.length > 0 && (
          <div className="chat-rfq-drawer-footer">
            {estimatedTotal > 0 && (
              <p style={{ fontSize: 13, color: '#67706a', margin: '0 0 10px', textAlign: 'center' }}>
                Estimated total: ₱{estimatedTotal.toLocaleString('en-PH')}
              </p>
            )}
            <button className="chat-rfq-drawer-submit" onClick={goToRFQPage}>
              Review & Submit RFQ
            </button>
          </div>
        )}
      </div>
    </>
  )
}
