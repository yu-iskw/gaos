export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedThemeMode = 'light' | 'dark';

const THEME_MODE_STORAGE_KEY = 'gadgets:theme-mode';

function isThemeMode(value: string | null): value is ThemeMode {
  return value === 'light' || value === 'dark' || value === 'system';
}

function getSystemThemeMode(): ResolvedThemeMode {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function readThemeMode(): ThemeMode {
  try {
    const stored = window.localStorage.getItem(THEME_MODE_STORAGE_KEY);
    return isThemeMode(stored) ? stored : 'system';
  } catch {
    return 'system';
  }
}

export function writeThemeMode(mode: ThemeMode): void {
  try {
    window.localStorage.setItem(THEME_MODE_STORAGE_KEY, mode);
  } catch {
    return;
  }
}

export function resolveThemeMode(mode: ThemeMode): ResolvedThemeMode {
  return mode === 'system' ? getSystemThemeMode() : mode;
}

export function applyThemeMode(mode: ThemeMode): ResolvedThemeMode {
  const resolved = resolveThemeMode(mode);
  const root = document.documentElement;
  root.setAttribute('data-mode', resolved);
  root.style.colorScheme = resolved;
  return resolved;
}
