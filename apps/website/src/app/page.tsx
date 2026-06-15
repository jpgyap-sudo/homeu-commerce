export default function HomePage() {
  return (
    <main>
      <section className="hero">
        <h1>HomeU Furniture Catalog</h1>
        <p>Browse furniture, view prices, and request a bulk quotation.</p>
        <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
          <a href="/products" style={{ padding: '10px 24px', background: '#222', color: '#fff', borderRadius: 6, textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>
            View Products
          </a>
          <a href="/quote-cart" style={{ padding: '10px 24px', background: '#173f2f', color: '#fff', borderRadius: 6, textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>
            Quote Cart
          </a>
          <a href="/login" style={{ padding: '10px 24px', background: '#f5f5f5', color: '#222', borderRadius: 6, textDecoration: 'none', fontSize: 14 }}>
            Customer Login
          </a>
          <a href="/register" style={{ padding: '10px 24px', background: '#f5f5f5', color: '#222', borderRadius: 6, textDecoration: 'none', fontSize: 14 }}>
            Register
          </a>
        </div>
      </section>
    </main>
  )
}
