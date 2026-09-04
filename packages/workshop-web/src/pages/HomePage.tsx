import { Button } from '@cloudflare/kumo';
import { useNavigate } from '@tanstack/react-router';
import { useState, type FormEvent } from 'react';

import { persistSession, useAuthSession } from '../AuthContext';
import MeshBackground from '../components/MeshBackground';
import { useRpcStub } from '../RpcContext';

export default function HomePage() {
  const session = useAuthSession();
  const publicRpc = useRpcStub();
  const navigate = useNavigate();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  return (
    <div className="relative flex h-full flex-col items-center justify-center px-4">
      <MeshBackground />
      <div className="relative w-full max-w-xl">
        <h1 className="mb-2 text-center text-2xl font-semibold">gaos</h1>
        <p className="mb-6 text-center text-sm text-kumo-subtle">What should we make?</p>
        <form
          className="rounded-2xl border border-kumo-line bg-kumo-base p-3 shadow-sm"
          onSubmit={(event: FormEvent) => {
            event.preventDefault();
            const message = text.trim();
            if (message.length === 0 || busy) {
              return;
            }
            setBusy(true);
            void (async () => {
              const chatId = await session.stub.createChat();
              persistSession(session.token, chatId);
              const stub = publicRpc.restore(session.token, chatId);
              await stub.sendMessage(message);
              await navigate({
                to: '/workspace/$id',
                params: { id: 'me' },
                search: { chat: chatId },
              });
            })().finally(() => {
              setBusy(false);
            });
          }}
        >
          <textarea
            aria-label="message"
            placeholder="message"
            className="min-h-[5rem] w-full resize-none bg-transparent p-2 text-sm outline-none"
            value={text}
            onChange={(event) => {
              setText(event.target.value);
            }}
          />
          <div className="flex justify-end">
            <Button type="submit" variant="primary" disabled={busy}>
              Send
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
