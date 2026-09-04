import { RouterProvider } from '@tanstack/react-router';
import { StrictMode, useCallback, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';

import {
  AuthProvider,
  persistSession,
  readPersistedSession,
  type AuthSession,
} from './AuthContext';
import { createWorkshopRouter } from './router';
import { connectPublic, disposeRpc } from './rpc-client';
import { RpcContext } from './RpcContext';
import { applyThemeMode, readThemeMode } from './theme';
import { ThemeProvider } from './ThemeContext';

import './styles.css';

applyThemeMode(readThemeMode());

function App() {
  const [publicRpc, setPublicRpc] = useState(() => ({ stub: connectPublic() }));
  const [session, setSession] = useState<AuthSession | null>(null);
  const [connectionLost, setConnectionLost] = useState(false);

  const watchBroken = useCallback(() => {
    publicRpc.stub.onRpcBroken?.(() => {
      setConnectionLost(true);
      disposeRpc(publicRpc.stub);
      const next = connectPublic();
      setPublicRpc({ stub: next });
      const persisted = readPersistedSession();
      if (persisted !== null) {
        const authed = next.restore(persisted.token, persisted.chatId);
        setSession({ token: persisted.token, chatId: persisted.chatId, stub: authed });
      }
      setConnectionLost(false);
    });
  }, [publicRpc.stub]);

  useEffect(() => {
    watchBroken();
  }, [watchBroken]);

  useEffect(() => {
    const persisted = readPersistedSession();
    if (persisted === null) {
      return;
    }
    const authed = publicRpc.stub.restore(persisted.token, persisted.chatId);
    setSession({ token: persisted.token, chatId: persisted.chatId, stub: authed });
  }, [publicRpc.stub]);

  const onAuthed = useCallback(
    (token: string, chatId: string) => {
      persistSession(token, chatId);
      const authed = publicRpc.stub.restore(token, chatId);
      setSession({ token, chatId, stub: authed });
      return Promise.resolve();
    },
    [publicRpc.stub],
  );

  const router = useMemo(() => createWorkshopRouter({ onAuthed }), [onAuthed]);

  return (
    <ThemeProvider>
      <RpcContext.Provider value={{ stub: publicRpc.stub, connectionLost }}>
        <AuthProvider session={session}>
          <RouterProvider router={router} />
        </AuthProvider>
      </RpcContext.Provider>
    </ThemeProvider>
  );
}

const root = document.getElementById('root');
if (root === null) {
  throw new Error('missing #root');
}
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
