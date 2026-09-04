import { Button, Input } from '@cloudflare/kumo';
import { useEffect, useState } from 'react';

import { useAuthSession } from '../AuthContext';

import type { AdminConfig, ContextDoc, ScheduleRecord } from '../gaos-api';

export function ProfilePage() {
  const session = useAuthSession();
  const [email, setEmail] = useState('');
  const [share, setShare] = useState<string | null>(null);

  useEffect(() => {
    void session.stub.getUserEmail().then(setEmail);
  }, [session.stub]);

  return (
    <div className="mx-auto max-w-lg px-6 py-8">
      <h1 className="text-2xl font-semibold">Profile</h1>
      <p className="mt-2 text-sm">{email}</p>
      <Button
        className="mt-4"
        type="button"
        onClick={() => {
          void session.stub.createShare().then((record) => {
            setShare(record.token);
          });
        }}
      >
        Share this chat
      </Button>
      {share ? <p className="mt-2 break-all text-xs">Share token: {share}</p> : null}
    </div>
  );
}

export function ProvidersPage() {
  const iap = import.meta.env['VITE_IAP_AUDIENCE'] as string | undefined;
  return (
    <div className="mx-auto max-w-lg px-6 py-8">
      <h1 className="text-2xl font-semibold">Providers</h1>
      <p className="mt-2 text-sm text-kumo-subtle">
        {typeof iap === 'string' && iap.length > 0
          ? 'Identity-Aware Proxy is configured for this workshop.'
          : 'Password sign-in is enabled. IAP is off in this deployment.'}
      </p>
    </div>
  );
}

export function AdminPage() {
  const session = useAuthSession();
  const [config, setConfig] = useState<AdminConfig>({ siteName: 'gaos', accent: '#ff4801' });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void session.stub.getAdminConfig().then(setConfig);
  }, [session.stub]);

  return (
    <form
      className="mx-auto flex max-w-lg flex-col gap-3 px-6 py-8"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        void session.stub
          .updateAdminConfig(config)
          .then(setConfig)
          .catch((caught: unknown) => {
            setError(caught instanceof Error ? caught.message : 'Could not save');
          });
      }}
    >
      <h1 className="text-2xl font-semibold">Admin</h1>
      <Input
        aria-label="site name"
        value={config.siteName}
        onChange={(event) => {
          setConfig({ ...config, siteName: event.target.value });
        }}
      />
      <Input
        aria-label="accent"
        value={config.accent}
        onChange={(event) => {
          setConfig({ ...config, accent: event.target.value });
        }}
      />
      <Button type="submit">Save</Button>
      {error ? <p className="text-sm text-kumo-danger">{error}</p> : null}
    </form>
  );
}

export function ContextPage() {
  const session = useAuthSession();
  const [docs, setDocs] = useState<ContextDoc[]>([]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  useEffect(() => {
    void session.stub.listContext().then(setDocs);
  }, [session.stub]);

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <h1 className="text-2xl font-semibold">Context</h1>
      <form
        className="mt-4 flex flex-col gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void session.stub.writeContext(title, body).then(async () => {
            setTitle('');
            setBody('');
            setDocs(await session.stub.listContext());
          });
        }}
      >
        <Input
          placeholder="title"
          value={title}
          onChange={(event) => {
            setTitle(event.target.value);
          }}
        />
        <textarea
          className="min-h-[6rem] rounded-md border border-kumo-line p-2 text-sm"
          placeholder="body"
          value={body}
          onChange={(event) => {
            setBody(event.target.value);
          }}
        />
        <Button type="submit">Save document</Button>
      </form>
      <ul className="mt-6 space-y-3">
        {docs.map((doc) => (
          <li key={doc.id} className="rounded-lg border border-kumo-line p-3">
            <p className="font-medium">{doc.title}</p>
            <p className="text-sm text-kumo-subtle">{doc.body}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SchedulesPanel() {
  const session = useAuthSession();
  const [rows, setRows] = useState<ScheduleRecord[]>([]);
  const [cron, setCron] = useState('0 9 * * *');
  const [message, setMessage] = useState('scheduled turn');

  useEffect(() => {
    void session.stub.listSchedules().then(setRows);
  }, [session.stub]);

  return (
    <div className="mt-8">
      <h2 className="text-lg font-semibold">Schedules</h2>
      <form
        className="mt-2 flex flex-col gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void session.stub.createSchedule(cron, session.chatId, message).then(async () => {
            setRows(await session.stub.listSchedules());
          });
        }}
      >
        <Input
          value={cron}
          onChange={(event) => {
            setCron(event.target.value);
          }}
        />
        <Input
          value={message}
          onChange={(event) => {
            setMessage(event.target.value);
          }}
        />
        <Button type="submit">Create schedule</Button>
      </form>
      <ul className="mt-3 text-sm">
        {rows.map((row) => (
          <li key={row.id}>
            {row.cron} → {row.message}
          </li>
        ))}
      </ul>
    </div>
  );
}
