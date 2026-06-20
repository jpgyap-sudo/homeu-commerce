'use client'

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
  onAddToCart?: (productId: number | string) => void
  compact?: boolean
}

export default function RfqChatProductCard({
  product,
  showAddToCart,
  onAddToCart,
  compact,
}: RfqChatProductCardProps) {
  const productUrl = `/products/${product.slug || product.id}`

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
          {showAddToCart && onAddToCart && (
            <button
              onClick={(e) => { e.stopPropagation(); onAddToCart(product.id) }}
              style={{
                padding: '4px 12px',
                background: '#151a17',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              + Add to RFQ
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
