import Link from 'next/link'

export const metadata = {
  title: 'Privacy Policy — Home Atelier',
  description: 'Home Atelier privacy policy — how we collect, use, and protect your personal information.',
}

export default function PrivacyPolicyPage() {
  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '48px 24px', fontFamily: 'Arial, sans-serif', color: '#333', lineHeight: 1.7 }}>
      <Link href="/" style={{ color: '#1a6d3e', fontSize: 13, textDecoration: 'none', marginBottom: 24, display: 'inline-block' }}>&larr; Back to Home</Link>
      <h1 style={{ fontFamily: "'Crimson Text', Georgia, serif", fontSize: 32, fontWeight: 400, margin: '0 0 8px', color: '#151a17' }}>Privacy Policy</h1>
      <p style={{ fontSize: 13, color: '#667168', marginBottom: 32 }}>Last updated: June 23, 2026</p>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: '#151a17', marginBottom: 8 }}>1. Information We Collect</h2>
        <p>When you create an account or interact with our website, we collect:</p>
        <ul style={{ paddingLeft: 20 }}>
          <li><strong>Account Information:</strong> Your name, email address, phone number, and password (stored securely as a bcrypt hash).</li>
          <li><strong>Communication Data:</strong> Messages sent through our quotation request (RFQ) system and live chat.</li>
          <li><strong>Device Information:</strong> Browser fingerprint and user-agent data for security purposes (new device verification).</li>
          <li><strong>Usage Data:</strong> Pages viewed, products browsed, and interactions with our site to improve your experience.</li>
        </ul>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: '#151a17', marginBottom: 8 }}>2. How We Use Your Information</h2>
        <ul style={{ paddingLeft: 20 }}>
          <li>To create and manage your account</li>
          <li>To process and respond to your quotation requests</li>
          <li>To send you order updates and service-related communications</li>
          <li>To send marketing and promotional emails (only with your consent)</li>
          <li>To protect your account through multi-factor authentication (OTP)</li>
          <li>To improve our website and product offerings</li>
        </ul>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: '#151a17', marginBottom: 8 }}>3. Newsletter & Marketing Communications</h2>
        <p>If you subscribe to our newsletter (opt-in), we will send you updates about new products, exclusive offers, and design inspiration. You can unsubscribe at any time by clicking the unsubscribe link in any email or by contacting us.</p>
      </section>

      <section style={{ marginBottom: 28, background: '#f7f9f6', padding: '20px 24px', borderRadius: 10, border: '1px solid #e3e8e0' }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: '#151a17', marginBottom: 8 }}>📬 How to Whitelist @homeatelier.ph</h2>
        <p style={{ fontSize: 13, marginBottom: 12 }}>To make sure our emails (OTP codes, order updates, newsletters) reach your inbox and not your spam folder:</p>
        <ol style={{ paddingLeft: 20, fontSize: 13, lineHeight: 1.8 }}>
          <li><strong>Add to contacts:</strong> Save <code style={{ background: '#e3e8e0', padding: '2px 6px', borderRadius: 4, fontSize: 12 }}>noreply@homeatelier.ph</code> and <code style={{ background: '#e3e8e0', padding: '2px 6px', borderRadius: 4, fontSize: 12 }}>sales@homeatelier.ph</code> to your address book.</li>
          <li><strong>Gmail:</strong> If an email lands in Promotions/Spam, drag it to the Primary tab and click <strong>"Not spam."</strong></li>
          <li><strong>Outlook:</strong> Right-click the email → <strong>Junk → Mark as Not Junk</strong>. Also add <code style={{ background: '#e3e8e0', padding: '2px 6px', borderRadius: 4, fontSize: 12 }}>@homeatelier.ph</code> to Safe Senders.</li>
          <li><strong>Yahoo / others:</strong> Add the sender address to your contacts list to whitelist the domain.</li>
          <li><strong>Corporate/Enterprise:</strong> Ask your IT admin to whitelist the domain <code style={{ background: '#e3e8e0', padding: '2px 6px', borderRadius: 4, fontSize: 12 }}>@homeatelier.ph</code> and verify SPF/DKIM/DMARC records for the sending domain.</li>
        </ol>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: '#151a17', marginBottom: 8 }}>4. Data Security</h2>
        <p>We implement industry-standard security measures:</p>
        <ul style={{ paddingLeft: 20 }}>
          <li>Passwords are hashed using bcrypt (never stored in plain text)</li>
          <li>Session tokens use JWT with HS256 signing</li>
          <li>OTP codes are bcrypt-hashed with short expiration windows</li>
          <li>All communications are encrypted via HTTPS</li>
          <li>Database access is restricted to authorized services only</li>
        </ul>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: '#151a17', marginBottom: 8 }}>5. Data Retention</h2>
        <p>We retain your account information for as long as your account is active. If you request account deletion, we will remove your personal data within 30 days, unless retention is required by law or for legitimate business purposes (such as completed transaction records).</p>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: '#151a17', marginBottom: 8 }}>6. Third-Party Services</h2>
        <p>We use the following third-party services:</p>
        <ul style={{ paddingLeft: 20 }}>
          <li><strong>DigitalOcean Spaces</strong> — cloud storage for product images and media files</li>
          <li><strong>Google OAuth</strong> — optional Google sign-in (you can always use email/password instead)</li>
          <li><strong>SMTP email relays</strong> — for sending OTP codes, order notifications, and newsletters</li>
        </ul>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: '#151a17', marginBottom: 8 }}>7. Your Rights</h2>
        <p>Under applicable data protection laws, you have the right to:</p>
        <ul style={{ paddingLeft: 20 }}>
          <li>Access the personal data we hold about you</li>
          <li>Request correction of inaccurate data</li>
          <li>Request deletion of your data (subject to legal retention requirements)</li>
          <li>Withdraw consent for marketing communications at any time</li>
          <li>Request a copy of your data in a portable format</li>
        </ul>
        <p>To exercise these rights, please contact us at <a href="mailto:privacy@homeatelier.ph" style={{ color: '#1a6d3e' }}>privacy@homeatelier.ph</a>.</p>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: '#151a17', marginBottom: 8 }}>8. Updates to This Policy</h2>
        <p>We may update this privacy policy from time to time. Material changes will be communicated via email or through a notice on our website. Continued use of our services after changes constitutes acceptance of the updated policy.</p>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: '#151a17', marginBottom: 8 }}>9. Contact Us</h2>
        <p>If you have questions about this privacy policy or how we handle your data, please contact us:</p>
        <p style={{ margin: 0 }}>Email: <a href="mailto:privacy@homeatelier.ph" style={{ color: '#1a6d3e' }}>privacy@homeatelier.ph</a></p>
        <p style={{ margin: 0 }}>Home Atelier — Philippines</p>
      </section>

      <div style={{ borderTop: '1px solid #e3e8e0', paddingTop: 24, marginTop: 32, textAlign: 'center', fontSize: 13, color: '#9aa69c' }}>
        <Link href="/" style={{ color: '#1a6d3e', textDecoration: 'none', margin: '0 12px' }}>Home</Link>
        <Link href="/terms-of-service" style={{ color: '#1a6d3e', textDecoration: 'none', margin: '0 12px' }}>Terms of Service</Link>
        <Link href="/register" style={{ color: '#1a6d3e', textDecoration: 'none', margin: '0 12px' }}>Create Account</Link>
      </div>
    </div>
  )
}
