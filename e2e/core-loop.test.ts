import { randomUUID } from 'node:crypto';

import { beforeAll, describe, expect, it } from 'vitest';

const apiUrl = process.env['WORKSHOP_API_URL'] ?? 'http://127.0.0.1:8080';

type Session = { token: string };
type Chat = { chatId: string };
type State = {
  acceptedFiles: Record<string, string> | null;
  gadgetId: string | null;
  gadgetIsolation: { reachedApi: boolean } | null;
  proposalFiles: Record<string, string> | null;
};

async function post(path: string, body: unknown, token?: string): Promise<Response> {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (token !== undefined) {
    headers.authorization = `Bearer ${token}`;
  }
  return fetch(`${apiUrl}${path}`, { method: 'POST', headers, body: JSON.stringify(body) });
}

async function get(path: string, token: string): Promise<Response> {
  return fetch(`${apiUrl}${path}`, { headers: { authorization: `Bearer ${token}` } });
}

async function readOkJson<T>(res: Response): Promise<T> {
  const raw = await res.text();
  if (!res.ok) {
    throw new Error(`HTTP ${String(res.status)} ${raw}`);
  }
  return JSON.parse(raw) as T;
}

describe('core loop', () => {
  let token = '';
  let chatId = '';

  beforeAll(async () => {
    const email = `user-${randomUUID()}@example.com`;
    const session = await readOkJson<Session>(
      await post('/signup', { email, password: 'correct-horse' }),
    );
    token = session.token;
    const chat = await readOkJson<Chat>(await post('/chats', {}, token));
    chatId = chat.chatId;
  });

  it('password signup issues a session', () => {
    expect(token.length).toBeGreaterThan(8);
    expect(chatId.length).toBeGreaterThan(0);
  });

  it('chat writes a gadget as a proposal via the agent host', async () => {
    await readOkJson(await post(`/chats/${chatId}/messages`, { text: 'write a gadget' }, token));
    const state = await readOkJson<State>(await get(`/chats/${chatId}`, token));
    expect(state.proposalFiles).not.toBeNull();
    expect(state.proposalFiles?.['client.js']).toContain('hello from gadget');
    expect(state.proposalFiles?.['server.js']).toContain('isolation-result.json');
  });

  it('SPA iframes uncommitted client.js', async () => {
    const preview = await get(`/chats/${chatId}/preview`, token);
    expect(preview.ok).toBe(true);
    expect(preview.headers.get('content-type')).toContain('text/html');
    const html = await preview.text();
    expect(html).toContain('hello from gadget');
    expect(html).toContain('iframe');
  });

  it('accept persists and revert drops the draft', async () => {
    const accepted = await readOkJson<{ gadgetId: string }>(
      await post(`/chats/${chatId}/accept`, {}, token),
    );
    const afterAccept = await readOkJson<State>(await get(`/chats/${chatId}`, token));
    expect(afterAccept.proposalFiles).toBeNull();
    expect(afterAccept.acceptedFiles?.['client.js']).toContain('hello from gadget');
    expect(afterAccept.gadgetId).toBe(accepted.gadgetId);

    const proxied = await readOkJson<{ from: string; ok: boolean }>(
      await get(`/gadgets/${accepted.gadgetId}/rpc`, token),
    );
    expect(proxied).toEqual({ ok: true, from: 'gadget' });

    await readOkJson(await post(`/chats/${chatId}/messages`, { text: 'another draft' }, token));
    const drafted = await readOkJson<State>(await get(`/chats/${chatId}`, token));
    expect(drafted.proposalFiles).not.toBeNull();

    await readOkJson(await post(`/chats/${chatId}/revert`, {}, token));
    const afterRevert = await readOkJson<State>(await get(`/chats/${chatId}`, token));
    expect(afterRevert.proposalFiles).toBeNull();
    expect(afterRevert.acceptedFiles?.['client.js']).toContain('hello from gadget');
  });

  it('keeps a second chat independent of the first gadget', async () => {
    const other = await readOkJson<Chat>(await post('/chats', {}, token));
    const listed = await readOkJson<{ chatIds: string[] }>(await get('/chats', token));
    expect(listed.chatIds).toContain(chatId);
    expect(listed.chatIds).toContain(other.chatId);
    const otherState = await readOkJson<State>(await get(`/chats/${other.chatId}`, token));
    expect(otherState.gadgetId).toBeNull();
    const gadgets = await readOkJson<{ gadgets: { id: string; chatId: string | null }[] }>(
      await get('/gadgets', token),
    );
    expect(gadgets.gadgets.some((gadget) => gadget.chatId === chatId)).toBe(true);
  });

  it('mints connectors only in workshop-api and denies ambient by default', async () => {
    const denied = await post(
      '/connectors',
      { vendor: 'mail', name: 'mail', ambient: true },
      token,
    );
    expect(denied.status).toBe(400);
    const minted = await readOkJson<{ ambient: boolean; vendor: string }>(
      await post('/connectors', { vendor: 'mail', name: 'mail', ambient: false }, token),
    );
    expect(minted).toMatchObject({ vendor: 'mail', ambient: false });
    const listed = await readOkJson<{ connectors: { vendor: string }[] }>(
      await get('/connectors', token),
    );
    expect(listed.connectors.some((connector) => connector.vendor === 'mail')).toBe(true);
  });

  it('gadget server.js cannot reach workshop-api', async () => {
    const state = await readOkJson<State>(await get(`/chats/${chatId}`, token));
    expect(state.gadgetIsolation).not.toBeNull();
    expect(state.gadgetIsolation?.reachedApi).toBe(false);
  });
}, 120_000);
