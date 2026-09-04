import { newWebSocketRpcSession } from 'capnweb';

import { apiBase } from './api';

export type AuthedRpc = {
  accept: () => Promise<string>;
  chatId: () => Promise<string>;
  getState: () => Promise<{
    acceptedFiles: Record<string, string> | null;
    gadgetId: string | null;
  }>;
  proxyGadget: (gadgetId: string) => Promise<{ body: string; status: number }>;
  revert: () => Promise<void>;
  sendMessage: (text: string) => Promise<{ text: string }>;
  token: () => Promise<string>;
  onRpcBroken?: (handler: (error: unknown) => void) => void;
};

export type PublicRpc = {
  restore: (token: string, chatId: string) => AuthedRpc;
  signup: (email: string, password: string) => AuthedRpc;
  onRpcBroken?: (handler: (error: unknown) => void) => void;
};

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
