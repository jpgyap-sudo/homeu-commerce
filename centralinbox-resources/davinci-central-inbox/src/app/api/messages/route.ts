import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getInboxCounts, ingestInboundMessage, listConversations } from '@/lib/central-inbox/inbox-service';
import { normalizeWebsiteChat } from '@/lib/central-inbox/website-adapter';

const tabSchema = z.enum(['website', 'facebook', 'instagram', 'all', 'archived']).default('all');

const websiteMessageSchema = z.object({
  visitorId: z.string().min(1),
  name: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  message: z.string().min(1),
  attachmentUrl: z.string().url().optional(),
});

export async function GET(request: NextRequest) {
  const tab = tabSchema.parse(request.nextUrl.searchParams.get('tab') ?? 'all');
  const [counts, conversations] = await Promise.all([getInboxCounts(), listConversations(tab)]);
  return NextResponse.json({ counts, conversations });
}

export async function POST(request: NextRequest) {
  const json = await request.json();
  const input = websiteMessageSchema.parse(json);
  const normalized = normalizeWebsiteChat(input);
  const result = await ingestInboundMessage(normalized);
  return NextResponse.json(result, { status: 201 });
}
