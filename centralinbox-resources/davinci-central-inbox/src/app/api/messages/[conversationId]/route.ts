import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getConversation, updateConversationStatus } from '@/lib/central-inbox/inbox-service';

const patchSchema = z.object({
  status: z.enum(['open', 'pending', 'closed', 'archived']).optional(),
});

export async function GET(_: NextRequest, { params }: { params: Promise<{ conversationId: string }> }) {
  const { conversationId } = await params;
  const conversation = await getConversation(conversationId);
  return NextResponse.json({ conversation });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ conversationId: string }> }) {
  const { conversationId } = await params;
  const body = patchSchema.parse(await request.json());
  if (body.status) await updateConversationStatus(conversationId, body.status);
  return NextResponse.json({ ok: true });
}
