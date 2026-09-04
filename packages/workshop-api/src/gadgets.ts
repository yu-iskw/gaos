import fs from 'node:fs';
import path from 'node:path';

import { createCloudRunSandbox, createDockerSandbox } from '@gaos/sandbox';

import { proxyUnixHttp } from './gadget-proxy';
import { parseIsolationJson } from './isolation';

import type { UnixHttpResult } from './gadget-proxy';
import type { Store } from './store';
import type { CreateSandboxOptions, Sandbox } from '@gaos/sandbox';

const SOCKET_FILE = 'rpc.sock';
const SANDBOX_MOUNT = '/mnt/gadget';

export type GadgetHost = {
  proxyGadget: (gadgetId: string) => Promise<UnixHttpResult>;
  spawnGadget: (store: Store, gadgetId: string, files: Record<string, string>) => Promise<void>;
};

type GadgetHostOptions = {
  createSandbox?: (options: CreateSandboxOptions) => Promise<Sandbox>;
  socketRoot?: string;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function defaultSocketRoot(): string {
  return process.env['GAOS_GADGET_SOCKET_ROOT'] ?? '/tmp/gaos-gadgets';
}

function defaultCreateSandbox(options: CreateSandboxOptions): Promise<Sandbox> {
  if (process.env['GAOS_SANDBOX'] === 'cloudrun') {
    return createCloudRunSandbox(options);
  }
  return createDockerSandbox(options);
}

export function createGadgetHost(options: GadgetHostOptions = {}): GadgetHost {
  const createSandbox = options.createSandbox ?? defaultCreateSandbox;
  const socketRoot = options.socketRoot ?? defaultSocketRoot();
  const live = new Map<string, { socketPath: string }>();

  return {
    async spawnGadget(store, gadgetId, files) {
      const hostDir = path.join(socketRoot, gadgetId);
      fs.mkdirSync(hostDir, { recursive: true });
      const socketPath = path.join(hostDir, SOCKET_FILE);
      const sandbox = await createSandbox({
        binds: [{ hostPath: hostDir, sandboxPath: SANDBOX_MOUNT }],
      });
      for (const [filePath, content] of Object.entries(files)) {
        await sandbox.writeFile(filePath, content);
      }
      await sandbox.spawn(['node', 'server.js']);
      let reachedApi = false;
      for (let attempt = 0; attempt < 20; attempt += 1) {
        try {
          const raw = await sandbox.readFile('/workspace/isolation-result.json');
          reachedApi = parseIsolationJson(raw);
          break;
        } catch {
          await sleep(250);
        }
      }
      await store.setIsolation(gadgetId, reachedApi);
      for (let attempt = 0; attempt < 20; attempt += 1) {
        if (fs.existsSync(socketPath)) {
          break;
        }
        await sleep(250);
      }
      live.set(gadgetId, { socketPath });
    },

    async proxyGadget(gadgetId) {
      const entry = live.get(gadgetId);
      if (entry === undefined) {
        throw new Error('gadget not running');
      }
      return proxyUnixHttp(entry.socketPath, '/');
    },
  };
}
