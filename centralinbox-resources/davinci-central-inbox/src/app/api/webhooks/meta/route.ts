import { NextRequest, NextResponse } from 'next/server';
import { normalizeMetaWebhook } from '@/lib/central-inbox/meta-adapter';
import { ingestInboundMessage } from '@/lib/central-inbox/inbox-service';
import { verifyMetaSignature } from '@/lib/security/meta-signature';

export async function GET(request: NextRequest) {
  const mode = request.nextUrl.searchParams.get('hub.mode');
  const token = request.nextUrl.searchParams.get('hub.verify_token');
  const challenge = request.nextUrl.searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === process.env.META_VERIFY_TOKEN && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }

  return new NextResponse('Forbidden', { status: 403 });
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  if (process.env.NODE_ENV === 'production') {
    const isValid = verifyMetaSignature(rawBody, request.headers.get('x-hub-signature-256'));
    if (!isValid) return new NextResponse('Invalid signature', { status: 401 });
  }

  const payload = JSON.parse(rawBody);
  const normalized = normalizeMetaWebhook(payload);

  for (const message of normalized) {
    await ingestInboundMessage(message);
  }

  return NextResponse.json({ ok: true, ingested: normalized.length });
}
