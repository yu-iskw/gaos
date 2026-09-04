import { createServer } from 'node:http';

import { requestAgentTurn } from './agent-client';
import { readJson, sendJson, stringField } from './http-util';
import { ambientVendorsFromEnv, assertAmbientAllowed } from './minting';

import type { GadgetHost } from './gadgets';
import type { Session, Store } from './store';
import type { WorkshopState } from './types';
import type { IncomingMessage, Server as HttpServer, ServerResponse } from 'node:http';

export type AppConfig = {
  agentUrl: string;
  gadgets: GadgetHost;
  internalToken: string;
  store: Store;
};

function cors(res: ServerResponse): void {
  res.setHeader('access-control-allow-origin', '*');
  res.setHeader('access-control-allow-headers', 'content-type, authorization');
  res.setHeader('access-control-allow-methods', 'GET,POST,OPTIONS');
}

function bearer(req: IncomingMessage): string | undefined {
  const header = req.headers.authorization;
  if (header === undefined || !header.startsWith('Bearer ')) {
    return undefined;
  }
  return header.slice('Bearer '.length);
}

async function requireSession(req: IncomingMessage, store: Store): Promise<Session> {
  const token = bearer(req);
  if (token === undefined) {
    throw new Error('unauthorized');
  }
  const session = await store.getSession(token);
  if (session === undefined) {
    throw new Error('unauthorized');
  }
  return session;
}

function previewHtml(files: Record<string, string>): string {
  const client = files['client.js'] ?? '';
  const escaped = client.replaceAll('</', '<\\/');
  return `<!doctype html><iframe sandbox="allow-scripts" srcdoc="<script>${escaped}</script>"></iframe>`;
}

function filesFromBody(body: Record<string, unknown>): Record<string, string> {
  const filesValue = body['files'];
  if (typeof filesValue !== 'object' || filesValue === null) {
    throw new Error('missing files');
  }
  const files: Record<string, string> = {};
  for (const [key, value] of Object.entries(filesValue)) {
    if (typeof value === 'string') {
      files[key] = value;
    }
  }
  return files;
}

async function handleInternalProposal(
  req: IncomingMessage,
  res: ServerResponse,
  config: AppConfig,
): Promise<void> {
  if (bearer(req) !== config.internalToken) {
    sendJson(res, 401, { error: 'unauthorized' });
    return;
  }
  const body = await readJson(req);
  await config.store.writeProposal(stringField(body, 'chatId'), filesFromBody(body));
  sendJson(res, 200, { ok: true });
}

type ChatCall = {
  chatId: string;
  config: AppConfig;
  req: IncomingMessage;
  res: ServerResponse;
  rest: string;
  session: Session;
};

async function handleChatGet(call: ChatCall): Promise<boolean> {
  const { res, rest, session, chatId, config } = call;
  if (rest === '') {
    const state: WorkshopState = await config.store.getState(session, chatId);
    sendJson(res, 200, state);
    return true;
  }
  if (rest === '/preview') {
    const state = await config.store.getState(session, chatId);
    const files = state.proposalFiles ?? state.acceptedFiles ?? {};
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(previewHtml(files));
    return true;
  }
  return false;
}

async function handleChatPost(call: ChatCall): Promise<boolean> {
  const { req, res, rest, session, chatId, config } = call;
  if (rest === '/messages') {
    const body = await readJson(req);
    const result = await requestAgentTurn({
      agentUrl: config.agentUrl,
      chatId,
      internalToken: config.internalToken,
      message: stringField(body, 'text'),
    });
    sendJson(res, 200, result);
    return true;
  }
  if (rest === '/accept') {
    const gadgetId = await config.store.accept(session, chatId);
    const state = await config.store.getState(session, chatId);
    if (state.acceptedFiles !== null) {
      await config.gadgets.spawnGadget(config.store, gadgetId, state.acceptedFiles);
    }
    sendJson(res, 200, { gadgetId });
    return true;
  }
  if (rest === '/revert') {
    await config.store.revert(session, chatId);
    sendJson(res, 200, { ok: true });
    return true;
  }
  return false;
}

function chatFromPath(path: string): { chatId: string; rest: string } | undefined {
  const prefix = '/chats/';
  if (!path.startsWith(prefix)) {
    return undefined;
  }
  const after = path.slice(prefix.length);
  const slash = after.indexOf('/');
  if (slash === -1) {
    return { chatId: after, rest: '' };
  }
  return { chatId: after.slice(0, slash), rest: after.slice(slash) };
}

