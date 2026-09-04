#!/usr/bin/env node
import { createApp } from './app';
import { createPool, migrate } from './db';
import { createGadgetHost } from './gadgets';
import { attachRpc } from './rpc';
import { createStore } from './store';

const port = Number(process.env['PORT'] ?? '8080');

async function main(): Promise<void> {
  const databaseUrl = process.env['DATABASE_URL'];
  const agentUrl = process.env['AGENT_URL'] ?? 'http://agent-host:8081';
  const internalToken = process.env['INTERNAL_TOKEN'] ?? 'dev-internal-token';
  if (databaseUrl === undefined) {
    throw new Error('DATABASE_URL is required');
  }
  const pool = createPool(databaseUrl);
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      await migrate(pool);
      break;
    } catch (err) {
      if (attempt === 29) {
        throw err;
      }
      await new Promise((resolve) => {
        setTimeout(resolve, 1000);
      });
    }
  }
  const store = createStore(pool);
  const gadgets = createGadgetHost();
  const config = { store, agentUrl, internalToken, gadgets };
  const server = createApp(config);
  attachRpc(server, config);
  await new Promise<void>((resolve) => {
    server.listen(port, () => {
      resolve();
    });
  });
}

void main();
