'use client';

import type { InboxTab } from '@/lib/central-inbox/types';

const tabs: Array<{ key: InboxTab; label: string }> = [
  { key: 'website', label: 'Website Chat' },
  { key: 'facebook', label: 'Facebook Messenger' },
  { key: 'instagram', label: 'Instagram DM' },
  { key: 'all', label: 'All Inbox' },
  { key: 'archived', label: 'Archived / Closed' },
];

export function InboxTabs({ activeTab, counts }: { activeTab: InboxTab; counts: Record<string, number> }) {
  return (
    <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-3">
      {tabs.map((tab) => {
        const active = tab.key === activeTab;
        return (
          <a
            key={tab.key}
            href={`/admin/apps/central-inbox?tab=${tab.key}`}
            className={`rounded-full px-4 py-2 text-sm font-medium ${
              active ? 'bg-black text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {tab.label} <span className="ml-1 opacity-70">{counts?.[tab.key] ?? 0}</span>
          </a>
        );
      })}
    </div>
  );
}
