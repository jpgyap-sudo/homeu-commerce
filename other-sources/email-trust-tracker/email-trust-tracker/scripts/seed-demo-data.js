import pg from 'pg';

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgres://emailtrust:emailtrust_dev_password@localhost:5438/emailtrust' });

async function main() {
  const customer = await pool.query(`
    INSERT INTO customers (email, full_name, mobile, role, company, marketing_consent, email_verified_at)
    VALUES ('architect@example.com', 'Demo Architect', '+63 900 000 0000', 'architect', 'Demo Studio', true, now())
    ON CONFLICT (email) DO UPDATE SET updated_at = now()
    RETURNING *
  `);

  const campaign = await pool.query(`
    INSERT INTO email_campaigns (name, subject, sender_email)
    VALUES ('Demo Campaign', 'New HomeU Furniture Collection', 'sales@homeu.ph')
    RETURNING *
  `);

  const message = await pool.query(`
    INSERT INTO email_messages (campaign_id, customer_id, status, sent_at, delivered_at)
    VALUES ($1, $2, 'delivered', now(), now())
    RETURNING *
  `, [campaign.rows[0].id, customer.rows[0].id]);

  await pool.query(`
    INSERT INTO email_events (message_id, customer_id, event_type, url, product_id)
    VALUES
      ($1, $2, 'open', null, null),
      ($1, $2, 'click', 'https://homeu.ph/products/saddle-industrial-chair', null),
      (null, $2, 'product_view', 'https://homeu.ph/products/saddle-industrial-chair', 'saddle-industrial-chair'),
      (null, $2, 'rfq_submit', null, null)
  `, [message.rows[0].id, customer.rows[0].id]);

  console.log('Seeded demo data');
  await pool.end();
}

main().catch(async (err) => {
  console.error(err);
  await pool.end();
  process.exit(1);
});
