import crypto from 'crypto';

export function hashIp(ip = '') {
  const secret = process.env.IP_HASH_SECRET || 'dev-only-change-me';
  return crypto.createHmac('sha256', secret).update(ip).digest('hex');
}

export function safeRedirectUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function escapeVcf(value = '') {
  return String(value).replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\n/g, '\\n');
}
