import { Hexagon } from '@phosphor-icons/react';
import { Link, useNavigate } from '@tanstack/react-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { persistSession, useAuthSession } from './AuthContext';
import ChatPane from './ChatPane';
import SiteLogo from './components/SiteLogo';
import GadgetPreview from './GadgetPreview';
import { useRpcStub } from './RpcContext';
import { CodePanel, ConnectionsPanel } from './workspace-panels';

import type { Connector, WorkshopState } from './gaos-api';

function appendAgentChunk(
  prev: Array<{ role: 'user' | 'agent'; text: string }>,
  chunk: string,
): Array<{ role: 'user' | 'agent'; text: string }> {
  const next = [...prev];
  const last = next.at(-1);
  if (last?.role === 'agent') {
    next[next.length - 1] = { role: 'agent', text: last.text + chunk };
  }
  return next;
}

function workspaceFiles(state: WorkshopState | null): Record<string, string> {
  return state?.proposalFiles ?? state?.acceptedFiles ?? {};
}

function previewGadgetId(state: WorkshopState | null): string | null {
  if (state?.proposalFiles != null) {
    return null;
  }
  return state?.gadgetId ?? null;
}

function activeCodeFile(files: Record<string, string>, codeFile: string | null): string | null {
  if (codeFile !== null && Object.hasOwn(files, codeFile)) {
    return codeFile;
  }
  return Object.keys(files)[0] ?? null;
}

export default function WorkspaceEditor({ chatId }: { chatId: string }) {
  const session = useAuthSession();
  const publicRpc = useRpcStub();
  const navigate = useNavigate();
  const stub = useMemo(
    () => publicRpc.restore(session.token, chatId),
    [chatId, publicRpc, session.token],
  );
  const chatIdRef = useRef(chatId);
  chatIdRef.current = chatId;
  const [state, setState] = useState<WorkshopState | null>(null);
  const [log, setLog] = useState<Array<{ role: 'user' | 'agent'; text: string }>>([]);
  const [status, setStatus] = useState('signed in');
  const [sending, setSending] = useState(false);
  const [tab, setTab] = useState<'app' | 'code' | 'connections'>('app');
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [vendor, setVendor] = useState('mcp');
  const [connectorName, setConnectorName] = useState('http://example.invalid/mcp');
  const [ambient, setAmbient] = useState(false);
  const [connectorError, setConnectorError] = useState<string | null>(null);
  const [codeFile, setCodeFile] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  useEffect(() => {
    persistSession(session.token, chatId);
  }, [chatId, session.token]);

  const refresh = useCallback(async () => {
    const forChat = chatId;
    const bound = stub;
    const [next, listed, messages] = await Promise.all([
      bound.getState(),
      bound.listConnectors(),
      bound.getMessages().catch(() => null),
    ]);
    if (chatIdRef.current !== forChat) {
      return next;
    }
    setState(next);
    setConnectors(listed);
    setLog(messages ?? []);
    return next;
  }, [chatId, stub]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const files = workspaceFiles(state);
  const fileNames = Object.keys(files);
  const clientJs = files['client.js'] ?? '';
  const activeFile = activeCodeFile(files, codeFile);

  useEffect(() => {
    setPreviewError(null);
  }, [chatId, clientJs]);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-kumo-base">
      {sending ? <div className="h-0.5 bg-kumo-brand" /> : null}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-kumo-line px-4 backdrop-blur-md">
        <div className="flex min-w-0 items-center gap-2">
          <Link to="/" aria-label="gaos" className="flex items-center gap-2">
            <SiteLogo size={20}>
              <Hexagon size={20} weight="bold" className="text-kumo-brand" />
            </SiteLogo>
          </Link>
          <span className="text-kumo-inactive">/</span>
          <h1 className="truncate text-sm font-semibold">gaos</h1>
        </div>
        <p className="text-xs text-kumo-subtle">{status}</p>
      </header>
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <ChatPane
          log={log}
          sending={sending}
          state={state}
          status={status}
          onAccept={async () => {
            await stub.accept();
            setStatus('accepted');
            await refresh();
          }}
          onRevert={async () => {
            await stub.revert();
            setStatus('reverted');
            await refresh();
          }}
          onSend={async (text) => {
            setSending(true);
            setLog((prev) => [...prev, { role: 'user', text }, { role: 'agent', text: '' }]);
            try {
              await stub.sendMessage(
                text,
                (chunk) => {
                  setLog((prev) => appendAgentChunk(prev, chunk));
                },
                previewError ?? undefined,
              );
              // Consumed once into the agent turn — do not re-prefix on later sends.
              setPreviewError(null);
              setStatus('proposal ready');
              await refresh();
            } finally {
              setSending(false);
            }
          }}
        />
        <section className="flex min-w-0 flex-1 flex-col">
          <div className="flex h-12 shrink-0 items-center justify-between border-b border-kumo-line px-3">
            <div className="flex gap-1 rounded-lg border border-kumo-line p-0.5">
              {(['app', 'code', 'connections'] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  className={[
                    'rounded-md px-3 py-1 text-xs capitalize',
                    tab === item ? 'bg-kumo-tint' : 'text-kumo-subtle',
                  ].join(' ')}
                  onClick={() => {
                    setTab(item);
                  }}
                >
                  {item === 'app' ? 'Preview' : item === 'code' ? 'Code' : 'Connections'}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="text-xs text-kumo-subtle"
              onClick={() => {
                void navigate({ to: '/workspaces' });
              }}
            >
              Workspaces
            </button>
          </div>
          {tab === 'app' ? (
            <div className="min-h-0 flex-1">
              <GadgetPreview
                clientJs={clientJs}
                gadgetId={previewGadgetId(state)}
                stub={stub}
                onError={setPreviewError}
              />
            </div>
          ) : null}
          {tab === 'code' ? (
            <CodePanel
              files={files}
              fileNames={fileNames}
              activeFile={activeFile}
              onSelect={setCodeFile}
            />
          ) : null}
          {tab === 'connections' ? (
            <ConnectionsPanel
              vendor={vendor}
              connectorName={connectorName}
              ambient={ambient}
              connectors={connectors}
              connectorError={connectorError}
              onVendor={setVendor}
              onName={setConnectorName}
              onAmbient={setAmbient}
              onMint={() => {
                setConnectorError(null);
                void stub
                  .mintConnector(vendor, connectorName, ambient)
                  .then(async () => {
                    setConnectors(await stub.listConnectors());
                  })
                  .catch((caught: unknown) => {
                    setConnectorError(caught instanceof Error ? caught.message : 'mint failed');
                  });
              }}
            />
          ) : null}
        </section>
      </div>
    </div>
  );
}
