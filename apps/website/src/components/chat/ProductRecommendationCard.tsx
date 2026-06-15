'use client'

export interface ProductRec {
  productId: string
  title: string
  url: string
  imageUrl?: string
  referencePrice?: number
  reason: string
  matchType: string
  confidence: number
}

interface ProductRecommendationCardProps {
  product: ProductRec
  onAddToRFQ: (product: ProductRec) => void
}

export function ProductRecommendationCard({ product, onAddToRFQ }: ProductRecommendationCardProps) {
  return (
    <div className="chat-product-card">
      {product.imageUrl && (
        <img
          src={product.imageUrl}
          alt={product.title}
          loading="lazy"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
        />
      )}
      <div className="chat-product-card-body">
        <h4 className="chat-product-card-title">{product.title}</h4>
        <p className="chat-product-card-reason">{product.reason}</p>
        {product.referencePrice ? (
          <p className="chat-product-card-price">
            ₱{product.referencePrice.toLocaleString('en-PH')}
          </p>
        ) : (
          <p className="chat-product-card-reason">Price by quotation</p>
        )}
      </div>
      <button
        className="chat-product-card-action"
        onClick={() => onAddToRFQ(product)}
      >
        Add to RFQ Cart
      </button>
    </div>
  )
}
