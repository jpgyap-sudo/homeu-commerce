import { fromPrismaChannel } from '@/lib/central-inbox/mappers';
import type { InboxTab } from '@/lib/central-inbox/types';

export function ConversationList({
  conversations,
  activeTab,
  activeChannelId,
}: {
  conversations: any[];
  activeTab?: InboxTab;
  activeChannelId?: string;
}) {
  if (!conversations.length) {
    return <div className="rounded-xl border border-dashed p-8 text-center text-gray-500">No conversations in this tab yet.</div>;
  }

  return (
    <div className="overflow-hidden rounded-xl border bg-white">
      {conversations.map((conversation) => {
        const last = conversation.messages?.[0];
        const channel = fromPrismaChannel(conversation.channel.type);
        const tab = activeTab ?? channel;
        const channelParam = activeChannelId ? `&channelId=${encodeURIComponent(activeChannelId)}` : '';
        return (
          <a
            key={conversation.id}
            href={`/admin/apps/central-inbox?tab=${tab}${channelParam}&conversationId=${conversation.id}`}
            className="block border-b p-4 last:border-b-0 hover:bg-gray-50"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-semibold">{conversation.contact?.name || conversation.contact?.email || 'Unknown lead'}</div>
                <div className="mt-1 text-xs font-medium text-gray-500">{conversation.channel?.name}</div>
                <div className="mt-1 line-clamp-1 text-sm text-gray-600">{last?.body || 'Attachment or empty message'}</div>
              </div>
              <div className="text-right text-xs text-gray-500">
                <div className="uppercase">{channel}</div>
                <div>{new Date(conversation.lastMessageAt).toLocaleString()}</div>
              </div>
            </div>
          </a>
        );
      })}
    </div>
  );
}
