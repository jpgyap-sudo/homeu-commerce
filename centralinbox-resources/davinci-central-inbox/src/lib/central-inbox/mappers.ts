import type { InboxChannel } from './types';

export function toPrismaChannel(channel: InboxChannel) {
  if (channel === 'website') return 'WEBSITE';
  if (channel === 'facebook') return 'FACEBOOK';
  return 'INSTAGRAM';
}

export function fromPrismaChannel(channel: string): InboxChannel {
  if (channel === 'WEBSITE') return 'website';
  if (channel === 'FACEBOOK') return 'facebook';
  return 'instagram';
}

export function toPrismaStatus(status: string) {
  const map: Record<string, string> = {
    open: 'OPEN',
    pending: 'PENDING',
    closed: 'CLOSED',
    archived: 'ARCHIVED',
  };
  return map[status] ?? 'OPEN';
}
