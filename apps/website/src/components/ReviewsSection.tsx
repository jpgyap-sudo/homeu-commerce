'use client'

import { useState, useEffect } from 'react'
import ReviewsCarousel from '@/components/ReviewsCarousel'

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
    <section style={{ marginTop: 48 }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <ReviewsCarousel
        heading="Let Customers Speak For Us"
        avgRating={avgRating}
        reviewCount={reviewCount}
        reviews={reviews}
      />

      {reviews.some(r => r.replies && r.replies.length > 0) && (
        <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {reviews.filter(r => r.replies && r.replies.length > 0).map(review => (
            review.replies!.map(reply => (
              <div key={reply.id} style={{ padding: 12, background: '#f7f9f6', borderRadius: 8, fontSize: 13 }}>
                <div style={{ fontWeight: 700, color: '#667168', marginBottom: 4 }}>
                  Home Atelier Team replied to {review.reviewer_name || 'Anonymous'}
                </div>
                <div style={{ color: '#3a4540' }}>{reply.body}</div>
              </div>
            ))
          ))}
        </div>
      )}
    </section>
  )
}
