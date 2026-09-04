import type { Connector } from './gaos-api';
import type { FormEvent } from 'react';

export function CodePanel({
  activeFile,
  fileNames,
  files,
  onSelect,
}: {
  activeFile: string | null;
  fileNames: string[];
  files: Record<string, string>;
  onSelect: (name: string) => void;
}) {
  const source = activeFile === null ? 'No files yet.' : files[activeFile];
  return (
    <div className="flex min-h-0 flex-1">
      <ul className="w-48 overflow-y-auto border-r border-kumo-line p-2 text-sm">
        {fileNames.map((name) => (
          <li key={name}>
            <button
              type="button"
              className={name === activeFile ? 'font-medium text-kumo-brand' : ''}
              onClick={() => {
                onSelect(name);
              }}
            >
              {name}
            </button>
          </li>
        ))}
      </ul>
      <pre className="min-w-0 flex-1 overflow-auto p-3 text-xs">{source}</pre>
    </div>
  );
}

export function ConnectionsPanel({
  ambient,
  connectorError,
  connectorName,
  connectors,
  onAmbient,
  onMint,
  onName,
  onVendor,
  vendor,
}: {
  ambient: boolean;
  connectorError: string | null;
  connectorName: string;
  connectors: Connector[];
  onAmbient: (value: boolean) => void;
  onMint: () => void;
  onName: (value: string) => void;
  onVendor: (value: string) => void;
  vendor: string;
}) {
  return (
    <form
      className="flex flex-col gap-2 p-4"
      onSubmit={(event: FormEvent) => {
        event.preventDefault();
        onMint();
      }}
    >
      <h2 className="text-sm font-semibold">Connectors</h2>
      <input
        aria-label="vendor"
        className="rounded-md border border-kumo-line px-2 py-1"
        placeholder="vendor"
        value={vendor}
        onChange={(event) => {
          onVendor(event.target.value);
        }}
      />
      <input
        aria-label="name"
        className="rounded-md border border-kumo-line px-2 py-1"
        placeholder="name"
        value={connectorName}
        onChange={(event) => {
          onName(event.target.value);
        }}
      />
      <label className="text-sm">
        <input
          type="checkbox"
          checked={ambient}
          onChange={(event) => {
            onAmbient(event.target.checked);
          }}
        />{' '}
        ambient
      </label>
      <button
        id="mint"
        type="submit"
        className="w-fit rounded-md bg-kumo-brand px-3 py-1 text-sm text-white"
      >
        Mint
      </button>
      {connectorError ? <p className="error text-sm text-kumo-danger">{connectorError}</p> : null}
      <ul>
        {connectors.map((connector) => (
          <li key={connector.id}>
            {connector.vendor} · {connector.name}
          </li>
        ))}
      </ul>
    </form>
  );
}
