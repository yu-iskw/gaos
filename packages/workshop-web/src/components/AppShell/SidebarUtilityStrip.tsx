import { Desktop, Moon, Plug, Sun } from '@phosphor-icons/react';
import { Link, useRouterState } from '@tanstack/react-router';

import { clearSession } from '../../AuthContext';
import { useTheme } from '../../ThemeContext';

import type { ThemeMode } from '../../theme';

const THEME_SEQUENCE: ThemeMode[] = ['system', 'light', 'dark'];

function nextThemeMode(mode: ThemeMode): ThemeMode {
  const index = THEME_SEQUENCE.indexOf(mode);
  return THEME_SEQUENCE[(index + 1) % THEME_SEQUENCE.length] ?? 'system';
}

export default function SidebarUtilityStrip() {
  const { themeMode, resolvedThemeMode, setThemeMode } = useTheme();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const nextMode = nextThemeMode(themeMode);
  const label =
    themeMode === 'system' ? `Theme: system (${resolvedThemeMode})` : `Theme: ${themeMode}`;
  return (
    <div className="flex shrink-0 items-center justify-between gap-1 border-t border-kumo-line px-2 py-2">
      <Link
        to="/gatekeepers"
        aria-label="Connectors"
        className={[
          'flex h-8 w-8 items-center justify-center rounded-md',
          pathname === '/gatekeepers'
            ? 'bg-kumo-fill text-kumo-brand'
            : 'text-kumo-inactive hover:bg-kumo-tint',
        ].join(' ')}
      >
        <Plug size={15} />
      </Link>
      <button
        type="button"
        aria-label={`${label}. Switch to ${nextMode}.`}
        className="flex h-8 w-8 items-center justify-center rounded-md text-kumo-inactive hover:bg-kumo-tint"
        onClick={() => {
          setThemeMode(nextMode);
        }}
      >
        {themeMode === 'system' ? <Desktop size={15} /> : null}
        {themeMode === 'dark' ? <Moon size={15} /> : null}
        {themeMode === 'light' ? <Sun size={15} /> : null}
      </button>
      <div className="flex items-center gap-1">
        <Link
          to="/profile"
          className="rounded-md px-2 py-1 text-xs text-kumo-subtle hover:bg-kumo-tint"
        >
          Profile
        </Link>
        <Link
          to="/admin"
          className="rounded-md px-2 py-1 text-xs text-kumo-subtle hover:bg-kumo-tint"
        >
          Admin
        </Link>
        <button
          type="button"
          className="rounded-md px-2 py-1 text-xs text-kumo-subtle hover:bg-kumo-tint"
          onClick={() => {
            clearSession();
            window.location.assign('/');
          }}
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
