/**
 * import-static-pages-2.mjs
 * ==========================
 * Second batch of static pages — these were referenced by site_settings
 * nav_footer / navigation.json but never imported, so their links 404'd:
 * Terms of Service, Refund Policy (Shopify shop policies, not Page nodes),
 * About Us (modern-furniture-specialist), Reviews (furnituremanila),
 * Careers, FAQs. Idempotent: skips a slug if a row already exists.
 *
 * Run locally:
 *   DATABASE_URI=... node tools/import-static-pages-2.mjs
 * Run against production:
 *   docker exec -i homeu-commerce-website-1 node --input-type=module - < tools/import-static-pages-2.mjs
 */
import pg from 'pg'

const PAGES = [
  {
    slug: 'terms-of-service',
    title: 'Terms of Service',
    seoTitle: 'Terms of Service | Home Atelier',
    body: `<p><strong>Terms of Payment:</strong></p>
<p>Available payments are: PAYPAL, CREDIT CARD, GCASH, BANK DEPOSIT</p>
<p>Credit card charges apply. To avoid credit card charges, please use bank deposit.</p>
<p><strong>For Bank Deposit:</strong></p>
<p>Please take a screenshot of your cart, send it to our sales team on Instagram or Viber.</p>
<p>IG: homeatelierph</p>
<p>Viber: 09567758139</p>
<p>or email us at sales@homeu.ph</p>
<p>We will email the order confirmation along with the bank details for payment processing.</p>
<hr>
<p>We will process orders within 24 hours of receiving your online order request. A payment receipt with delivery information will be emailed to you after your order is received and processed.</p>
<p>If you don't receive a notification email confirming your order and delivery timeframe, please contact us directly on 09567758139 (available on Viber) with your online order reference number. Please first check your spam email folder if you don't receive a notification regarding your order delivery date.</p>
<p>After your order has been dispatched from our warehouse, a notification email with freight tracking reference number and the freight company's contact details will be sent to you to enable direct contact with the delivery company.</p>
<p>You are also welcome to pick up your item directly from our warehouse. Please contact us first to verify the address prior to pick up, as sometimes low stock goods are kept at our showroom instead of at the warehouse.</p>`,
  },
  {
    slug: 'refund-policy',
    title: 'Refund Policy',
    seoTitle: 'Refund Policy | Home Atelier',
    body: `<p><strong>Cancellation</strong></p>
<p>Customers are free to cancel the confirmed preorder with us within 3 days during placement of order through written notice and mutual confirmation. Upon cancellation confirmation, a 5% cancellation fee will apply. If a customer's situation changes, the delivery date may be rescheduled to an earlier or later date. An additional charge will apply if a customer requests a delivery date to be earlier than its original date.</p>
<p><strong>Return</strong></p>
<p>In case of dispute such as wrong item delivered, you may return the goods or deliver them to our specified address without undue delay and in any case within 7 days from the date on which you communicated the request of return.</p>
<p>You are responsible for the return's delivery charge and decrease in the value of the goods resulting from the handling of the goods other than that necessary to establish the nature, characteristics and functioning of the goods.</p>
<p>The returned goods must be returned in resalable condition. Please note, in the case of non-resalability, the amount equivalent to the decrease in the value of the asset can always be withheld.</p>`,
  },
  {
    slug: 'modern-furniture-specialist',
    title: 'About Us',
    seoTitle: 'Modern Furniture Specialist | Furniture Store in the Philippines',
    body: `<p>Home Atelier is one of the top suppliers of modern furniture and interiors in the Philippines. It has the latest design of contemporary collections for living room, dining area, bedroom, and other kinds of interior furniture and finishes.</p>
<p><strong>Our Capability and Experience:</strong></p>
<p>Home Atelier is a modern furniture specialist that has deep knowledge of materials used for various applications of different project design intent.</p>
<p>It has a vast choice of fabrics and leathers used for its sofa sets. Wide variety of stone table tops for dining tables and kitchen countertops. Different types of metal and wood finishes available. Wide variety of color swatches of your choice. Making each furniture customizable according to the interior design's intent and function.</p>
<p>Home Atelier is one of the best furniture stores in the Philippines for contemporary and bespoke furniture.</p>
<p>It has supplied to a lot of developers and home owners. The team has been trusted by interior designers worldwide to truly bring a bespoke finish for their project. Home Atelier's furniture is meant to become a bespoke timeless collection, bringing synergy to the owner's taste and character.</p>`,
  },
  {
    slug: 'furnituremanila',
    title: 'Reviews',
    seoTitle: 'Home Atelier | Best Furniture Store in the Philippines',
    body: `<p>Home Atelier is one of the top furniture suppliers in Manila. It has the latest trends in modern interior design and architecture. It has bespoke designs suited for any modern interior project. Its contemporary and timeless collections make every project unique and exquisite.</p>
<p><strong>Design and Products:</strong> Home Atelier is the best furniture store in the Philippines to provide bespoke designs and is known for the latest trends in modern furniture. Their offerings include sofas, tables, chairs, lighting, and decorative items. They cater to various material requirements, helping to bring interior design ideas to life.</p>
<p><strong>Reputation and Reviews:</strong> Home Atelier has garnered a positive reputation with customers giving them 4.9 out of 5 stars, indicating high customer satisfaction with their quality products and services.</p>`,
  },
  {
    slug: 'careers',
    title: 'Careers',
    seoTitle: 'Careers | Be Part of our Team',
    body: `<p><strong>Sales Associate</strong></p>
<p>Qualifications:</p>
<ul>
<li>College diploma (related to sales or design is a plus), fresh graduates are welcome to apply</li>
<li>Passion to learn the related field</li>
<li>Strong communication skills and customer service</li>
<li>Organized and punctual</li>
<li>Ability to work under pressure to meet sales targets</li>
</ul>
<p>Send your resume to: hr@homeatelier.ph</p>`,
  },
  {
    slug: 'faqs-commonly-asked-question',
    title: 'FAQs',
    seoTitle: 'Home Atelier FAQs | Commonly Asked Question',
    body: `<p>Explore our comprehensive FAQs section where we've compiled answers to the most common questions our visitors ask. From product specifics and shipping details, find quick, clear, and concise information to enhance your shopping experience.</p>
<p><strong>1. Do you ship nationwide in the Philippines?</strong></p>
<p>Yes, we ship nationwide through our accredited logistics partner. Please let us know where you are located for us to coordinate your shipment.</p>
<p><strong>2. Do you customize swatches for sofas and armchairs?</strong></p>
<p>Please check our <a href="/products">product catalog</a> for available swatch and fabric options.</p>
<p><strong>3. How do I order?</strong></p>
<p>a. You may check out the <a href="/pages/how-to-order">order instructions</a> here.</p>
<p>b. You may contact our sales team to assist you through the process via Instagram: <a href="https://www.instagram.com/homeatelierph/">homeatelierph</a></p>
<p><strong>4. Where is your showroom located?</strong></p>
<p>You may visit us at 658 A Bonifacio Ave, Balintawak, Quezon City.</p>
<p><strong>Opening Store Hours:</strong></p>
<p>Monday to Saturday: 10am to 6pm</p>
<p>Sunday: 1pm to 6pm</p>
<p><strong>5. Do you customize dining tables and console tables?</strong></p>
<p>Yes, you may choose the size, shape, and length of the customized table that you want to purchase.</p>`,
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
  console.log(`static pages (batch 2): inserted ${inserted}, skipped ${skipped} (already existed)`)
  await pool.end()
}
run().catch((e) => { console.error('IMPORT ERROR:', e.message); process.exit(1) })
