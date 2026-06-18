import { NextRequest, NextResponse } from 'next/server';
import { getChannelAccounts, upsertChannel } from '@/lib/central-inbox/inbox-service';
import type { InboxChannel } from '@/lib/central-inbox/types';

function parseType(value: string | null): InboxChannel | undefined {
  if (value === 'website' || value === 'facebook' || value === 'instagram') return value;
  return undefined;
}

export async function GET(request: NextRequest) {
  const type = parseType(request.nextUrl.searchParams.get('type'));
  const channels = await getChannelAccounts(type);
  return NextResponse.json({ channels });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  if (!body.type || !body.name) {
    return NextResponse.json({ error: 'type and name are required' }, { status: 400 });
  }

  const channel = await upsertChannel({
    type: body.type,
    name: body.name,
    externalAccountId: body.externalAccountId,
    externalPageId: body.externalPageId,
    brandKey: body.brandKey,
    accessTokenEncrypted: body.accessTokenEncrypted,
  });

  return NextResponse.json({ channel });
}
