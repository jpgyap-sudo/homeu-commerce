'use client'

import { useEffect, useState } from 'react'
import { addToQuoteCart, getQuoteCart, syncCartToServer } from '@/components/QuoteCart'

interface ProductCardData {
  id: number | string
  title: string
  price: number
  imageUrl?: string | null
  slug?: string
  categoryTitle?: string | null
}

interface RfqChatProductCardProps {
  product: ProductCardData
  showAddToCart?: boolean
  onAddToCart?: (product: ProductCardData) => void | Promise<void>
  onAskQuestion?: (product: ProductCardData, question: string) => void
  addMode?: 'local-cart' | 'server-rfq'
  compact?: boolean
}

export default function RfqChatProductCard({
  product,
  showAddToCart,
  onAddToCart,
  onAskQuestion,
  addMode = 'server-rfq',
  compact,
}: RfqChatProductCardProps) {
  const productUrl = `/products/${product.slug || product.id}`
  const [inCart, setInCart] = useState(false)
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    if (addMode !== 'local-cart') return
    const sync = () => setInCart(getQuoteCart().some(item => item.productId === String(product.id)))
    sync()
    window.addEventListener('homeu_quote_cart_changed', sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener('homeu_quote_cart_changed', sync)
      window.removeEventListener('storage', sync)
    }
  }, [addMode, product.id])

  async function handleAdd() {
    if (adding) return
    setAdding(true)
    try {
      if (onAddToCart) {
        await onAddToCart(product)
      } else if (addMode === 'local-cart') {
        addToQuoteCart({
          productId: String(product.id),
          title: product.title,
          price: product.price || undefined,
          quantity: 1,
          imageUrl: product.imageUrl || undefined,
          slug: product.slug,
          notes: `Added from RFQ chat${product.categoryTitle ? ` - ${product.categoryTitle}` : ''}`,
        })
        setInCart(true)
        syncCartToServer().catch(() => {})
      }
    } finally {
      setAdding(false)
    }
  }

  if (compact) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '6px 0',
      }}>
        <div style={{
          width: 36,
          height: 36,
          borderRadius: 6,
          background: '#f0f0f0',
          overflow: 'hidden',
          flexShrink: 0,
        }}>
          {product.imageUrl ? (
            <img src={product.imageUrl} alt={product.title}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: 16 }}>
              🪑
            </div>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#222', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {product.title}
          </div>
          <div style={{ fontSize: 12, color: '#666' }}>
            ₱{(product.price || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
            {product.categoryTitle && ` · ${product.categoryTitle}`}
          </div>
        </div>
        <a
          href={productUrl}
          target="_blank"
          style={{
            fontSize: 11,
            color: '#0066cc',
            textDecoration: 'none',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          View →
        </a>
      </div>
    )
  }

  return (
    <div style={{
      display: 'flex',
      gap: 12,
      padding: 12,
      background: '#fff',
      border: '1px solid #e0e0e0',
      borderRadius: 10,
      marginTop: 6,
    }}>
      {/* Image */}
      <div style={{
        width: 80,
        height: 80,
        borderRadius: 8,
        background: '#f5f5f5',
        overflow: 'hidden',
        flexShrink: 0,
      }}>
        {product.imageUrl ? (
          <img src={product.imageUrl} alt={product.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            fontSize: 28,
          }}>
            🪑
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#222' }}>
          {product.title}
        </div>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#151a17' }}>
          ₱{(product.price || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
        </div>
        {product.categoryTitle && (
          <div style={{ fontSize: 12, color: '#888' }}>
            {product.categoryTitle}
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <a
            href={productUrl}
            target="_blank"
            style={{
              padding: '4px 12px',
              background: '#f5f5f5',
              color: '#222',
              borderRadius: 6,
              fontSize: 12,
              textDecoration: 'none',
              fontWeight: 500,
            }}
          >
            🔗 View Product
          </a>
          {showAddToCart && addMode === 'local-cart' && inCart ? (
            <a
              href="/quote-cart"
              style={{
                padding: '4px 12px',
                background: '#e8f2ec',
                color: '#1a6d3e',
                border: '1px solid #b7d4c2',
                borderRadius: 6,
                fontSize: 12,
                textDecoration: 'none',
                fontWeight: 700,
              }}
            >
              View RFQ Cart
            </a>
          ) : showAddToCart && (
            <button
              onClick={(e) => { e.stopPropagation(); handleAdd() }}
              disabled={adding}
              style={{
                padding: '4px 12px',
                background: '#151a17',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 500,
                cursor: adding ? 'wait' : 'pointer',
                opacity: adding ? 0.75 : 1,
              }}
            >
              {adding ? 'Adding...' : '+ Add to RFQ'}
            </button>
          )}
        </div>
        {onAskQuestion && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
            {[
              { label: 'Ask lead time', text: `What is the lead time for ${product.title}?` },
              { label: 'Ask details', text: `Can you confirm dimensions and finishes for ${product.title}?` },
            ].map(action => (
              <button
                key={action.label}
                onClick={() => onAskQuestion(product, action.text)}
                style={{
                  padding: '4px 9px',
                  border: '1px solid #e2e6df',
                  background: '#fafafa',
                  color: '#555',
                  borderRadius: 999,
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
