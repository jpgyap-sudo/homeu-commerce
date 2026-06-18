import type { NormalizedInboundMessage } from './types';

type MetaWebhookPayload = {
  object?: string;
  entry?: Array<{
    id?: string;
    messaging?: Array<any>;
    changes?: Array<any>;
  }>;
};

function attachmentType(type: string | undefined) {
  if (type === 'image' || type === 'video' || type === 'audio' || type === 'file') return type;
  return 'unknown';
}

export function normalizeMetaWebhook(payload: MetaWebhookPayload): NormalizedInboundMessage[] {
  const messages: NormalizedInboundMessage[] = [];
  const channel = payload.object === 'instagram' ? 'instagram' : 'facebook';

  for (const entry of payload.entry ?? []) {
    for (const event of entry.messaging ?? []) {
      if (!event.message || event.message.is_echo) continue;
      messages.push({
        channel,
        externalAccountId: entry.id,
        externalSenderId: event.sender?.id,
        externalMessageId: event.message?.mid,
        body: event.message?.text,
        attachments: (event.message?.attachments ?? []).map((att: any) => ({
          type: attachmentType(att.type),
          url: att.payload?.url,
          title: att.title,
        })).filter((att: any) => Boolean(att.url)),
        rawPayload: event,
      });
    }
  }

  return messages.filter((m) => Boolean(m.externalSenderId));
}

export async function sendMetaReply(params: {
  channel: 'facebook' | 'instagram';
  recipientId: string;
  pageAccessToken: string;
  text: string;
}) {
  const version = process.env.META_GRAPH_VERSION ?? 'v23.0';
  const url = `https://graph.facebook.com/${version}/me/messages?access_token=${params.pageAccessToken}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recipient: { id: params.recipientId }, message: { text: params.text } }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Meta send failed: ${response.status} ${text}`);
  }

  return response.json();
}