function gadgetFromPath(path: string): { gadgetId: string; rest: string } | undefined {
  const prefix = '/gadgets/';
  if (!path.startsWith(prefix)) {
    return undefined;
  }
  const after = path.slice(prefix.length);
  const slash = after.indexOf('/');
  if (slash === -1) {
    return { gadgetId: after, rest: '' };
  }
  return { gadgetId: after.slice(0, slash), rest: after.slice(slash) };
}

async function handleWorkspaceRoutes(
  req: IncomingMessage,
  res: ServerResponse,
  path: string,
  session: Session,
  config: AppConfig,
): Promise<boolean> {
  if (req.method === 'POST' && path === '/chats') {
    const chatId = await config.store.createChat(session);
    sendJson(res, 200, { chatId });
    return true;
  }
  if (req.method === 'GET' && path === '/chats') {
    sendJson(res, 200, { chatIds: await config.store.listChats(session) });
    return true;
  }
  if (req.method === 'GET' && path === '/gadgets') {
    sendJson(res, 200, { gadgets: await config.store.listGadgets(session) });
    return true;
  }
  if (req.method === 'GET' && path === '/connectors') {
    sendJson(res, 200, { connectors: await config.store.listConnectors(session) });
    return true;
  }
  if (req.method === 'POST' && path === '/connectors') {
    const body = await readJson(req);
    const ambient = body['ambient'] === true;
    assertAmbientAllowed(stringField(body, 'vendor'), ambient, ambientVendorsFromEnv());
    const connector = await config.store.mintConnector(session, {
      vendor: stringField(body, 'vendor'),
      name: stringField(body, 'name'),
      ambient,
    });
    sendJson(res, 200, connector);
    return true;
  }
  return false;
}

async function handleGadgetRpc(
  req: IncomingMessage,
  res: ServerResponse,
  path: string,
  session: Session,
  config: AppConfig,
): Promise<boolean> {
  const gadgetParsed = gadgetFromPath(path);
  if (gadgetParsed === undefined || req.method !== 'GET' || gadgetParsed.rest !== '/rpc') {
    return false;
  }
  const gadget = await config.store.getGadget(session, gadgetParsed.gadgetId);
  if (gadget === undefined) {
    sendJson(res, 404, { error: 'not found' });
    return true;
  }
  const proxied = await config.gadgets.proxyGadget(gadgetParsed.gadgetId);
  res.writeHead(proxied.status, { 'content-type': 'application/json' });
  res.end(proxied.body);
  return true;
}

async function handleAuthed(
  req: IncomingMessage,
  res: ServerResponse,
  path: string,
  config: AppConfig,
): Promise<void> {
  const session = await requireSession(req, config.store);
  if (await handleWorkspaceRoutes(req, res, path, session, config)) {
    return;
  }
  if (await handleGadgetRpc(req, res, path, session, config)) {
    return;
  }
  const parsed = chatFromPath(path);
  if (parsed === undefined) {
    sendJson(res, 404, { error: 'not found' });
    return;
  }
  const call: ChatCall = { req, res, rest: parsed.rest, session, chatId: parsed.chatId, config };
  if (req.method === 'GET' && (await handleChatGet(call))) {
    return;
  }
  if (req.method === 'POST' && (await handleChatPost(call))) {
    return;
  }
  sendJson(res, 404, { error: 'not found' });
}

async function handlePublic(
  req: IncomingMessage,
  res: ServerResponse,
  path: string,
  config: AppConfig,
): Promise<boolean> {
  if (req.method === 'GET' && path === '/health') {
    sendJson(res, 200, { ok: true, service: 'workshop-api' });
    return true;
  }
  if (req.method === 'POST' && path === '/signup') {
    const body = await readJson(req);
    const session = await config.store.signup(
      stringField(body, 'email'),
      stringField(body, 'password'),
    );
    sendJson(res, 200, session);
    return true;
  }
  if (req.method === 'POST' && path === '/login') {
    const body = await readJson(req);
    const session = await config.store.login(
      stringField(body, 'email'),
      stringField(body, 'password'),
    );
    sendJson(res, 200, session);
    return true;
  }
  if (req.method === 'POST' && path === '/internal/proposals') {
    await handleInternalProposal(req, res, config);
    return true;
  }
  return false;
}

export function createApp(config: AppConfig): HttpServer {
  return createServer((req, res) => {
    void (async () => {
      cors(res);
      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }
      const path = new URL(req.url ?? '/', 'http://workshop.local').pathname;
      const handled = await handlePublic(req, res, path, config);
      if (!handled) {
        await handleAuthed(req, res, path, config);
      }
    })().catch((err: unknown) => {
      const message = err instanceof Error ? err.message : 'error';
      const status = message === 'unauthorized' ? 401 : 400;
      cors(res);
      sendJson(res, status, { error: message });
    });
  });
}
