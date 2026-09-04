import { randomUUID } from 'node:crypto';

import { writeContextBlob } from './gcs-context';

import type { Session } from './store';
import type { Pool } from 'pg';

export type ChatMessage = {
  role: 'user' | 'agent';
  text: string;
};

export type ShareRecord = {
  chatId: string;
  token: string;
};

export type ScheduleRecord = {
  chatId: string;
  cron: string;
  id: string;
  message: string;
};

export type ContextDoc = {
  body: string;
  id: string;
  title: string;
};

export type AdminConfig = {
  accent: string;
  siteName: string;
};

export type ExtraStore = {
  appendMessage: (chatId: string, role: 'user' | 'agent', text: string) => Promise<void>;
  createSchedule: (
    session: Session,
    cron: string,
    chatId: string,
    message: string,
  ) => Promise<ScheduleRecord>;
  createShare: (session: Session, chatId: string) => Promise<ShareRecord>;
  fireSchedule: (id: string) => Promise<ScheduleRecord | undefined>;
  getAdminConfig: () => Promise<AdminConfig>;
  getShare: (token: string) => Promise<ShareRecord | undefined>;
  getUserEmail: (session: Session) => Promise<string>;
  listContext: (session: Session) => Promise<ContextDoc[]>;
  listMessages: (session: Session, chatId: string) => Promise<ChatMessage[]>;
  listSchedules: (session: Session) => Promise<ScheduleRecord[]>;
  updateAdminConfig: (session: Session, patch: AdminConfig) => Promise<AdminConfig>;
  writeContext: (session: Session, title: string, body: string) => Promise<ContextDoc>;
};

const DEFAULT_ADMIN: AdminConfig = { siteName: 'gaos', accent: '#ff4801' };

export function extraStubs(): ExtraStore {
  const messages: ChatMessage[] = [];
  const docs: ContextDoc[] = [];
  const schedules: ScheduleRecord[] = [];
  let admin = DEFAULT_ADMIN;
  return {
    appendMessage(_chatId, role, text) {
      messages.push({ role, text });
      return Promise.resolve();
    },
    listMessages() {
      return Promise.resolve([...messages]);
    },
    createShare(_session, chatId) {
      return Promise.resolve({ token: 'share-1', chatId });
    },
    getShare(token) {
      return Promise.resolve(token === 'share-1' ? { token, chatId: 'c' } : undefined);
    },
    listSchedules() {
      return Promise.resolve([...schedules]);
    },
    createSchedule(_session, cron, chatId, message) {
      const row = { id: 'sch-1', cron, chatId, message };
      schedules.push(row);
      return Promise.resolve(row);
    },
    fireSchedule(id) {
      return Promise.resolve(schedules.find((row) => row.id === id));
    },
    listContext() {
      return Promise.resolve([...docs]);
    },
    writeContext(_session, title, body) {
      const doc = { id: randomUUID(), title, body };
      docs.push(doc);
      return Promise.resolve(doc);
    },
    getAdminConfig() {
      return Promise.resolve(admin);
    },
    updateAdminConfig(_session, patch) {
      admin = patch;
      return Promise.resolve(admin);
    },
    getUserEmail() {
      return Promise.resolve('a@b.c');
    },
  };
}

export function createExtraStore(pool: Pool): ExtraStore {
  return {
    async appendMessage(chatId, role, text) {
      await pool.query(
        'INSERT INTO chat_messages (id, chat_id, role, text) VALUES ($1, $2, $3, $4)',
        [randomUUID(), chatId, role, text],
      );
    },
    async listMessages(session, chatId) {
      const result = await pool.query<ChatMessage>(
        `SELECT role, text FROM chat_messages
         WHERE chat_id = $1 AND chat_id IN (SELECT id FROM chats WHERE workspace_id = $2)
         ORDER BY created_at`,
        [chatId, session.workspaceId],
      );
      return result.rows;
    },
    async createShare(session, chatId) {
      await requireChat(pool, session, chatId);
      const token = randomUUID();
      await pool.query('INSERT INTO shares (token, chat_id, workspace_id) VALUES ($1, $2, $3)', [
        token,
        chatId,
        session.workspaceId,
      ]);
      return { token, chatId };
    },
    async getShare(token) {
      const result = await pool.query<ShareRecord>(
        'SELECT token, chat_id AS "chatId" FROM shares WHERE token = $1',
        [token],
      );
      return result.rows.at(0);
    },
    async listSchedules(session) {
      const result = await pool.query<ScheduleRecord>(
        `SELECT id, cron, chat_id AS "chatId", message FROM schedules
         WHERE workspace_id = $1 ORDER BY id`,
        [session.workspaceId],
      );
      return result.rows;
    },
    async createSchedule(session, cron, chatId, message) {
      await requireChat(pool, session, chatId);
      const id = randomUUID();
      await pool.query(
        `INSERT INTO schedules (id, workspace_id, chat_id, cron, message)
         VALUES ($1, $2, $3, $4, $5)`,
        [id, session.workspaceId, chatId, cron, message],
      );
      return { id, cron, chatId, message };
    },
    async fireSchedule(id) {
      const result = await pool.query<ScheduleRecord>(
        'SELECT id, cron, chat_id AS "chatId", message FROM schedules WHERE id = $1',
        [id],
      );
      return result.rows.at(0);
    },
    async listContext(session) {
      const result = await pool.query<ContextDoc>(
        'SELECT id, title, body FROM context_docs WHERE workspace_id = $1 ORDER BY id',
        [session.workspaceId],
      );
      return result.rows;
    },
    async writeContext(session, title, body) {
      const id = randomUUID();
      const gcsObject = await writeContextBlob(id, body);
      await pool.query(
        'INSERT INTO context_docs (id, workspace_id, title, body, gcs_object) VALUES ($1, $2, $3, $4, $5)',
        [id, session.workspaceId, title, body, gcsObject ?? null],
      );
      return { id, title, body };
    },
    async getAdminConfig() {
      const result = await pool.query<{ config: AdminConfig }>(
        'SELECT config FROM admin_config WHERE id = $1',
        ['default'],
      );
      return result.rows.at(0)?.config ?? DEFAULT_ADMIN;
    },
    async updateAdminConfig(session, patch) {
      const admins = (process.env['GAOS_ADMINS'] ?? '')
        .split(',')
        .map((part) => part.trim())
        .filter((part) => part.length > 0);
      const email = await readEmail(pool, session);
      if (admins.length > 0 && !admins.includes(email)) {
        throw new Error('forbidden');
      }
      await pool.query(
        `INSERT INTO admin_config (id, config) VALUES ('default', $1::jsonb)
         ON CONFLICT (id) DO UPDATE SET config = EXCLUDED.config`,
        [JSON.stringify(patch)],
      );
      return patch;
    },
    async getUserEmail(session) {
      return readEmail(pool, session);
    },
  };
}

async function requireChat(pool: Pool, session: Session, chatId: string): Promise<void> {
  const chat = await pool.query('SELECT id FROM chats WHERE id = $1 AND workspace_id = $2', [
    chatId,
    session.workspaceId,
  ]);
  if (chat.rows.at(0) === undefined) {
    throw new Error('chat not found');
  }
}

async function readEmail(pool: Pool, session: Session): Promise<string> {
  const result = await pool.query<{ email: string }>('SELECT email FROM users WHERE id = $1', [
    session.userId,
  ]);
  return result.rows.at(0)?.email ?? '';
}
