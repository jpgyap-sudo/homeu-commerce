'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

interface SearchResult {
  type: 'product' | 'page' | 'article'
  id: string | number
  title: string
  slug: string
  url: string
  imageUrl?: string | null
  category?: string
  blogHandle?: string
  excerpt?: string
}

function SearchContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [q, setQ] = useState(searchParams.get('q') || '')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  async function doSearch(term: string) {
    if (!term.trim()) { setResults([]); setSearched(false); return }
    setLoading(true)
    setSearched(true)
    try {
      const [productsRes, pagesRes] = await Promise.all([
        fetch(`/api/products?search=${encodeURIComponent(term)}&limit=6`).then(r => r.ok ? r.json() : null),
        fetch(`/api/pages?search=${encodeURIComponent(term)}&limit=4`).then(r => r.ok ? r.json() : null),
      ])

      const combined: SearchResult[] = []

      if (productsRes?.docs) {
        for (const p of productsRes.docs) {
          combined.push({
            type: 'product',
            id: p.id,
            title: p.title,
            slug: p.slug,
            url: `/products/${p.slug}`,
            imageUrl: p.imageUrl,
            category: p.category?.title,
          })
        }
      }

      if (pagesRes?.docs) {
        for (const pg of pagesRes.docs) {
          combined.push({
            type: 'page',
            id: pg.id,
            title: pg.title,
            slug: pg.slug,
            url: `/pages/${pg.slug}`,
          })
        }
      }

      setResults(combined)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const urlQ = searchParams.get('q') || ''
    if (urlQ) { setQ(urlQ); doSearch(urlQ) }
  }, [searchParams])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    router.push(q.trim() ? `/search?q=${encodeURIComponent(q.trim())}` : '/search')
  }

  return (
    <>
      <div className="page-banner">
        <div className="page-width">
          <h1 className="page-banner__title">Search</h1>
        </div>
      </div>

      <div className="page-width search-page">
        <form onSubmit={handleSubmit} className="search-page__form">
          <input
            type="search"
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search products, pages…"
            autoFocus
            className="search-page__input"
          />
          <button type="submit" className="btn btn--primary">Search</button>
        </form>

        {loading && <p className="search-page__status">Searching…</p>}

        {!loading && searched && results.length === 0 && (
          <p className="search-page__status">No results found for &ldquo;{searchParams.get('q')}&rdquo;.</p>
        )}

        {!loading && results.length > 0 && (
          <>
            <p className="search-page__count">{results.length} result{results.length !== 1 ? 's' : ''}</p>
            <div className="search-results">
              {results.map((r, i) => (
                <Link key={`${r.type}-${r.id}`} href={r.url} className="search-result">
                  {r.imageUrl ? (
                    <div className="search-result__image">
                      <Image
                        src={r.imageUrl}
                        alt={r.title}
                        fill
                        style={{ objectFit: 'cover' }}
                        sizes="80px"
                        unoptimized
                      />
                    </div>
                  ) : (
                    <div className="search-result__image search-result__image--placeholder" />
                  )}
                  <div className="search-result__body">
                    <p className="search-result__type">{r.type === 'product' ? r.category || 'Product' : 'Page'}</p>
                    <p className="search-result__title">{r.title}</p>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}

        {!searched && (
          <div className="search-page__suggestions">
            <p>Popular categories:</p>
            <div className="search-page__tags">
              {['sofa', 'dining', 'bed', 'lighting', 'wall-panels', 'outdoor'].map(cat => (
                <Link key={cat} href={`/products?category=${cat}`} className="search-page__tag">
                  {cat.replace(/-/g, ' ')}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  )
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="page-width" style={{ padding: 40 }}>Loading…</div>}>
      <SearchContent />
    </Suspense>
  )
}
