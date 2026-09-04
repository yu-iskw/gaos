import { Button, Input } from '@cloudflare/kumo';
import { useEffect, useState, type FormEvent } from 'react';

import { useAuthSession } from '../AuthContext';

import type { Connector } from '../gaos-api';

export default function ConnectorsPage() {
  const session = useAuthSession();
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [vendor, setVendor] = useState('mcp');
  const [name, setName] = useState('');
  const [ambient, setAmbient] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invokeOut, setInvokeOut] = useState<string | null>(null);

  async function reload(): Promise<void> {
    setConnectors(await session.stub.listConnectors());
  }

  useEffect(() => {
    void reload();
  }, [session.stub]);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 px-6 py-8">
      <h1 className="text-2xl font-semibold">Connectors</h1>
      <p className="text-sm text-kumo-subtle">
        Mint a named connector. Ambient grants need an allowlist. MCP uses the name as the server
        URL.
      </p>
      <form
        className="flex flex-col gap-2 rounded-xl border border-kumo-line p-4"
        onSubmit={(event: FormEvent) => {
          event.preventDefault();
          setError(null);
          void session.stub
            .mintConnector(vendor, name, ambient)
            .then(async () => reload())
            .catch((caught: unknown) => {
              setError(caught instanceof Error ? caught.message : 'mint failed');
            });
        }}
      >
        <Input
          aria-label="vendor"
          placeholder="vendor"
          value={vendor}
          onChange={(event) => {
            setVendor(event.target.value);
          }}
        />
        <Input
          aria-label="name"
          placeholder="name"
          value={name}
          onChange={(event) => {
            setName(event.target.value);
          }}
        />
        <label className="text-sm">
          <input
            type="checkbox"
            checked={ambient}
            onChange={(event) => {
              setAmbient(event.target.checked);
            }}
          />{' '}
          ambient
        </label>
        <Button type="submit">Mint</Button>
        {error ? <p className="error text-sm text-kumo-danger">{error}</p> : null}
      </form>
      <ul className="space-y-2">
        {connectors.map((connector) => (
          <li key={connector.id} className="rounded-lg border border-kumo-line p-3 text-sm">
            <p>
              {connector.vendor} · {connector.name}
            </p>
            {connector.vendor === 'mcp' ? (
              <button
                type="button"
                className="mt-2 text-kumo-brand"
                onClick={() => {
                  void session.stub
                    .invokeConnector(connector.id, 'tools/list', '{}')
                    .then(setInvokeOut)
                    .catch((caught: unknown) => {
                      setInvokeOut(caught instanceof Error ? caught.message : 'invoke failed');
                    });
                }}
              >
                List tools
              </button>
            ) : null}
          </li>
        ))}
      </ul>
      {invokeOut ? <pre className="overflow-auto text-xs">{invokeOut}</pre> : null}
    </div>
  );
}
