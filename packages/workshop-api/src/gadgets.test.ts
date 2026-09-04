import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { extraStubs } from './extras';
import { createGadgetHost } from './gadgets';

import type { Store } from './store';
import type { Sandbox } from '@gaos/sandbox';

function fakeStore(): Store {
  return {
    ...extraStubs(),
    getConnector: () => Promise.resolve(undefined),
    accept: () => Promise.resolve('g1'),
    createChat: () => Promise.resolve('c1'),
    getState: () =>
      Promise.resolve({
        chatId: 'c1',
        acceptedFiles: null,
        gadgetId: null,
        gadgetIsolation: null,
        proposalFiles: null,
        chatBindings: {},
        gadgetBindings: {},
        ambientBindings: {},
      }),
    getGadget: () => Promise.resolve({ id: 'g1', workspaceId: 'w1', chatId: null }),
    listChats: () => Promise.resolve(['c1']),
    listGadgets: () => Promise.resolve([]),
    listConnectors: () => Promise.resolve([]),
    mintConnector: () =>
      Promise.resolve({
        id: 'c1',
        workspaceId: 'w1',
        vendor: 'mail',
        name: 'mail',
        ambient: false,
      }),
    getSession: (token) =>
      Promise.resolve(token === 't' ? { token: 't', userId: 'u1', workspaceId: 'w1' } : undefined),
    login: () => Promise.resolve({ token: 't', userId: 'u1', workspaceId: 'w1' }),
    revert: () => Promise.resolve(),
    setIsolation: vi.fn(() => Promise.resolve()),
    signup: () => Promise.resolve({ token: 't', userId: 'u1', workspaceId: 'w1' }),
    writeProposal: () => Promise.resolve(),
  };
}

describe('createGadgetHost', () => {
  let socketDir = '';
  let unixServer: http.Server | undefined;

  afterEach(async () => {
    await new Promise<void>((resolve) => {
      unixServer?.close(() => {
        resolve();
      });
      if (unixServer === undefined) {
        resolve();
      }
    });
    if (socketDir.length > 0) {
      fs.rmSync(socketDir, { recursive: true, force: true });
    }
  });

  it('keeps the sandbox after the isolation probe and proxies over the unix socket', async () => {
    socketDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gaos-gadget-'));
    const gadgetId = 'gadget-live';
    const hostSocketDir = path.join(socketDir, gadgetId);
    fs.mkdirSync(hostSocketDir, { recursive: true });
    const socketPath = path.join(hostSocketDir, 'rpc.sock');
    unixServer = http.createServer((_req, res) => {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ ok: true, from: 'gadget' }));
    });
    await new Promise<void>((resolve, reject) => {
      unixServer?.listen(socketPath, () => {
        resolve();
      });
      unixServer?.on('error', reject);
    });

    const destroy = vi.fn(() => Promise.resolve());
    const sandbox: Sandbox = {
      id: 'box-1',
      destroy,
      readFile: () => Promise.resolve(JSON.stringify({ reachedApi: false })),
      run: () => Promise.resolve({ stdout: '', stderr: '', exitCode: 0 }),
      spawn: () =>
        Promise.resolve({
          id: '1',
          wait: () => Promise.resolve({ stdout: '', stderr: '', exitCode: 0 }),
        }),
      writeFile: () => Promise.resolve(),
    };
    const store = fakeStore();
    const host = createGadgetHost({
      createSandbox: () => Promise.resolve(sandbox),
      socketRoot: socketDir,
    });
    await host.spawnGadget(store, gadgetId, { 'server.js': 'unused' });
    expect(destroy).not.toHaveBeenCalled();
    expect(store.setIsolation).toHaveBeenCalledWith(gadgetId, false);
    const proxied = await host.proxyGadget(gadgetId);
    expect(JSON.parse(proxied.body)).toEqual({ ok: true, from: 'gadget' });
  });
});
