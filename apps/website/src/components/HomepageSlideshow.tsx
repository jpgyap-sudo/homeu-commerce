'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'

interface Slide {
  image: string
  heading?: string
  subheading?: string
  buttonLabel?: string
  buttonLink?: string
  buttonStyle?: string
  textColor?: string
  overlayColor?: string
  overlayOpacity?: number
  mobileImage?: string
}

interface SlideshowProps {
  slides?: Slide[]
  autoRotate?: boolean
  showArrows?: boolean
  showDots?: boolean
  rotateInterval?: number
  height?: number
  minHeight?: number
  maxHeight?: number
  contentPosition?: string
  contentAlign?: string
}

const DEFAULT_SLIDES: Slide[] = [
  {
    image: 'https://homeatelierspaces.sgp1.cdn.digitaloceanspaces.com/cdn-mirror/e32e2818f312726fc3f70db598f646101adfb6c47e4ac6b6c707f76067d3f808.webp',
    buttonLabel: 'Shop Sofa',
    buttonLink: '/products?category=sofa',
  },
  {
    image: 'https://homeatelierspaces.sgp1.cdn.digitaloceanspaces.com/cdn-mirror/0f1d7a550f6dd8787bcaeb3125accee1fd0e65bf436c5f6657e684581b432fca.jpg',
    buttonLabel: 'Shop Seating',
    buttonLink: '/products?category=seating',
  },
  {
    image: 'https://homeatelierspaces.sgp1.cdn.digitaloceanspaces.com/cdn-mirror/4faa06ec064fd6c05b5bf3bb7ed47f90c1a6fe8ba54089bb6f6c3d4085d68cdd.jpg',
  },
  {
    image: 'https://homeatelierspaces.sgp1.cdn.digitaloceanspaces.com/cdn-mirror/fc61c37b91a2f74a7533ba6e04f4cc7fc47e5ee90e6e38927e9e4ab52e018415.webp',
    buttonLabel: 'Shop Tables',
    buttonLink: '/products?category=table',
  },
]

export function HomepageSlideshow({
  slides,
  autoRotate = true,
  showArrows = true,
  showDots = true,
  rotateInterval = 6000,
  height,
  minHeight,
  maxHeight,
  contentPosition = 'bottom',
  contentAlign = 'center',
}: SlideshowProps) {
  const SLIDES = slides && slides.length > 0 ? slides : DEFAULT_SLIDES
  const [current, setCurrent] = useState(0)
  const [paused, setPaused] = useState(false)

  const next = useCallback(() => setCurrent(c => (c + 1) % SLIDES.length), [SLIDES.length])
  const prev = useCallback(() => setCurrent(c => (c - 1 + SLIDES.length) % SLIDES.length), [SLIDES.length])

  useEffect(() => {
    if (!autoRotate || paused) return
    const id = setInterval(next, rotateInterval)
    return () => clearInterval(id)
  }, [autoRotate, paused, next, rotateInterval])

  const positionStyles: Record<string, string> = {
    top: 'flex-start',
    center: 'center',
    bottom: 'flex-end',
  }

  const alignStyles: Record<string, { alignItems: 'flex-start' | 'center' | 'flex-end'; textAlign: 'left' | 'center' | 'right'; paddingLeft?: string; paddingRight?: string }> = {
    left: { alignItems: 'flex-start', textAlign: 'left', paddingLeft: '8%', paddingRight: '8%' },
    center: { alignItems: 'center', textAlign: 'center' },
    right: { alignItems: 'flex-end', textAlign: 'right', paddingLeft: '8%', paddingRight: '8%' },
  }

  const alignment = alignStyles[contentAlign] || alignStyles.center

  const slideshowStyle: React.CSSProperties = {
    height: height ? `${height}vh` : '80vh',
    minHeight: minHeight ? `${minHeight}px` : undefined,
    maxHeight: maxHeight ? `${maxHeight}px` : undefined,
  }

  return (
    <div
      className="slideshow"
      style={slideshowStyle}
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
            {slide.image ? (
              <>
                <Image
                  src={slide.image}
                  alt=""
                  fill
                  data-edit-image={`slides.${idx}.image`}
                  className={slide.mobileImage ? 'slideshow__image--desktop has-mobile' : 'slideshow__image--desktop'}
                  style={{ objectFit: 'cover', objectPosition: 'center' }}
                  priority={idx === 0}
                  sizes="100vw"
                  unoptimized
                />
                {slide.mobileImage && (
                  <Image
                    src={slide.mobileImage}
                    alt=""
                    fill
                    data-edit-image={`slides.${idx}.mobileImage`}
                    className="slideshow__image--mobile"
                    style={{ objectFit: 'cover', objectPosition: 'center' }}
                    priority={idx === 0}
                    sizes="100vw"
                    unoptimized
                  />
                )}
              </>
            ) : (
              <div style={{ position: 'absolute', inset: 0, background: '#eef1ed', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9aa69c', fontSize: 14 }}>
                Click to add image
              </div>
            )}

            {/* Darkening overlay background */}
            <div
              className="slideshow__overlay-bg"
              style={{
                position: 'absolute',
                inset: 0,
                backgroundColor: slide.overlayColor || 'rgba(0,0,0,0.2)',
                opacity: (slide.overlayOpacity !== undefined ? Number(slide.overlayOpacity) : 20) / 100,
                zIndex: 1,
                pointerEvents: 'none',
              }}
            />

            {(slide.heading || slide.subheading || (slide.buttonLabel && slide.buttonLink)) && (
              <div
                className="slideshow__overlay"
                style={{
                  justifyContent: positionStyles[contentPosition] || 'flex-end',
                  alignItems: alignment.alignItems,
                  textAlign: alignment.textAlign,
                  paddingLeft: alignment.paddingLeft,
                  paddingRight: alignment.paddingRight,
                  zIndex: 2,
                }}
              >
                {slide.heading && (
                  <h2
                    className="slideshow__heading"
                    data-edit={`slides.${idx}.heading`}
                    style={{ color: slide.textColor || '#ffffff' }}
                  >
                    {slide.heading}
                  </h2>
                )}
                {slide.subheading && (
                  <p
                    className="slideshow__subheading"
                    data-edit={`slides.${idx}.subheading`}
                    style={{ color: slide.textColor || '#ffffff' }}
                  >
                    {slide.subheading}
                  </p>
                )}
                {slide.buttonLabel && slide.buttonLink && (
                  <Link
                    href={slide.buttonLink}
                    className={`btn slideshow__btn ${
                      slide.buttonStyle === 'secondary'
                        ? 'btn--secondary'
                        : slide.buttonStyle === 'outline'
                        ? 'btn--outline'
                        : 'btn--primary'
                    }`}
                    data-edit={`slides.${idx}.buttonText`}
                  >
                    {slide.buttonLabel}
                  </Link>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Prev / Next */}
      {showArrows && (
        <>
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
        </>
      )}

      {/* Dots */}
      {showDots && (
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
      )}
    </div>
  )
}
