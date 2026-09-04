import { requestAgentTurn } from './agent-client';
import { readJson, sendJson, stringField } from './http-util';
import { invokeMcp } from './mcp-invoke';

import type { Session, Store } from './store';
import type { IncomingMessage, ServerResponse } from 'node:http';

type ExtraHttpConfig = {
  agentUrl: string;
  internalToken: string;
  store: Store;
};

type ExtraHandler = (
  req: IncomingMessage,
  res: ServerResponse,
  session: Session,
  store: Store,
) => Promise<void>;

function bearer(req: IncomingMessage): string | undefined {
  const header = req.headers.authorization;
  if (header === undefined || !header.startsWith('Bearer ')) {
    return undefined;
  }
  return header.slice('Bearer '.length);
}

const extraGets: Record<string, ExtraHandler> = {
  '/admin/config': async (_req, res, _session, store) => {
    sendJson(res, 200, await store.getAdminConfig());
  },
  '/context': async (_req, res, session, store) => {
    sendJson(res, 200, { docs: await store.listContext(session) });
  },
  '/me': async (_req, res, session, store) => {
    sendJson(res, 200, { email: await store.getUserEmail(session) });
  },
  '/schedules': async (_req, res, session, store) => {
    sendJson(res, 200, { schedules: await store.listSchedules(session) });
  },
};

const extraPosts: Record<string, ExtraHandler> = {
  '/admin/config': async (req, res, session, store) => {
    const body = await readJson(req);
    sendJson(
      res,
      200,
      await store.updateAdminConfig(session, {
        siteName: stringField(body, 'siteName'),
        accent: stringField(body, 'accent'),
      }),
    );
  },
  '/context': async (req, res, session, store) => {
    const body = await readJson(req);
    sendJson(
      res,
      200,
      await store.writeContext(session, stringField(body, 'title'), stringField(body, 'body')),
    );
  },
  '/schedules': async (req, res, session, store) => {
    const body = await readJson(req);
    sendJson(
      res,
      200,
      await store.createSchedule(
        session,
        stringField(body, 'cron'),
        stringField(body, 'chatId'),
        stringField(body, 'message'),
      ),
    );
  },
};

export async function handleExtraPublic(
  req: IncomingMessage,
  res: ServerResponse,
  path: string,
  config: ExtraHttpConfig,
): Promise<boolean> {
  if (req.method === 'GET' && path.startsWith('/shares/')) {
    const token = path.slice('/shares/'.length);
    const share = await config.store.getShare(token);
    if (share === undefined) {
      sendJson(res, 404, { error: 'not found' });
      return true;
    }
    sendJson(res, 200, share);
    return true;
  }
  if (req.method !== 'POST' || path !== '/internal/schedules/fire') {
    return false;
  }
  if (bearer(req) !== config.internalToken) {
    sendJson(res, 401, { error: 'unauthorized' });
    return true;
  }
  const body = await readJson(req);
  const schedule = await config.store.fireSchedule(stringField(body, 'id'));
  if (schedule === undefined) {
    sendJson(res, 404, { error: 'not found' });
    return true;
  }
  await config.store.appendMessage(schedule.chatId, 'user', schedule.message);
  const result = await requestAgentTurn({
    agentUrl: config.agentUrl,
    chatId: schedule.chatId,
    internalToken: config.internalToken,
    message: schedule.message,
  });
  await config.store.appendMessage(schedule.chatId, 'agent', result.text);
  sendJson(res, 200, result);
  return true;
}

async function handleInvoke(
  req: IncomingMessage,
  res: ServerResponse,
  path: string,
  session: Session,
  store: Store,
): Promise<boolean> {
  const prefix = '/connectors/';
  if (req.method !== 'POST' || !path.startsWith(prefix) || !path.endsWith('/invoke')) {
    return false;
  }
  const connectorId = path.slice(prefix.length, path.length - '/invoke'.length);
  const body = await readJson(req);
  const connector = await store.getConnector(session, connectorId);
  if (connector === undefined) {
    sendJson(res, 404, { error: 'not found' });
    return true;
  }
  if (connector.vendor !== 'mcp') {
    sendJson(res, 400, { error: 'unsupported vendor' });
    return true;
  }
  const text = await invokeMcp(
    connector.name,
    stringField(body, 'method'),
    body['params'],
    connector.secret ?? undefined,
  );
  sendJson(res, 200, { text });
  return true;
}

export async function handleExtraAuthed(
  req: IncomingMessage,
  res: ServerResponse,
  path: string,
  session: Session,
  store: Store,
): Promise<boolean> {
  const table = req.method === 'GET' ? extraGets : req.method === 'POST' ? extraPosts : undefined;
  const handler = table?.[path];
  if (handler === undefined) {
    return handleInvoke(req, res, path, session, store);
  }
  await handler(req, res, session, store);
  return true;
}
