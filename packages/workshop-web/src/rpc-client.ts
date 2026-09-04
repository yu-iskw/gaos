import { newWebSocketRpcSession } from 'capnweb';

import { apiBase } from './api';

import type { PublicRpc } from './gaos-api';

export type { AuthedRpc, Connector, PublicRpc, WorkshopState } from './gaos-api';

export function rpcWsUrl(): string {
  return `${apiBase().replace(/^http/u, 'ws')}/rpc`;
}

export function connectPublic(): PublicRpc {
  return newWebSocketRpcSession(rpcWsUrl()) as unknown as PublicRpc;
}

export function disposeRpc(stub: object | null): void {
  const disposable = stub as { [Symbol.dispose]?: () => void };
  disposable[Symbol.dispose]?.();
}
