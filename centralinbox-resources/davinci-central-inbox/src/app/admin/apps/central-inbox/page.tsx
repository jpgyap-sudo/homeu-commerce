import { InboxTabs } from '@/components/central-inbox/InboxTabs';
import { ChannelAccountFilter } from '@/components/central-inbox/ChannelAccountFilter';
import { ConversationList } from '@/components/central-inbox/ConversationList';
import { ConversationDetail } from '@/components/central-inbox/ConversationDetail';
import { getChannelAccounts, getConversation, getInboxCounts, listConversations } from '@/lib/central-inbox/inbox-service';
import type { InboxChannel, InboxTab } from '@/lib/central-inbox/types';

function parseTab(tab: string | string[] | undefined): InboxTab {
  const value = Array.isArray(tab) ? tab[0] : tab;
  if (value === 'website' || value === 'facebook' || value === 'instagram' || value === 'archived') return value;
  return 'all';
}

function tabToChannel(tab: InboxTab): InboxChannel | undefined {
  if (tab === 'website' || tab === 'facebook' || tab === 'instagram') return tab;
  return undefined;
}

export default async function CentralInboxPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; conversationId?: string; channelId?: string }>;
}) {
  const params = await searchParams;
  const activeTab = parseTab(params.tab);
  const activeChannelType = tabToChannel(activeTab);
  const activeChannelId = params.channelId;

  const [counts, channelAccounts, conversations, conversation] = await Promise.all([
    getInboxCounts(),
    activeChannelType ? getChannelAccounts(activeChannelType) : Promise.resolve([]),
    listConversations(activeTab, activeChannelId),
    params.conversationId ? getConversation(params.conversationId).catch(() => null) : Promise.resolve(null),
  ]);

  return (
    <main className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Central Inbox</h1>
        <p className="mt-1 text-sm text-gray-600">
          Monitor Website Chat, multiple Facebook Pages, and multiple Instagram accounts in separate tabs.
        </p>
      </div>
      <InboxTabs activeTab={activeTab} counts={counts} />
      <ChannelAccountFilter activeTab={activeTab} channels={channelAccounts as any[]} activeChannelId={activeChannelId} />
      <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
        <ConversationList conversations={conversations as any[]} activeTab={activeTab} activeChannelId={activeChannelId} />
        <ConversationDetail conversation={conversation as any} />
      </div>
    </main>
  );
}
