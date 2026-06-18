export type InboxChannel = 'website' | 'facebook' | 'instagram';
export type InboxTab = InboxChannel | 'all' | 'archived';

export type ConversationStatus = 'open' | 'pending' | 'closed' | 'archived';
export type MessageDirection = 'inbound' | 'outbound' | 'system';

export interface ChannelAccount {
  id: string;
  type: InboxChannel;
  name: string;
  externalAccountId?: string | null;
  externalPageId?: string | null;
  brandKey?: string | null;
  isActive: boolean;
}

export interface NormalizedInboundMessage {
  channel: InboxChannel;
  /** Facebook Page ID or Instagram Business Account ID. This identifies WHICH inbox/page received the message. */
  externalAccountId?: string;
  /** Optional provider-specific page ID. Useful when IG is linked to a FB page. */
  externalPageId?: string;
  /** Friendly page/account name when available. */
  channelName?: string;
  /** Optional brand/workspace key, for example homeu-furniture or homeu-lighting. */
  brandKey?: string;
  externalSenderId: string;
  externalMessageId?: string;
  senderName?: string;
  body?: string;
  attachments?: Array<{
    type: 'image' | 'video' | 'file' | 'audio' | 'unknown';
    url: string;
    title?: string;
  }>;
  rawPayload: unknown;
}
