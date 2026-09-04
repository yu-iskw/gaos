import { List, X } from '@phosphor-icons/react';
import { useRouterState } from '@tanstack/react-router';
import { useCallback, useEffect, useState } from 'react';

import { useConnectionLost } from '../../RpcContext';
import ReconnectingChip from '../ReconnectingChip';

import { OPEN_COMMAND_PALETTE_EVENT } from './command-palette-bus';
import CommandPalette from './CommandPalette';
import Sidebar from './Sidebar';

const STORAGE_KEY_COLLAPSED = 'gadgets:sidebar-collapsed';

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY_COLLAPSED) === '1';
  } catch {
    return false;
  }
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const connectionLost = useConnectionLost();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY_COLLAPSED, next ? '1' : '0');
      } catch {
        return next;
      }
      return next;
    });
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && (event.key === 'k' || event.key === 'K')) {
        event.preventDefault();
        setPaletteOpen((open) => !open);
      }
    };
    const onOpen = () => {
      setPaletteOpen(true);
    };
    document.addEventListener('keydown', onKey);
    window.addEventListener(OPEN_COMMAND_PALETTE_EVENT, onOpen);
    return () => {
      document.removeEventListener('keydown', onKey);
      window.removeEventListener(OPEN_COMMAND_PALETTE_EVENT, onOpen);
    };
  }, []);

  return (
    <div className="flex h-full min-h-0 w-full overflow-hidden bg-kumo-base">
      <div className="hidden h-full md:flex">
        <Sidebar collapsed={collapsed} onToggleCollapsed={toggleCollapsed} />
      </div>
      {mobileOpen ? (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/30 md:hidden"
            onClick={() => {
              setMobileOpen(false);
            }}
          />
          <div className="fixed inset-y-0 left-0 z-50 md:hidden">
            <Sidebar collapsed={false} onToggleCollapsed={() => setMobileOpen(false)} />
          </div>
        </>
      ) : null}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-kumo-line px-3 md:hidden">
          <button
            type="button"
            aria-label="Open menu"
            className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-kumo-tint"
            onClick={() => {
              setMobileOpen(true);
            }}
          >
            {mobileOpen ? <X size={16} /> : <List size={16} />}
          </button>
          {connectionLost ? (
            <ReconnectingChip />
          ) : (
            <p className="text-xs text-kumo-subtle">signed in</p>
          )}
        </div>
        <div className="hidden h-8 shrink-0 items-center justify-end px-4 md:flex">
          {connectionLost ? (
            <ReconnectingChip />
          ) : (
            <p className="text-xs text-kumo-subtle">signed in</p>
          )}
        </div>
        <div className="min-h-0 flex-1 overflow-auto">{children}</div>
      </div>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}
