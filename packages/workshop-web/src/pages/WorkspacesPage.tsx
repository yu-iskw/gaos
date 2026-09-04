import { Plus } from '@phosphor-icons/react';
import { Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';

import { useAuthSession } from '../AuthContext';

export default function WorkspacesPage() {
  const session = useAuthSession();
  const [chats, setChats] = useState<string[]>([]);

  useEffect(() => {
    void session.stub.listChats().then(setChats);
  }, [session.stub]);

  return (
    <div className="mx-auto flex h-full w-full max-w-4xl flex-col px-3 sm:px-10">
      <header className="flex flex-col gap-4 px-3 pb-3 pt-6 sm:flex-row sm:items-end sm:justify-between sm:pt-10">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Workspaces</h1>
          <p className="mt-1 text-[13px] text-kumo-subtle">
            Each chat is a conversation in your workshop.
          </p>
        </div>
        <Link
          to="/"
          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-kumo-brand px-3.5 text-[13px] font-medium text-white"
        >
          <Plus size={14} weight="bold" />
          Create workspace
        </Link>
      </header>
      <ul className="flex flex-col gap-2 p-3">
        {chats.map((id, index) => (
          <li key={id}>
            <Link
              to="/workspace/$id"
              params={{ id: 'me' }}
              search={{ chat: id }}
              className="block rounded-lg border border-kumo-line px-4 py-3 hover:bg-kumo-tint"
            >
              Chat {String(index + 1)}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
