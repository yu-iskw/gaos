import { useNavigate } from '@tanstack/react-router';
import { useEffect, useMemo, useState } from 'react';

const DESTINATIONS = [
  { label: 'Home', to: '/' },
  { label: 'Workspaces', to: '/workspaces' },
  { label: 'Blueprints', to: '/blueprints' },
  { label: 'Outputs', to: '/outputs' },
  { label: 'Explore', to: '/explore' },
  { label: 'Connectors', to: '/gatekeepers' },
  { label: 'Context', to: '/context' },
  { label: 'Profile', to: '/profile' },
  { label: 'Providers', to: '/providers' },
  { label: 'Admin', to: '/admin' },
] as const;

export default function CommandPalette({ onClose, open }: { onClose: () => void; open: boolean }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length === 0) {
      return [...DESTINATIONS];
    }
    return DESTINATIONS.filter((item) => item.label.toLowerCase().includes(q));
  }, [query]);

  useEffect(() => {
    if (!open) {
      setQuery('');
    }
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 pt-24"
      role="dialog"
    >
      <div className="w-full max-w-lg rounded-xl border border-kumo-line bg-kumo-base p-3 shadow-lg">
        <input
          autoFocus
          aria-label="Search"
          className="w-full rounded-md border border-kumo-line bg-kumo-control px-3 py-2 text-sm"
          placeholder="Go to…"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
          }}
        />
        <ul className="mt-2 max-h-64 overflow-y-auto">
          {matches.map((item) => (
            <li key={item.to}>
              <button
                type="button"
                className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-kumo-tint"
                onClick={() => {
                  void navigate({ to: item.to });
                  onClose();
                }}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
        <button type="button" className="mt-2 text-xs text-kumo-subtle" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
