'use client'

import { useState, useEffect } from 'react'

interface Reply {
  id: string
  body: string
  created_at: string
}

interface Review {
  id: string
  reviewer_name: string | null
  rating: number
  title: string | null
  body: string | null
  verified_purchase: boolean
  source: string
  review_date: string
  replies: Reply[] | null
}

function StarRow({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <span style={{ color: '#d9a04b', fontSize: size, letterSpacing: 1 }} aria-label={`${rating} out of 5 stars`}>
      {'★'.repeat(Math.round(rating))}{'☆'.repeat(5 - Math.round(rating))}
    </span>
  )
}

export default function ReviewsSection({ productId, productSlug, productTitle, productImage }: {
  productId: string
  productSlug: string
  productTitle: string
  productImage?: string
}) {
  const [reviews, setReviews] = useState<Review[]>([])
  const [reviewCount, setReviewCount] = useState(0)
  const [avgRating, setAvgRating] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/products/${productSlug}/reviews`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d) return
        setReviews(d.reviews || [])
        setReviewCount(d.reviewCount || 0)
        setAvgRating(d.avgRating || 0)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [productSlug])

  if (loading) return null
  if (reviewCount === 0) return null

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: productTitle,
    image: productImage,
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: avgRating,
      reviewCount,
    },
    review: reviews.slice(0, 10).map(r => ({
      '@type': 'Review',
      author: { '@type': 'Person', name: r.reviewer_name || 'Anonymous' },
      datePublished: r.review_date,
      reviewRating: { '@type': 'Rating', ratingValue: r.rating, bestRating: 5 },
      reviewBody: r.body || '',
      ...(r.title ? { name: r.title } : {}),
    })),
  }

  return (
    <section style={{ marginTop: 48, borderTop: '1px solid #e8ece8', paddingTop: 32 }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>Customer Reviews</h2>
        <StarRow rating={avgRating} size={18} />
        <span style={{ fontSize: 14, color: '#667168' }}>
          {avgRating.toFixed(1)} out of 5 · {reviewCount} review{reviewCount !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="review-card-list">
        {reviews.map(review => (
          <div key={review.id} className="review-card">
            {review.title && <h3 className="review-card__title">{review.title}</h3>}
            {review.body && <p className="review-card__body">&ldquo;{review.body}&rdquo;</p>}
            <div className="review-card__meta">{review.reviewer_name || 'Anonymous'}</div>

            {review.replies && review.replies.length > 0 && review.replies.map(reply => (
              <div key={reply.id} style={{ marginTop: 10, marginLeft: 20, padding: 12, background: '#f7f9f6', borderRadius: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#667168', marginBottom: 4 }}>Home Atelier Team</div>
                <div style={{ fontSize: 13, color: '#3a4540' }}>{reply.body}</div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </section>
  )
}
