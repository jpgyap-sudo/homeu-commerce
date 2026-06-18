import { prisma } from './prisma';
import { toPrismaChannel, toPrismaStatus } from './mappers';
import type { InboxChannel, InboxTab, NormalizedInboundMessage } from './types';

export async function getChannelAccounts(type?: InboxChannel) {
  return prisma.inboxChannel.findMany({
    where: type ? { type: toPrismaChannel(type) as any, isActive: true } : { isActive: true },
    orderBy: [{ type: 'asc' }, { name: 'asc' }],
  });
}

export async function getInboxCounts() {
  const rows = await prisma.conversation.groupBy({
    by: ['status', 'channelId'],
    _count: { _all: true },
  });

  const channels = await prisma.inboxChannel.findMany({ select: { id: true, type: true } });
  const byId = new Map(channels.map((c) => [c.id, c.type]));

  const counts = { website: 0, facebook: 0, instagram: 0, all: 0, archived: 0 };
  for (const row of rows) {
    const count = row._count._all;
    if (row.status === 'ARCHIVED' || row.status === 'CLOSED') {
      counts.archived += count;
      continue;
    }
    const type = byId.get(row.channelId);
    if (type === 'WEBSITE') counts.website += count;
    if (type === 'FACEBOOK') counts.facebook += count;
    if (type === 'INSTAGRAM') counts.instagram += count;
    counts.all += count;
  }
  return counts;
}

export async function listConversations(tab: InboxTab, channelId?: string) {
  const where: any = {};

  if (tab === 'archived') {
    where.status = { in: ['ARCHIVED', 'CLOSED'] };
  } else {
    where.status = { notIn: ['ARCHIVED', 'CLOSED'] };
  }

  if (channelId && channelId !== 'all') {
    where.channelId = channelId;
  } else if (tab === 'website' || tab === 'facebook' || tab === 'instagram') {
    where.channel = { type: toPrismaChannel(tab) };
  }

  return prisma.conversation.findMany({
    where,
    include: {
      contact: true,
      channel: true,
      messages: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
    orderBy: { lastMessageAt: 'desc' },
    take: 100,
  });
}

export async function getConversation(conversationId: string) {
  return prisma.conversation.findUniqueOrThrow({
    where: { id: conversationId },
    include: {
      contact: true,
      channel: true,
      messages: { orderBy: { createdAt: 'asc' } },
      notes: { orderBy: { createdAt: 'desc' } },
    },
  });
}

function stableChannelId(input: NormalizedInboundMessage) {
  const account = input.externalAccountId ?? input.externalPageId ?? 'default';
  return `${input.channel}:${account}`;
}

export async function upsertChannel(input: {
  type: InboxChannel;
  name: string;
  externalAccountId?: string;
  externalPageId?: string;
  brandKey?: string;
  accessTokenEncrypted?: string;
}) {
  return prisma.inboxChannel.upsert({
    where: {
      type_externalAccountId: {
        type: toPrismaChannel(input.type) as any,
        externalAccountId: input.externalAccountId ?? 'default',
      },
    },
    create: {
      id: `${input.type}:${input.externalAccountId ?? 'default'}`,
      type: toPrismaChannel(input.type) as any,
      name: input.name,
      externalAccountId: input.externalAccountId ?? 'default',
      externalPageId: input.externalPageId,
      brandKey: input.brandKey,
      accessTokenEncrypted: input.accessTokenEncrypted,
      isActive: true,
    },
    update: {
      name: input.name,
      externalPageId: input.externalPageId,
      brandKey: input.brandKey,
      accessTokenEncrypted: input.accessTokenEncrypted,
      isActive: true,
    },
  });
}

export async function ingestInboundMessage(input: NormalizedInboundMessage) {
  const channel = await prisma.inboxChannel.upsert({
    where: { id: stableChannelId(input) },
    create: {
      id: stableChannelId(input),
      type: toPrismaChannel(input.channel) as any,
      name: input.channelName ?? `${input.channel.toUpperCase()} ${input.externalAccountId ?? 'Default'}`,
      externalAccountId: input.externalAccountId ?? 'default',
      externalPageId: input.externalPageId,
      brandKey: input.brandKey,
      isActive: true,
    },
    update: {
      name: input.channelName ?? undefined,
      externalPageId: input.externalPageId ?? undefined,
      brandKey: input.brandKey ?? undefined,
      isActive: true,
    },
  });

  const contactWhere =
    input.channel === 'facebook'
      ? { facebookPsid: input.externalSenderId }
      : input.channel === 'instagram'
        ? { instagramUserId: input.externalSenderId }
        : { websiteVisitorId: input.externalSenderId };

  const contact = await prisma.contact.upsert({
    where: contactWhere as any,
    create: {
      ...contactWhere,
      name: input.senderName,
      source: input.channel,
    } as any,
    update: { name: input.senderName ?? undefined },
  });

  const existing = await prisma.conversation.findFirst({
    where: {
      channelId: channel.id,
      contactId: contact.id,
      status: { notIn: ['CLOSED', 'ARCHIVED'] },
    },
  });

  const conversation =
    existing ??
    (await prisma.conversation.create({
      data: { channelId: channel.id, contactId: contact.id, status: 'OPEN' },
    }));

  const message = await prisma.message.create({
    data: {
      conversationId: conversation.id,
      direction: 'INBOUND',
      status: 'RECEIVED',
      body: input.body,
      attachments: input.attachments ?? undefined,
      externalMessageId: input.externalMessageId,
      rawPayload: input.rawPayload as any,
    },
  });

  await prisma.conversation.update({
    where: { id: conversation.id },
    data: { lastMessageAt: message.createdAt, status: 'OPEN' },
  });

  return { conversationId: conversation.id, messageId: message.id, channelId: channel.id };
}

export async function updateConversationStatus(conversationId: string, status: string) {
  return prisma.conversation.update({
    where: { id: conversationId },
    data: { status: toPrismaStatus(status) as any },
  });
}
