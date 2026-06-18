import type { NormalizedInboundMessage } from './types';

export function normalizeWebsiteChat(input: {
  visitorId: string;
  name?: string;
  email?: string;
  phone?: string;
  message: string;
  attachmentUrl?: string;
}): NormalizedInboundMessage {
  return {
    channel: 'website',
    externalAccountId: 'website-chatbox',
    externalSenderId: input.visitorId,
    senderName: input.name,
    body: input.message,
    attachments: input.attachmentUrl ? [{ type: 'file', url: input.attachmentUrl }] : undefined,
    rawPayload: input,
  };
}
