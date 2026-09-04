import { Button } from '@cloudflare/kumo';
import { useState, type FormEvent } from 'react';

import type { WorkshopState } from './gaos-api';

export default function ChatPane({
  log,
  onAccept,
  onRevert,
  onSend,
  sending,
  state,
  status,
}: {
  log: Array<{ role: 'user' | 'agent'; text: string }>;
  onAccept: () => Promise<void>;
  onRevert: () => Promise<void>;
  onSend: (text: string) => Promise<void>;
  sending: boolean;
  state: WorkshopState | null;
  status: string;
}) {
  const [draft, setDraft] = useState('');
  const pending = state?.proposalFiles !== null && state?.proposalFiles !== undefined;
  const files = Object.keys(state?.proposalFiles ?? state?.acceptedFiles ?? {});

  return (
    <aside className="flex h-full w-full flex-col border-r border-kumo-line md:w-[min(28rem,40%)]">
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3" id="log">
        {log.map((entry, index) => (
          <p
            key={`${entry.role}-${String(index)}`}
            className={
              entry.role === 'user'
                ? 'ml-8 rounded-lg bg-kumo-bubble-user px-3 py-2 text-sm'
                : 'mr-8 rounded-lg border border-kumo-line px-3 py-2 text-sm'
            }
          >
            {entry.text}
          </p>
        ))}
      </div>
      {pending ? (
        <div className="border-t border-kumo-line bg-kumo-elevated px-3 py-2">
          <p className="text-xs font-medium text-kumo-subtle">Pending changes</p>
          <ul className="mt-1 text-xs">
            {files.map((name) => (
              <li key={name}>{name}</li>
            ))}
          </ul>
          <div className="mt-2 flex gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                void onRevert();
              }}
            >
              Revert
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={() => {
                void onAccept();
              }}
            >
              Accept
            </Button>
          </div>
        </div>
      ) : null}
      <form
        id="chat-form"
        className="border-t border-kumo-line p-3"
        onSubmit={(event: FormEvent) => {
          event.preventDefault();
          const text = draft.trim();
          if (text.length === 0 || sending) {
            return;
          }
          setDraft('');
          void onSend(text);
        }}
      >
        <textarea
          id="message"
          aria-label="message"
          placeholder="message"
          className="min-h-[4.5rem] w-full rounded-md border border-kumo-line bg-kumo-control p-2 text-sm"
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
          }}
        />
        <div className="mt-2 flex items-center justify-between">
          <p className="text-xs text-kumo-subtle" id="status">
            {status}
          </p>
          <Button id="send" type="submit" variant="primary" disabled={sending}>
            Send
          </Button>
        </div>
      </form>
    </aside>
  );
}
