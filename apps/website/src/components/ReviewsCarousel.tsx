'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export interface CarouselReview {
  id: string
  reviewer_name: string | null
  rating: number
  title: string | null
  body: string | null
  product_title?: string | null
  product_slug?: string | null
  product_image?: string | null
}

function Stars({ rating, size = 16 }: { rating: number; size?: number }) {
  return (
    <div className="reviews-carousel__stars" style={{ fontSize: size }} aria-label={`${rating} out of 5 stars`}>
      {'★'.repeat(Math.round(rating))}{'☆'.repeat(5 - Math.round(rating))}
    </div>
  )
}

/** Carousel clone of the original homeu.ph "Let Customers Speak For Us"
 * review widget — overall rating header, then a 3-up (1-up on mobile)
 * carousel of cards with per-review stars, title, truncated body,
 * reviewer name, and a small product thumbnail linking to that product. */
export default function ReviewsCarousel({
  reviews, avgRating, reviewCount, heading = 'Let Customers Speak For Us',
  columns = 3, autoScroll = true, scrollInterval = 2,
}: {
  reviews: CarouselReview[]
  avgRating: number
  reviewCount: number
  heading?: string
  /** Admin-controlled "Review Columns" setting (1-5). */
  columns?: number
  /** Admin-controlled "Auto Scroll" toggle. */
  autoScroll?: boolean
  /** Admin-controlled "Scroll Interval" in seconds. */
  scrollInterval?: number
}) {
  const perView = Math.max(1, Math.min(5, columns))
  const [index, setIndex] = useState(0)
  const maxIndex = Math.max(0, reviews.length - perView)

  if (reviews.length === 0) return null

  function prev() { setIndex(i => (i === 0 ? maxIndex : Math.max(0, i - perView))) }
  function next() { setIndex(i => (i >= maxIndex ? 0 : Math.min(maxIndex, i + perView))) }

  useEffect(() => {
    if (!autoScroll || maxIndex === 0) return
    const id = setInterval(next, Math.max(1, scrollInterval) * 1000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoScroll, scrollInterval, maxIndex])

  const visible = reviews.slice(index, index + perView)

  return (
    <div className="reviews-carousel">
      <div className="reviews-carousel__header">
        <h2 className="reviews-carousel__heading">{heading}</h2>
        <Stars rating={avgRating} size={22} />
        <p className="reviews-carousel__count">from {reviewCount} review{reviewCount !== 1 ? 's' : ''}</p>
      </div>

      <div className="reviews-carousel__track">
        {reviews.length > perView && (
          <button className="reviews-carousel__arrow reviews-carousel__arrow--prev" onClick={prev} aria-label="Previous reviews">
            &#8249;
          </button>
        )}

        <div className="reviews-carousel__cards" style={{ gridTemplateColumns: `repeat(${perView}, 1fr)` }}>
          {visible.map(r => {
            const card = (
              <div className="reviews-carousel__card" key={r.id}>
                <Stars rating={r.rating} />
                {r.title && <h3 className="reviews-carousel__title">{r.title}</h3>}
                {r.body && <p className="reviews-carousel__body">{r.body}</p>}
                <div className="reviews-carousel__name">{r.reviewer_name || 'Anonymous'}</div>
                {r.product_image && (
                  <div className="reviews-carousel__thumb">
                    <img src={r.product_image} alt={r.product_title || ''} loading="lazy" />
                  </div>
                )}
              </div>
            )
            return r.product_slug ? (
              <Link href={`/products/${r.product_slug}`} key={r.id} className="reviews-carousel__card-link">
                {card}
              </Link>
            ) : card
          })}
        </div>

        {reviews.length > perView && (
          <button className="reviews-carousel__arrow reviews-carousel__arrow--next" onClick={next} aria-label="More reviews">
            &#8250;
          </button>
        )}
      </div>
    </div>
  )
}
