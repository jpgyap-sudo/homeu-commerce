'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
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

async function fetchResults(term: string, productLimit: number, pageLimit: number): Promise<SearchResult[]> {
  const [productsRes, pagesRes] = await Promise.all([
    fetch(`/api/products?search=${encodeURIComponent(term)}&limit=${productLimit}`).then(r => r.ok ? r.json() : null),
    fetch(`/api/pages?search=${encodeURIComponent(term)}&limit=${pageLimit}`).then(r => r.ok ? r.json() : null),
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

  return combined
}

function SearchContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [q, setQ] = useState(searchParams.get('q') || '')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  const [suggestions, setSuggestions] = useState<SearchResult[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

  async function doSearch(term: string) {
    if (!term.trim()) { setResults([]); setSearched(false); return }
    setLoading(true)
    setSearched(true)
    try {
      setResults(await fetchResults(term, 6, 4))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const urlQ = searchParams.get('q') || ''
    if (urlQ) { setQ(urlQ); doSearch(urlQ) }
  }, [searchParams])

  // Live autocomplete dropdown — debounced, separate from the full results
  // grid below (which only populates after a real search submission).
  function handleInputChange(value: string) {
    setQ(value)
    setActiveIndex(-1)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (value.trim().length < 2) { setSuggestions([]); setShowSuggestions(false); return }
    debounceRef.current = setTimeout(async () => {
      try {
        const docs = await fetchResults(value.trim(), 6, 2)
        setSuggestions(docs)
        setShowSuggestions(docs.length > 0)
      } catch { /* best-effort */ }
    }, 250)
  }

  function goToSuggestion(r: SearchResult) {
    setShowSuggestions(false)
    setQ(r.title)
    router.push(r.url)
  }

  // Close suggestions on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (formRef.current && !formRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setShowSuggestions(false)
    router.push(q.trim() ? `/search?q=${encodeURIComponent(q.trim())}` : '/search')
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!showSuggestions || suggestions.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex(i => (i + 1) % suggestions.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex(i => (i - 1 + suggestions.length) % suggestions.length)
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault()
      goToSuggestion(suggestions[activeIndex])
    } else if (e.key === 'Escape') {
      setShowSuggestions(false)
    }
  }

  return (
    <>
      <div className="page-banner">
        <div className="page-width">
          <h1 className="page-banner__title">Search</h1>
        </div>
      </div>

      <div className="page-width search-page">
        <form ref={formRef} onSubmit={handleSubmit} className="search-page__form" style={{ position: 'relative' }}>
          <input
            type="search"
            value={q}
            onChange={e => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            placeholder="Search products, pages…"
            autoComplete="off"
            autoFocus
            className="search-page__input"
          />
          <button type="submit" className="btn btn--primary">Search</button>

          {showSuggestions && suggestions.length > 0 && (
            <div className="search-page__autocomplete">
              {suggestions.map((s, i) => (
                <button
                  key={`${s.type}-${s.id}`}
                  type="button"
                  className={`search-page__autocomplete-item${i === activeIndex ? ' is-active' : ''}`}
                  onMouseDown={() => goToSuggestion(s)}
                  onMouseEnter={() => setActiveIndex(i)}
                >
                  {s.imageUrl ? (
                    <span className="search-page__autocomplete-thumb">
                      <Image src={s.imageUrl} alt="" fill style={{ objectFit: 'cover' }} sizes="36px" unoptimized />
                    </span>
                  ) : (
                    <span className="search-page__autocomplete-thumb search-page__autocomplete-thumb--placeholder" />
                  )}
                  <span className="search-page__autocomplete-text">
                    <span className="search-page__autocomplete-title">{s.title}</span>
                    <span className="search-page__autocomplete-type">{s.type === 'product' ? s.category || 'Product' : 'Page'}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
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
