import { afterEach, describe, expect, it, vi } from 'vitest';

import { createApp } from './app';
import { extraStubs } from './extras';

import type { GadgetHost } from './gadgets';
import type { Session, Store } from './store';
import type { WorkshopState } from './types';
import type { Server } from 'node:http';

function fakeGadgets(): GadgetHost {
  return {
    spawnGadget: () => Promise.resolve(),
    proxyGadget: () =>
      Promise.resolve({ status: 200, body: JSON.stringify({ ok: true, from: 'gadget' }) }),
  };
}

function memoryStore(): Store {
  const sessions = new Map<string, Session>();
  const chats = new Map<string, string>();
  const proposals = new Map<string, Record<string, string>>();
  const connectors: Array<{
    ambient: boolean;
    id: string;
    name: string;
    vendor: string;
    workspaceId: string;
  }> = [];
  let accepted: Record<string, string> | null = null;
  let gadgetId: string | null = null;
  let isolation: WorkshopState['gadgetIsolation'] = null;
  const store: Store = {
    ...extraStubs(),
    signup(email) {
      const session = { token: `t-${email}`, userId: 'u1', workspaceId: 'w1' };
      sessions.set(session.token, session);
      return Promise.resolve(session);
    },
    login(email, password) {
      if (password !== 'secret') {
        return Promise.reject(new Error('invalid credentials'));
      }
      return store.signup(email, password);
    },
    getSession(token) {
      return Promise.resolve(sessions.get(token));
    },
    createChat(session) {
      const chatId = `chat-${String(chats.size)}`;
      chats.set(chatId, session.workspaceId);
      return Promise.resolve(chatId);
    },
    writeProposal(chatId, files) {
      proposals.set(chatId, files);
      return Promise.resolve();
    },
    getState(_session, chatId) {
      return Promise.resolve({
        chatId,
        proposalFiles: proposals.get(chatId) ?? null,
        acceptedFiles: accepted,
        gadgetId,
        gadgetIsolation: isolation,
        chatBindings: {},
        gadgetBindings: {},
        ambientBindings: {},
      });
    },
    getGadget(_session, id) {
      if (gadgetId !== id) {
        return Promise.resolve(undefined);
      }
      return Promise.resolve({ id, workspaceId: 'w1', chatId: null });
    },
    listChats() {
      return Promise.resolve([...chats.keys()]);
    },
    listGadgets() {
      return Promise.resolve([]);
    },
    listConnectors() {
      return Promise.resolve([...connectors]);
    },
    getConnector(_session, id) {
      const found = connectors.find((row) => row.id === id);
      if (found === undefined) {
        return Promise.resolve(undefined);
      }
      return Promise.resolve({ ...found, secret: null });
    },
    mintConnector(_session, input) {
      const connector = {
        id: 'c1',
        workspaceId: 'w1',
        vendor: input.vendor,
        name: input.name,
        ambient: input.ambient,
      };
      connectors.push(connector);
      return Promise.resolve(connector);
    },
    accept(_session, chatId) {
      const files = proposals.get(chatId);
      if (files === undefined) {
        return Promise.reject(new Error('no proposal'));
      }
      accepted = files;
      gadgetId = 'gadget-1';
      proposals.delete(chatId);
      return Promise.resolve('gadget-1');
    },
    revert(_session, chatId) {
      proposals.delete(chatId);
      return Promise.resolve();
    },
    setIsolation(_gadgetId, reachedApi) {
      isolation = { reachedApi };
      return Promise.resolve();
    },
  };
  return store;
}

async function listen(server: Server): Promise<number> {
  await new Promise<void>((resolve) => {
    server.listen(0, resolve);
  });
  const address = server.address();
  if (address === null || typeof address === 'string') {
    throw new Error('expected tcp');
  }
  return address.port;
}

