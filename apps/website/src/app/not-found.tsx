import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="error-page page-width">
      <div className="error-page__inner">
        <h1 className="error-page__code">404</h1>
        <h2 className="error-page__title">Page not found</h2>
        <p className="error-page__message">
          The page you&apos;re looking for doesn&apos;t exist or may have been moved.
        </p>
        <div className="error-page__actions">
          <Link href="/" className="btn btn--primary">Back to Home</Link>
          <Link href="/products" className="btn btn--secondary">Browse Products</Link>
        </div>
        <div className="error-page__suggestions">
          <p>You might be looking for:</p>
          <ul>
            <li><Link href="/products">All Products</Link></li>
            <li><Link href="/blog">Journal / Blog</Link></li>
            <li><Link href="/quote-cart">Request a Quote</Link></li>
            <li><Link href="/pages/contact-us">Contact Us</Link></li>
          </ul>
        </div>
      </div>
    </div>
  )
}
