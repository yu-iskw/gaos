import { createContext, useContext } from 'react';

import type { PublicRpc } from './gaos-api';

export const RpcContext = createContext<{
  connectionLost: boolean;
  stub: PublicRpc;
} | null>(null);

export function useRpcStub(): PublicRpc {
  const ctx = useContext(RpcContext);
  if (!ctx) {
    throw new Error('useRpcStub must be used within RpcContext.Provider');
  }
  return ctx.stub;
}

export function useConnectionLost(): boolean {
  return useContext(RpcContext)?.connectionLost ?? false;
}
