'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'

interface Slide {
  image: string
  buttonLabel?: string
  buttonLink?: string
}

const SLIDES: Slide[] = [
  {
    image: 'https://cdn.shopify.com/s/files/1/0559/7377/3476/files/b77cb11ff1.webp?v=1697613842',
    buttonLabel: 'Shop Sofa',
    buttonLink: '/products?category=sofa',
  },
  {
    image: 'https://cdn.shopify.com/s/files/1/0559/7377/3476/files/A9ter5o3_1r4uc0l_hko.jpg?v=1678600427',
    buttonLabel: 'Shop Seating',
    buttonLink: '/products?category=seating',
  },
  {
    image: 'https://cdn.shopify.com/s/files/1/0559/7377/3476/files/A9t5ka0y_1r4uc0v_hko.jpg?v=1678600709',
  },
  {
    image: 'https://cdn.shopify.com/s/files/1/0559/7377/3476/files/r1_480x480_a439cb88-4c92-45af-b585-1ff8c6a5cdc5.webp?v=1678600624',
    buttonLabel: 'Shop Tables',
    buttonLink: '/products?category=table',
  },
]

const AUTOROTATE_SPEED = 3000

export function HomepageSlideshow() {
  const [current, setCurrent] = useState(0)
  const [paused, setPaused] = useState(false)

  const next = useCallback(() => setCurrent(c => (c + 1) % SLIDES.length), [])
  const prev = useCallback(() => setCurrent(c => (c - 1 + SLIDES.length) % SLIDES.length), [])

  useEffect(() => {
    if (paused) return
    const id = setInterval(next, AUTOROTATE_SPEED)
    return () => clearInterval(id)
  }, [paused, next])

  return (
    <div
      className="slideshow"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-label="Homepage slideshow"
    >
      <div className="slideshow__track">
        {SLIDES.map((slide, idx) => (
          <div
            key={idx}
            className={`slideshow__slide${idx === current ? ' is-active' : ''}`}
            aria-hidden={idx !== current}
          >
            <Image
              src={slide.image}
              alt=""
              fill
              style={{ objectFit: 'cover', objectPosition: 'center' }}
              priority={idx === 0}
              sizes="100vw"
              unoptimized
            />
            {slide.buttonLabel && slide.buttonLink && (
              <div className="slideshow__overlay">
                <Link href={slide.buttonLink} className="btn btn--primary slideshow__btn">
                  {slide.buttonLabel}
                </Link>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Prev / Next */}
      <button
        className="slideshow__arrow slideshow__arrow--prev"
        onClick={prev}
        aria-label="Previous slide"
      >
        &#8249;
      </button>
      <button
        className="slideshow__arrow slideshow__arrow--next"
        onClick={next}
        aria-label="Next slide"
      >
        &#8250;
      </button>

      {/* Dots */}
      <div className="slideshow__dots" role="tablist">
        {SLIDES.map((_, idx) => (
          <button
            key={idx}
            role="tab"
            aria-selected={idx === current}
            className={`slideshow__dot${idx === current ? ' is-active' : ''}`}
            onClick={() => setCurrent(idx)}
            aria-label={`Go to slide ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  )
}