describe('createApp', () => {
  let server: Server | undefined;

  afterEach(() => {
    server?.close();
  });

  it('answers health, signup, chat, preview, accept, proxy, and revert', async () => {
    const store = memoryStore();
    const gadgets = fakeGadgets();
    const spawn = vi.spyOn(gadgets, 'spawnGadget');
    server = createApp({
      store,
      agentUrl: 'http://agent-host:8081',
      internalToken: 'tok',
      gadgets,
    });
    const port = await listen(server);
    const base = `http://127.0.0.1:${String(port)}`;

    const health = await fetch(`${base}/health`);
    await expect(health.json()).resolves.toEqual({ ok: true, service: 'workshop-api' });

    const signup = await fetch(`${base}/signup`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'a@b.c', password: 'secret' }),
    });
    const session = (await signup.json()) as { token: string };
    const auth = { authorization: `Bearer ${session.token}`, 'content-type': 'application/json' };

    const chat = await fetch(`${base}/chats`, { method: 'POST', headers: auth, body: '{}' });
    const { chatId } = (await chat.json()) as { chatId: string };

    const proposal = await fetch(`${base}/internal/proposals`, {
      method: 'POST',
      headers: { authorization: 'Bearer tok', 'content-type': 'application/json' },
      body: JSON.stringify({
        chatId,
        files: { 'client.js': "document.body.textContent='hello from gadget';" },
      }),
    });
    expect(proposal.status).toBe(200);

    const preview = await fetch(`${base}/chats/${chatId}/preview`, { headers: auth });
    expect(await preview.text()).toContain('hello from gadget');

    const accept = await fetch(`${base}/chats/${chatId}/accept`, {
      method: 'POST',
      headers: auth,
      body: '{}',
    });
    expect(accept.status).toBe(200);
    expect(spawn).toHaveBeenCalled();

    const proxied = await fetch(`${base}/gadgets/gadget-1/rpc`, { headers: auth });
    expect(proxied.status).toBe(200);
    await expect(proxied.json()).resolves.toEqual({ ok: true, from: 'gadget' });

    await store.writeProposal(chatId, { 'client.js': 'draft' });
    const revert = await fetch(`${base}/chats/${chatId}/revert`, {
      method: 'POST',
      headers: auth,
      body: '{}',
    });
    expect(revert.status).toBe(200);
    const sessionRow = await store.getSession(session.token);
    if (sessionRow === undefined) {
      throw new Error('missing session');
    }
    const listed = await fetch(`${base}/chats`, { headers: auth });
    expect(listed.status).toBe(200);

    const ambientDenied = await fetch(`${base}/connectors`, {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ vendor: 'mail', name: 'mail', ambient: true }),
    });
    expect(ambientDenied.status).toBe(400);

    const minted = await fetch(`${base}/connectors`, {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ vendor: 'mail', name: 'mail', ambient: false }),
    });
    expect(minted.status).toBe(200);
    const connectors = await fetch(`${base}/connectors`, { headers: auth });
    expect(connectors.status).toBe(200);
    const listedConnectors = (await connectors.json()) as { connectors: { vendor: string }[] };
    expect(listedConnectors.connectors).toEqual([
      { id: 'c1', workspaceId: 'w1', vendor: 'mail', name: 'mail', ambient: false },
    ]);
    const state = await store.getState(sessionRow, chatId);
    expect(state.proposalFiles).toBeNull();
  });

  it('rejects missing auth', async () => {
    server = createApp({
      store: memoryStore(),
      agentUrl: 'http://agent-host:8081',
      internalToken: 'tok',
      gadgets: fakeGadgets(),
    });
    const port = await listen(server);
    const res = await fetch(`http://127.0.0.1:${String(port)}/chats`, { method: 'POST' });
    expect(res.status).toBe(401);
  });

  it('logs in and forwards chat messages to the agent host', async () => {
    const store = memoryStore();
    await store.signup('a@b.c', 'secret');
    server = createApp({
      store,
      agentUrl: 'http://agent-host:8081',
      internalToken: 'tok',
      gadgets: fakeGadgets(),
    });
    const port = await listen(server);
    const base = `http://127.0.0.1:${String(port)}`;
    const originalFetch = globalThis.fetch;
    globalThis.fetch = () =>
      Promise.resolve(new Response(JSON.stringify({ text: 'proposed' }), { status: 200 }));
    try {
      const login = await fetch(`${base}/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: 'a@b.c', password: 'secret' }),
      });
      const session = (await login.json()) as { token: string };
      const auth = { authorization: `Bearer ${session.token}`, 'content-type': 'application/json' };
      const chat = await fetch(`${base}/chats`, { method: 'POST', headers: auth, body: '{}' });
      const { chatId } = (await chat.json()) as { chatId: string };
      const message = await fetch(`${base}/chats/${chatId}/messages`, {
        method: 'POST',
        headers: auth,
        body: JSON.stringify({ text: 'write a gadget' }),
      });
      expect(message.status).toBe(200);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('requires IAP assertion when audience is configured', async () => {
    server = createApp({
      store: memoryStore(),
      agentUrl: 'http://agent-host:8081',
      internalToken: 'tok',
      gadgets: fakeGadgets(),
      iapAudience: '/projects/1/iap',
      verifyIap: () => Promise.resolve(),
    });
    const port = await listen(server);
    const base = `http://127.0.0.1:${String(port)}`;
    const denied = await fetch(`${base}/chats`, { method: 'POST' });
    expect(denied.status).toBe(401);
    const health = await fetch(`${base}/health`);
    expect(health.status).toBe(200);
    const allowed = await fetch(`${base}/health`, {
      headers: { 'x-goog-iap-jwt-assertion': 'token' },
    });
    expect(allowed.status).toBe(200);
  });

  it('persists context, schedules, shares, and MCP invokes', async () => {
    const store = memoryStore();
    const session = await store.signup('a@b.c', 'secret');
    const chatId = await store.createChat(session);
    server = createApp({
      store,
      agentUrl: 'http://agent-host:8081',
      internalToken: 'tok',
      gadgets: fakeGadgets(),
    });
    const port = await listen(server);
    const base = `http://127.0.0.1:${String(port)}`;
    const auth = { authorization: `Bearer ${session.token}`, 'content-type': 'application/json' };
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (input, init) => {
      const url = input instanceof URL ? input.href : typeof input === 'string' ? input : '';
      if (url.startsWith(base)) {
        return originalFetch(input, init);
      }
      if (url.includes('/agent/turn')) {
        return Promise.resolve(
          new Response(JSON.stringify({ text: 'scheduled' }), { status: 200 }),
        );
      }
      return Promise.resolve(new Response('{"jsonrpc":"2.0","result":[]}', { status: 200 }));
    };
    try {
      const context = await fetch(`${base}/context`, {
        method: 'POST',
        headers: auth,
        body: JSON.stringify({ title: 'note', body: 'hello' }),
      });
      expect(context.status).toBe(200);
      const listed = await fetch(`${base}/context`, { headers: auth });
      expect(((await listed.json()) as { docs: unknown[] }).docs).toHaveLength(1);

      const schedule = await fetch(`${base}/schedules`, {
        method: 'POST',
        headers: auth,
        body: JSON.stringify({ cron: '0 9 * * *', chatId, message: 'hi' }),
      });
      expect(schedule.status).toBe(200);
      const row = (await schedule.json()) as { id: string };

      const fire = await fetch(`${base}/internal/schedules/fire`, {
        method: 'POST',
        headers: { authorization: 'Bearer tok', 'content-type': 'application/json' },
        body: JSON.stringify({ id: row.id }),
      });
      expect(fire.status).toBe(200);

      const share = await fetch(`${base}/chats/${chatId}/share`, { method: 'POST', headers: auth });
      const shared = (await share.json()) as { token: string };
      const publicShare = await fetch(`${base}/shares/${shared.token}`);
      expect(publicShare.status).toBe(200);

      await store.mintConnector(session, {
        vendor: 'mcp',
        name: 'http://mcp.example/sse',
        ambient: false,
      });
      const invoked = await fetch(`${base}/connectors/c1/invoke`, {
        method: 'POST',
        headers: auth,
        body: JSON.stringify({ method: 'tools/list', params: {} }),
      });
      expect(invoked.status).toBe(200);
      const me = await fetch(`${base}/me`, { headers: auth });
      expect(((await me.json()) as { email: string }).email).toBe('a@b.c');
      const admin = await fetch(`${base}/admin/config`, { headers: auth });
      expect(admin.status).toBe(200);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
