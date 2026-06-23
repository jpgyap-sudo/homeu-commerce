import Link from 'next/link'

export const metadata = {
  title: 'Terms of Service — Home Atelier',
  description: 'Home Atelier terms of service — conditions for using our website, account registration, quotation requests, and purchases.',
}

export default function TermsOfServicePage() {
  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '48px 24px', fontFamily: 'Arial, sans-serif', color: '#333', lineHeight: 1.7 }}>
      <Link href="/" style={{ color: '#1a6d3e', fontSize: 13, textDecoration: 'none', marginBottom: 24, display: 'inline-block' }}>&larr; Back to Home</Link>
      <h1 style={{ fontFamily: "'Crimson Text', Georgia, serif", fontSize: 32, fontWeight: 400, margin: '0 0 8px', color: '#151a17' }}>Terms of Service</h1>
      <p style={{ fontSize: 13, color: '#667168', marginBottom: 32 }}>Last updated: June 23, 2026</p>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: '#151a17', marginBottom: 8 }}>1. Acceptance of Terms</h2>
        <p>By creating an account or using the Home Atelier website ("the Service"), you agree to these Terms of Service. If you do not agree, please do not use the Service.</p>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: '#151a17', marginBottom: 8 }}>2. Account Registration</h2>
        <ul style={{ paddingLeft: 20 }}>
          <li>You must provide accurate, current, and complete information during registration.</li>
          <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
          <li>You must notify us immediately of any unauthorized use of your account.</li>
          <li>We may enable OTP (one-time password) verification for new devices as a security measure.</li>
        </ul>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: '#151a17', marginBottom: 8 }}>3. Quotation Requests (RFQ)</h2>
        <ul style={{ paddingLeft: 20 }}>
          <li>Submitting a quotation request does not constitute a binding order.</li>
          <li>Quotations provided are valid for the period stated in the quotation document.</li>
          <li>Pricing, availability, and specifications are subject to change without prior notice.</li>
          <li>A quotation must be formally approved to proceed with an order.</li>
        </ul>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: '#151a17', marginBottom: 8 }}>4. Use of Service</h2>
        <p>You agree not to:</p>
        <ul style={{ paddingLeft: 20 }}>
          <li>Use the Service for any unlawful purpose or in violation of any applicable laws.</li>
          <li>Attempt to gain unauthorized access to any part of the Service or other users' accounts.</li>
          <li>Interfere with or disrupt the operation of the Service.</li>
          <li>Submit false or misleading information in quotation requests or account registration.</li>
        </ul>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: '#151a17', marginBottom: 8 }}>5. Intellectual Property</h2>
        <p>All content on the Home Atelier website — including product images, descriptions, designs, logos, and text — is the property of Home Atelier and is protected by applicable intellectual property laws. You may not reproduce, distribute, or create derivative works without our express written consent.</p>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: '#151a17', marginBottom: 8 }}>6. Limitation of Liability</h2>
        <p>Home Atelier shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Service. Our total liability shall not exceed the amount you have paid to us, if any, in the past six months.</p>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: '#151a17', marginBottom: 8 }}>7. Termination</h2>
        <p>We reserve the right to suspend or terminate your account at any time for violations of these terms, fraudulent activity, or any conduct that may harm the Service or other users. You may delete your account at any time by contacting us.</p>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: '#151a17', marginBottom: 8 }}>8. Governing Law</h2>
        <p>These terms shall be governed by and construed in accordance with the laws of the Republic of the Philippines. Any disputes arising from these terms shall be resolved through the appropriate courts of the Philippines.</p>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: '#151a17', marginBottom: 8 }}>9. Changes to Terms</h2>
        <p>We may modify these terms at any time. Changes will be effective immediately upon posting. Your continued use of the Service after changes constitutes acceptance of the updated terms. We will notify you of material changes via email or website notice.</p>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: '#151a17', marginBottom: 8 }}>10. Contact</h2>
        <p>For questions about these terms, please contact us:</p>
        <p style={{ margin: 0 }}>Email: <a href="mailto:legal@homeatelier.ph" style={{ color: '#1a6d3e' }}>legal@homeatelier.ph</a></p>
        <p style={{ margin: 0 }}>Home Atelier — Philippines</p>
      </section>

      <div style={{ borderTop: '1px solid #e3e8e0', paddingTop: 24, marginTop: 32, textAlign: 'center', fontSize: 13, color: '#9aa69c' }}>
        <Link href="/" style={{ color: '#1a6d3e', textDecoration: 'none', margin: '0 12px' }}>Home</Link>
        <Link href="/privacy-policy" style={{ color: '#1a6d3e', textDecoration: 'none', margin: '0 12px' }}>Privacy Policy</Link>
        <Link href="/register" style={{ color: '#1a6d3e', textDecoration: 'none', margin: '0 12px' }}>Create Account</Link>
      </div>
    </div>
  )
}
