'use client';

export function ConversationDetail({ conversation }: { conversation: any | null }) {
  if (!conversation) {
    return <div className="rounded-xl border p-8 text-center text-gray-500">Select a conversation to view details.</div>;
  }

  return (
    <div className="rounded-xl border bg-white">
      <div className="border-b p-4">
        <div className="text-lg font-semibold">{conversation.contact?.name || 'Unknown lead'}</div>
        <div className="text-sm text-gray-500">
          {conversation.contact?.email || ''} {conversation.contact?.phone ? `• ${conversation.contact.phone}` : ''}
        </div>
      </div>

      <div className="max-h-[520px] space-y-3 overflow-y-auto p-4">
        {conversation.messages.map((message: any) => {
          const inbound = message.direction === 'INBOUND';
          return (
            <div key={message.id} className={`flex ${inbound ? 'justify-start' : 'justify-end'}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2 ${inbound ? 'bg-gray-100' : 'bg-black text-white'}`}>
                <div className="whitespace-pre-wrap text-sm">{message.body || 'Attachment'}</div>
                <div className="mt-1 text-[11px] opacity-60">{new Date(message.createdAt).toLocaleString()}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="border-t p-4">
        <textarea className="h-24 w-full rounded-lg border p-3 text-sm" placeholder="Reply suggestion/composer placeholder. Wire this to provider-specific send API." />
        <div className="mt-2 flex justify-end gap-2">
          <button className="rounded-lg border px-4 py-2 text-sm">AI Suggest</button>
          <button className="rounded-lg bg-black px-4 py-2 text-sm text-white">Send Reply</button>
        </div>
      </div>
    </div>
  );
}
