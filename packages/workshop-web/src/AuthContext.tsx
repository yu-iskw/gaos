import { createContext, useContext } from 'react';

import type { AuthedRpc } from './gaos-api';
import type { ReactNode } from 'react';

const TOKEN_KEY = 'gaos.auth.token';
const CHAT_KEY = 'gaos.auth.chatId';

export type AuthSession = {
  chatId: string;
  stub: AuthedRpc;
  token: string;
};

const AuthContext = createContext<AuthSession | null>(null);

export function AuthProvider({
  children,
  session,
}: {
  children: ReactNode;
  session: AuthSession | null;
}) {
  return <AuthContext.Provider value={session}>{children}</AuthContext.Provider>;
}

export function useAuthSession(): AuthSession {
  const session = useContext(AuthContext);
  if (session === null) {
    throw new Error('useAuthSession requires a signed-in session');
  }
  return session;
}

export function useOptionalAuth(): AuthSession | null {
  return useContext(AuthContext);
}

export function persistSession(token: string, chatId: string): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(CHAT_KEY, chatId);
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(CHAT_KEY);
}

export function readPersistedSession(): { chatId: string; token: string } | null {
  const token = localStorage.getItem(TOKEN_KEY);
  const chatId = localStorage.getItem(CHAT_KEY);
  if (token === null || chatId === null || token.length === 0 || chatId.length === 0) {
    return null;
  }
  return { token, chatId };
}
