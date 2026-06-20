/**
 * import-static-pages.mjs
 * ========================
 * Populates the empty `pages` table with the real static pages from the live
 * Shopify store (fetched via the Shopify Admin GraphQL API), so /pages/[handle]
 * works out of the box and is then editable via /admin/pages (no code needed).
 * Idempotent: skips a slug if a row already exists.
 *
 * Run locally:
 *   DATABASE_URI=postgres://homeu:homeu_local_password@localhost:5432/homeu node tools/import-static-pages.mjs
 * Run against production (inside the website container):
 *   docker exec -i homeu-commerce-website-1 node - < tools/import-static-pages.mjs
 *
 * Only real, non-empty content pages from Shopify are imported — empty/app-embed
 * pages (wall-panels, 3d-showroom, shop-by-lookbook, test-page, designerclub,
 * design-inspo) were skipped as not useful 1:1 clones.
 */
import pg from 'pg'

const PAGES = [
  {
    slug: 'how-to-order',
    title: 'Order Instruction',
    seoTitle: 'How to Order | Home Atelier',
    body: `<p>Payment Terms:</p>
<p><span>Available payments are: PAYPAL, CREDIT CARD, GCASH, BANK DEPOSIT</span></p>
<p><strong>BANK DEPOSIT</strong></p>
<p>Payments made in bank deposit does not have credit card charges.</p>
<p><em>How to order via bank deposit?</em></p>
<p>Screenshot your cart and send it to our sales team to assist you via:</p>
<p>Instagram: homeatelierph</p>
<p>Viber: 0956 775 8139</p>
<p>Email: sales@homeatelier.ph</p>
<hr>
<p>We will process orders within 24 hours of receiving your online order request. A payment receipt with delivery information will be emailed to you after your order is received and processed.</p>
<p>If you don't receive a notification email confirming your order and delivery timeframe, please contact us directly on 09567758139 (available on Viber) with your online order reference number. Please first check your spam email folder if you don't receive a notification regarding your order delivery date.</p>
<p>After your order has been dispatched from our warehouse, a notification email with freight tracking reference number and the freight company's contact details will be sent to you to enable direct contact with the delivery company.</p>
<p>You are also welcome to pick up your item directly from our warehouse. Please contact us first to verify the address prior to pick up, as sometimes low stock goods are kept at our showroom instead of at the warehouse.</p>
<p><strong>Order information for preorder products</strong></p>
<p>Delivery time</p>
<p>Standard delivery time for on-stock items is around 3 to 7 working days. The delivery time for preordered items/customized/non-stock is 6 to 7 weeks. This is counted from the date of the order and payment being received by us. An order confirmation form with the chosen product options will be emailed to the customer when we receive the online order.</p>
<p>Customers are free to cancel the confirmed preorder with us within 7 days after confirmation. Without a written confirmation, a 5% cancellation fee will apply otherwise. If a customer's situation changes, the delivery date may be rescheduled to an earlier or later date. An additional charge will apply if a customer requests a delivery date to be earlier than its original date.</p>
<p>Please note that the discounts applied to delivery timeframes are only applicable to our standard models. Unfortunately, these discounts are not available for custom orders or any specially sourced products.</p>
<p><strong>Colour options/Customization</strong></p>
<p>We list different colour options for some models. If there aren't different options available on the page, customers can choose the colour as shown in the product image. Some models may be made to customer's specifications. All customers' special requests will be taken care of and confirmed by one of our Sales Consultants via website chat or email. Please chat with us or send us an email at sales@homeu.ph</p>`,
  },
  {
    slug: 'contact-us',
    title: 'Contact Us',
    seoTitle: 'Home Atelier : Modern Furniture Specialist | Contact Us',
    body: `<p>If you have any questions or comments for us, feel free to contact us via our email sales@homeatelier.ph, we will get back to you within 48 hours. Or you can text us through Viber 09567758139.</p>
<ul>
<li>Showroom Address: GF Signature Residences 658 A. Bonifacio Ave, Balintawak, Quezon City, 1106 Metro Manila (By Appointment)</li>
<li>Email: sales@homeu.ph</li>
<li>Customer Service: 09567758139</li>
<li>Opening hours: Mon - Sat, 10:00 am to 6pm, Sun - 1:00pm to 6:00pm</li>
</ul>
<p>Message us on Instagram for appointments: <a href="https://www.instagram.com/homeatelierph/">homeatelierph</a></p>
<p><iframe loading="lazy" style="border:0;" height="450" width="100%" src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3860.178227346993!2d120.9922480759048!3d14.645822175966295!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3397b74d0b5818b5%3A0x1365106a5a8fb447!2sHome%20Atelier%20PH!5e0!3m2!1sfil!2sph!4v1706461386117!5m2!1sfil!2sph"></iframe></p>`,
  },
  {
    slug: 'privacy-policy',
    title: 'Privacy Policy',
    seoTitle: 'Privacy Policy | Home Atelier',
    body: `<h3>General Principles of Collection, Use and Disclosure of Personal Information</h3>
<p>To the extent required by applicable law, whenever we collect personal information, we will:</p>
<ul>
<li>provide timely and appropriate notice to you about our data practices;</li>
<li>collect your personal information only for specified and legitimate purposes. The information we collect will be relevant, adequate and not excessive for the purposes for which it is collected;</li>
<li>process your personal information in a manner consistent with the purposes for which it was originally collected or to which you have subsequently consented;</li>
<li>take commercially reasonable steps to ensure that your personal information is reliable for its intended use, accurate, complete, and, where necessary, kept up-to-date;</li>
<li>not use your personal information for direct marketing purposes without giving you an opportunity to "opt-out"; and</li>
<li>take appropriate measures, by contract or otherwise, to provide adequate protection for personal information that is disclosed to a third party or transferred to another country.</li>
</ul>
<h3>Personal Information</h3>
<p>We collect the following types of personal information:</p>
<ul>
<li><strong>Information You Provide</strong> — contact information such as your name, company name, job title, address, e-mail address, and phone number; additional information to help us get to know you better, such as your gender, age, date of birth, nationality, professional associations and registration numbers, information about how you use our products, and demographic information; comments, questions, requests and orders you may make.</li>
<li><strong>Information Automatically Gathered from Your Device</strong> — we may collect technical information about your device, such as device type, browser type, IP address, operating system, and device identifier. We collect this information automatically from your device and web browser through cookies and similar technologies.</li>
</ul>`,
  },
  {
    slug: 'homeu-app',
    title: 'Homeu App',
    seoTitle: 'AR Simulation | Homeu App',
    body: `<p>Watch this video on how to use our AR Simulation:</p>
<p><iframe src="https://www.youtube.com/embed/p76qrGpdEMY" title="YouTube video player" width="560" height="315" frameborder="0" allowfullscreen></iframe></p>
<p>Test the AR Simulator by following the instruction:</p>
<p>Choose a product: <a href="/products">browse our catalog</a></p>
<p><strong>INSTRUCTION</strong></p>
<ul>
<li>Click AR icon (top right)</li>
<li>Point at empty space</li>
<li>Move phone slowly in circular motion until object appears</li>
<li>Measure and mark dimension in actual scene</li>
<li>Scale object to scene</li>
<li>Take photos or video and share</li>
</ul>`,
  },
]

const conn = process.env.DATABASE_URI || process.env.DATABASE_URL || 'postgres://homeu:homeu@localhost:5432/homeu'
const pool = new pg.Pool({ connectionString: conn, connectionTimeoutMillis: 8000 })

const run = async () => {
  let inserted = 0, skipped = 0
  for (const p of PAGES) {
    const existing = await pool.query('SELECT id FROM pages WHERE slug = $1', [p.slug])
    if (existing.rows.length > 0) { skipped++; continue }
    await pool.query(
      `INSERT INTO pages (title, slug, content, seo_title, updated_at, created_at)
       VALUES ($1, $2, $3::jsonb, $4, NOW(), NOW())`,
      [p.title, p.slug, JSON.stringify(p.body), p.seoTitle]
    )
    inserted++
  }
  console.log(`static pages: inserted ${inserted}, skipped ${skipped} (already existed)`)
  await pool.end()
}
run().catch((e) => { console.error('IMPORT ERROR:', e.message); process.exit(1) })
