import 'dotenv/config';
import { Worker } from 'bullmq';
import { connection } from '../lib/queue.js';
import { query } from '../lib/db.js';
import { renderTemplate } from '../services/renderTemplate.js';
import { sendEmail } from '../services/sendProvider.js';

const rate = Number(process.env.SEND_RATE_PER_MINUTE || 60);
const limiter = { max: rate, duration: 60_000 };

const worker = new Worker('campaign-email-send', async (job) => {
  const { recipientId } = job.data;
  const result = await query(`
    SELECT r.*, c.first_name, c.last_name, c.company, c.role, c.tags,
      ca.subject AS campaign_subject, ca.status AS campaign_status,
      t.html_body, t.text_body, t.subject AS template_subject
    FROM campaign_recipients r
    JOIN contacts c ON c.id=r.contact_id
    JOIN campaigns ca ON ca.id=r.campaign_id
    JOIN email_templates t ON t.id=ca.template_id
    LEFT JOIN suppression_list s ON lower(s.email)=lower(r.email)
    WHERE r.id=$1 AND s.email IS NULL
  `, [recipientId]);

  if (!result.rowCount) return { skipped: true };
  const row = result.rows[0];
  if (row.campaign_status !== 'sending') return { skipped: true, reason: 'campaign not sending' };

  await query("UPDATE campaign_recipients SET status='sending' WHERE id=$1", [recipientId]);

  const base = process.env.TRACKING_DOMAIN || process.env.PUBLIC_APP_URL;
  const tracking = {
    trackingPixelUrl: `${base}/t/open/${recipientId}.gif`,
    unsubscribeUrl: `${base}/t/unsubscribe/${recipientId}`,
    contactCardUrl: `${base}/contact-card/homeu.vcf`
  };

  const htmlWithTrackedLinks = rewriteLinks(row.html_body, `${base}/t/click/${recipientId}`);
  const rendered = renderTemplate({
    html: htmlWithTrackedLinks,
    text: row.text_body,
    subject: row.campaign_subject || row.template_subject
  }, row, tracking);

  try {
    const sent = await sendEmail({ to: row.email, ...rendered });
    await query(
      "UPDATE campaign_recipients SET status='sent', provider_message_id=$1, sent_at=now() WHERE id=$2",
      [sent.messageId, recipientId]
    );
    await query(
      "INSERT INTO email_events (campaign_id, contact_id, recipient_id, event_type) VALUES ($1,$2,$3,'delivered')",
      [row.campaign_id, row.contact_id, recipientId]
    );
    return { sent: true };
  } catch (error) {
    await query("UPDATE campaign_recipients SET status='failed', error=$1 WHERE id=$2", [error.message, recipientId]);
    throw error;
  }
}, { connection, limiter });

function rewriteLinks(html, clickBase) {
  return html.replace(/href="(https?:\/\/[^"]+)"/g, (_, url) => `href="${clickBase}?u=${encodeURIComponent(url)}"`);
}

worker.on('completed', (job) => console.log('sent job', job.id));
worker.on('failed', (job, err) => console.error('failed job', job?.id, err.message));
