'use client'

import { useState, useEffect, useMemo } from 'react'

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
  photos: string[] | null
}

type SortMode = 'recent' | 'highest' | 'lowest'

function Stars({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <span style={{ color: '#1a1a1a', fontSize: size, letterSpacing: 2 }} aria-label={`${rating} out of 5 stars`}>
      {'★'.repeat(Math.round(rating))}{'☆'.repeat(5 - Math.round(rating))}
    </span>
  )
}

function formatDate(d: string): string {
  const date = new Date(d)
  if (isNaN(date.getTime())) return ''
  return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
}

/** Clone of the original homeu.ph "CUSTOMER REVIEWS" widget: overall
 * rating + rating breakdown bars, sort control, write-a-review button,
 * then a flat list of reviews (avatar initial, stars + date, name,
 * title, body) — separated by rules, not cards. */
export default function ReviewsSection({ productId, productSlug, productTitle, productImage }: {
  productId: string
  productSlug: string
  productTitle: string
  productImage?: string
}) {
  const [reviews, setReviews] = useState<Review[]>([])
  const [reviewCount, setReviewCount] = useState(0)
  const [avgRating, setAvgRating] = useState(0)
  const [breakdown, setBreakdown] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [sort, setSort] = useState<SortMode>('recent')
  const [showForm, setShowForm] = useState(false)

  function load() {
    fetch(`/api/products/${productSlug}/reviews`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d) return
        setReviews(d.reviews || [])
        setReviewCount(d.reviewCount || 0)
        setAvgRating(d.avgRating || 0)
        setBreakdown(d.breakdown || {})
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(load, [productSlug])

  const sortedReviews = useMemo(() => {
    const arr = [...reviews]
    if (sort === 'highest') arr.sort((a, b) => b.rating - a.rating)
    else if (sort === 'lowest') arr.sort((a, b) => a.rating - b.rating)
    else arr.sort((a, b) => new Date(b.review_date).getTime() - new Date(a.review_date).getTime())
    return arr
  }, [reviews, sort])

  if (loading) return null

  const jsonLd = reviewCount > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: productTitle,
    image: productImage,
    aggregateRating: { '@type': 'AggregateRating', ratingValue: avgRating, reviewCount },
    review: reviews.slice(0, 10).map(r => ({
      '@type': 'Review',
      author: { '@type': 'Person', name: r.reviewer_name || 'Anonymous' },
      datePublished: r.review_date,
      reviewRating: { '@type': 'Rating', ratingValue: r.rating, bestRating: 5 },
      reviewBody: r.body || '',
      ...(r.title ? { name: r.title } : {}),
    })),
  } : null

  return (
    <section style={{ marginTop: 48, borderTop: '1px solid #e8ece8', paddingTop: 32 }}>
      {jsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 20 }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Customer Reviews
        </h2>
        <button onClick={() => setShowForm(true)} style={{
          padding: '10px 20px', background: '#fff', color: '#151a17', border: '1.5px solid #151a17',
          borderRadius: 0, fontSize: 13, fontWeight: 600, cursor: 'pointer',
        }}>
          Write a review
        </button>
      </div>

      <div style={{ display: 'flex', gap: 48, marginTop: 20, flexWrap: 'wrap' }}>
        <div>
          <Stars rating={avgRating} size={20} />
          <div style={{ fontSize: 13, color: '#667168', marginTop: 4 }}>
            {reviewCount > 0 ? `Based on ${reviewCount} review${reviewCount !== 1 ? 's' : ''}` : 'Be the first to write a review'}
          </div>
        </div>

        {reviewCount > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 220 }}>
            {[5, 4, 3, 2, 1].map(star => {
              const count = breakdown[String(star)] || 0
              const pct = reviewCount > 0 ? Math.round((count / reviewCount) * 100) : 0
              return (
                <div key={star} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                  <span style={{ color: '#1a1a1a', width: 70 }}>{'★'.repeat(star)}{'☆'.repeat(5 - star)}</span>
                  <div style={{ flex: 1, height: 8, background: '#eee', borderRadius: 4, overflow: 'hidden', minWidth: 100 }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: '#e0b84b' }} />
                  </div>
                  <span style={{ color: '#667168', width: 70 }}>{pct}% ({count})</span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {reviewCount > 0 && (
        <div style={{ marginTop: 24 }}>
          <select value={sort} onChange={e => setSort(e.target.value as SortMode)} style={{
            padding: '8px 12px', border: '1.5px solid #d9e0d7', borderRadius: 6, fontSize: 13,
          }}>
            <option value="recent">Most Recent</option>
            <option value="highest">Highest Rating</option>
            <option value="lowest">Lowest Rating</option>
          </select>
        </div>
      )}

      <div style={{ marginTop: 16 }}>
        {sortedReviews.map(review => (
          <div key={review.id} style={{ display: 'flex', gap: 16, padding: '20px 0', borderTop: '1px solid #f0f2ef' }}>
            <div style={{
              width: 44, height: 44, borderRadius: '50%', background: '#eef1ed', color: '#667168',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700,
              fontSize: 16, flexShrink: 0,
            }}>
              {(review.reviewer_name || 'A').charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <Stars rating={review.rating} />
                <span style={{ fontSize: 12, color: '#9aa69c' }}>{formatDate(review.review_date)}</span>
              </div>
              <div style={{ fontWeight: 600, fontSize: 14, marginTop: 6 }}>{review.reviewer_name || 'Anonymous'}</div>
              {review.title && <div style={{ fontWeight: 600, fontSize: 15, marginTop: 4 }}>{review.title}</div>}
              {review.body && <div style={{ fontSize: 14, color: '#3a4540', marginTop: 4, lineHeight: 1.6 }}>{review.body}</div>}
              {/* Review photos */}
              {review.photos && review.photos.length > 0 && (
                <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                  {review.photos.map((url: string, i: number) => (
                    <img key={i} src={url} alt={`Review photo ${i + 1}`} style={{
                      width: 72, height: 72, borderRadius: 6, objectFit: 'cover',
                      border: '1px solid #e3e8e0', cursor: 'pointer',
                    }} onClick={() => window.open(url, '_blank')} />
                  ))}
                </div>
              )}

              {review.replies && review.replies.length > 0 && review.replies.map(reply => (
                <div key={reply.id} style={{ marginTop: 10, padding: 12, background: '#f7f9f6', borderRadius: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#667168', marginBottom: 4 }}>Home Atelier Team</div>
                  <div style={{ fontSize: 13, color: '#3a4540' }}>{reply.body}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <WriteReviewModal
          productSlug={productSlug}
          onClose={() => setShowForm(false)}
          onSubmitted={() => { setShowForm(false); load() }}
        />
      )}
    </section>
  )
}

function WriteReviewModal({ productSlug, onClose, onSubmitted }: {
  productSlug: string; onClose: () => void; onSubmitted: () => void
}) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [rating, setRating] = useState(5)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [signedIn, setSignedIn] = useState(false)
  const [uploadingPhotos, setUploadingPhotos] = useState(false)
  const [photoUrls, setPhotoUrls] = useState<string[]>([])
  const [photoMediaIds, setPhotoMediaIds] = useState<number[]>([])

  // Auto-fill name + email for signed-in customers
  useEffect(() => {
    fetch('/api/customers/me', { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.email) {
          setEmail(d.email)
          setName(d.name || '')
          setSignedIn(true)
        }
      })
      .catch(() => {})
  }, [])

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || files.length === 0) return
    setUploadingPhotos(true)
    setError('')
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        if (file.size > 10 * 1024 * 1024) {
          setError(`"${file.name}" exceeds 10 MB limit`)
          continue
        }
        const formData = new FormData()
        formData.append('file', file)
        const res = await fetch(`/api/products/${productSlug}/reviews/upload-photo`, {
          method: 'POST',
          body: formData,
        })
        const data = await res.json()
        if (!res.ok) { setError(data.error || 'Upload failed'); continue }
        setPhotoUrls(prev => [...prev, data.url])
        setPhotoMediaIds(prev => [...prev, data.media_id])
      }
    } catch {
      setError('Photo upload failed. Please try again.')
    } finally {
      setUploadingPhotos(false)
      // Reset the file input so the same file can be re-selected
      e.target.value = ''
    }
  }

  function removePhoto(index: number) {
    setPhotoUrls(prev => prev.filter((_, i) => i !== index))
    setPhotoMediaIds(prev => prev.filter((_, i) => i !== index))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const res = await fetch(`/api/products/${productSlug}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewerName: name, reviewerEmail: email, rating, title, reviewBody: body, photoUrls: photoMediaIds }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Something went wrong'); return }
      setDone(true)
      setTimeout(onSubmitted, 1800)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 12, maxWidth: 480, width: '100%', padding: 28 }} onClick={e => e.stopPropagation()}>
        {done ? (
          <div style={{ textAlign: 'center', padding: 20 }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>✓</div>
            <p>Thanks! Your review will appear after it&apos;s reviewed by our team.</p>
          </div>
        ) : (
          <form onSubmit={submit}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 16, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Write a Review</h3>
              <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>

            {error && <div style={{ background: '#fee', color: '#c00', padding: '10px 14px', borderRadius: 6, marginBottom: 16, fontSize: 13 }}>{error}</div>}

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Rating</label>
              <div style={{ display: 'flex', gap: 4 }}>
                {[1, 2, 3, 4, 5].map(n => (
                  <button key={n} type="button" onClick={() => setRating(n)} style={{
                    background: 'none', border: 'none', cursor: 'pointer', fontSize: 24,
                    color: n <= rating ? '#1a1a1a' : '#d9d9d9',
                  }}>★</button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Name *</label>
              <input required value={name} onChange={e => setName(e.target.value)} style={inputStyle} />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Email *</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                style={{ ...inputStyle, ...(signedIn ? { background: '#eef1ed', cursor: 'not-allowed' } : {}) }}
                readOnly={signedIn}
                title={signedIn ? 'Auto-filled from your account' : undefined}
              />
              <div style={{ fontSize: 11, color: '#667168', marginTop: 4 }}>
                {signedIn
                  ? 'Auto-filled from your account. Not shown publicly.'
                  : 'Your email will not be shown publicly — used for verification only.'}
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Review Title (optional)</label>
              <input value={title} onChange={e => setTitle(e.target.value)} style={inputStyle} />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Review *</label>
              <textarea required rows={4} value={body} onChange={e => setBody(e.target.value)} style={{ ...inputStyle, resize: 'vertical' }} />
            </div>

            {/* Photo upload */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Photos (optional, up to 10 MB each)</label>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                multiple
                onChange={handlePhotoUpload}
                disabled={uploadingPhotos}
                style={{ fontSize: 12 }}
              />
              {uploadingPhotos && <div style={{ fontSize: 11, color: '#667168', marginTop: 4 }}>Uploading...</div>}
              {photoUrls.length > 0 && (
                <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                  {photoUrls.map((url, i) => (
                    <div key={i} style={{ position: 'relative', width: 60, height: 60, borderRadius: 6, overflow: 'hidden', border: '1px solid #d9e0d7' }}>
                      <img src={url} alt={`Review photo ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <button type="button" onClick={() => removePhoto(i)} style={{
                        position: 'absolute', top: 2, right: 2, width: 18, height: 18, borderRadius: '50%',
                        background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', fontSize: 10,
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button type="submit" disabled={submitting || uploadingPhotos} style={{
              width: '100%', padding: '12px', background: '#151a17', color: '#fff', border: 'none',
              borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: submitting ? 'default' : 'pointer',
              opacity: submitting ? 0.6 : 1,
            }}>
              {submitting ? 'Submitting...' : 'Submit Review'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px', border: '1.5px solid #d9e0d7', borderRadius: 8,
  fontSize: 13, boxSizing: 'border-box',
}
