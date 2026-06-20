import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import contacts from './routes/contacts.js';
import templates from './routes/templates.js';
import segments from './routes/segments.js';
import campaigns from './routes/campaigns.js';
import tracking from './routes/tracking.js';
import { requireAdmin } from './lib/auth.js';

const app = express();
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: process.env.FRONTEND_URL || true }));
app.use(express.json({ limit: '2mb' }));

app.get('/health', (_, res) => res.json({ ok: true, service: 'homeu-campaign-builder' }));

app.get('/contact-card/homeu.vcf', (_, res) => {
  const vcf = `BEGIN:VCARD\nVERSION:3.0\nFN:HomeU / Home Atelier PH\nORG:Home Atelier PH\nEMAIL:sales@homeu.ph\nTEL:+63-000-000-0000\nURL:https://homeu.ph\nEND:VCARD\n`;
  res.setHeader('Content-Type', 'text/vcard');
  res.setHeader('Content-Disposition', 'attachment; filename="homeu-contact.vcf"');
  res.send(vcf);
});

app.use('/t', tracking);
app.use('/api/contacts', requireAdmin, contacts);
app.use('/api/templates', requireAdmin, templates);
app.use('/api/segments', requireAdmin, segments);
app.use('/api/campaigns', requireAdmin, campaigns);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(400).json({ error: err.message || 'Bad request' });
});

app.listen(4100, () => console.log('HomeU campaign builder API on :4100'));
