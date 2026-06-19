/**
 * SEO Preview Card
 *
 * Shows how a product/page will appear in Google search results.
 * Updates live as the user types title, description, and slug.
 *
 * Usage:
 *   <SeoPreview
 *     title="Modern Sofa"
 *     seoTitle="Modern Sofa | HomeU"
 *     seoDescription="Contemporary 3-seater with linen upholstery"
 *     slug="modern-sofa"
 *     siteUrl="store.homeatelier.ph"
 *   />
 */

'use client'

interface SeoPreviewProps {
  title?: string
  seoTitle?: string
  seoDescription?: string
  slug?: string
  siteUrl?: string
}

const card: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #e3e8e0',
  borderRadius: 12,
  padding: 20,
  maxWidth: 600,
  fontFamily: 'Arial, sans-serif',
  fontSize: 14,
  lineHeight: 1.4,
}

export function SeoPreview({ title, seoTitle, seoDescription, slug, siteUrl = 'store.homeatelier.ph' }: SeoPreviewProps) {
  const displayTitle = seoTitle || title || 'Untitled'
  const displayDesc = seoDescription || ''
  const displayUrl = slug ? `https://${siteUrl}/products/${slug}` : `https://${siteUrl}/products`

  // Truncate to Google SERP limits
  const truncatedTitle = displayTitle.length > 60 ? displayTitle.slice(0, 57) + '...' : displayTitle
  const truncatedDesc = displayDesc.length > 155 ? displayDesc.slice(0, 152) + '...' : displayDesc

  const titleLengthOk = (seoTitle || title || '').length <= 60
  const descLengthOk = (seoDescription || '').length <= 155

  return (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 18 }}>🔍</span>
        <span style={{ fontWeight: 700, fontSize: 14, color: '#151a17' }}>Google Preview</span>
      </div>

      {/* SERP card */}
      <div style={{
        border: '1px solid #dadce0',
        borderRadius: 8,
        padding: 16,
        background: '#fff',
        maxWidth: 600,
      }}>
        {/* URL breadcrumb */}
        <div style={{ fontSize: 12, color: '#202124', lineHeight: 1.3, marginBottom: 2 }}>
          {displayUrl}
          <span style={{ color: '#70757a', marginLeft: 4 }}>▾</span>
        </div>

        {/* Title */}
        <div style={{
          fontSize: 18, color: '#1a0dab', lineHeight: 1.3,
          fontWeight: 400, textDecoration: 'none', cursor: 'pointer',
          marginBottom: 2,
        }}>
          {truncatedTitle}
        </div>

        {/* Description */}
        <div style={{ fontSize: 13, color: '#4d5156', lineHeight: 1.55 }}>
          {truncatedDesc || (
            <span style={{ fontStyle: 'italic', color: '#9aa69c' }}>
              No SEO description set. Write one to appear in search results.
            </span>
          )}
        </div>
      </div>

      {/* Length indicators */}
      <div style={{ display: 'flex', gap: 16, marginTop: 12, fontSize: 11 }}>
        <div style={{ color: titleLengthOk ? '#1e7a47' : '#b0392f' }}>
          Title: {(seoTitle || title || '').length}/60 {titleLengthOk ? '✓' : '✗ too long'}
        </div>
        <div style={{ color: descLengthOk ? '#1e7a47' : '#b0392f' }}>
          Description: {(seoDescription || '').length}/155 {descLengthOk ? '✓' : '✗ too long'}
        </div>
      </div>
    </div>
  )
}
