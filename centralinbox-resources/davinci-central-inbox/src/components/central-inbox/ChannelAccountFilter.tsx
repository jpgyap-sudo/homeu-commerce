'use client';

import type { InboxTab } from '@/lib/central-inbox/types';

export function ChannelAccountFilter({
  activeTab,
  channels,
  activeChannelId,
}: {
  activeTab: InboxTab;
  channels: Array<{ id: string; name: string; type: string; brandKey?: string | null; externalAccountId?: string | null }>;
  activeChannelId?: string;
}) {
  const channelTabs = ['website', 'facebook', 'instagram'];
  if (!channelTabs.includes(activeTab)) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm font-medium text-gray-600">Account:</span>
      <a
        href={`/admin/apps/central-inbox?tab=${activeTab}`}
        className={`rounded-full border px-3 py-1 text-sm ${!activeChannelId ? 'bg-black text-white' : 'bg-white text-gray-700'}`}
      >
        All {activeTab}
      </a>
      {channels.map((channel) => (
        <a
          key={channel.id}
          href={`/admin/apps/central-inbox?tab=${activeTab}&channelId=${encodeURIComponent(channel.id)}`}
          className={`rounded-full border px-3 py-1 text-sm ${activeChannelId === channel.id ? 'bg-black text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
        >
          {channel.name}
          {channel.brandKey ? <span className="ml-1 opacity-60">/{channel.brandKey}</span> : null}
        </a>
      ))}
    </div>
  );
}
