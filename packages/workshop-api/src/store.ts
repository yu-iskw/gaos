import { randomUUID } from 'node:crypto';

import { hashPassword, newToken, verifyPassword } from './passwords';

import type { BindingMap, Connector, Gadget, GadgetRecord, WorkshopState } from './types';
import type { Pool } from 'pg';

export type Session = {
  token: string;
  userId: string;
  workspaceId: string;
};

export type MintConnectorInput = {
  ambient: boolean;
  name: string;
  vendor: string;
};

export type Store = {
  accept: (session: Session, chatId: string) => Promise<string>;
  createChat: (session: Session) => Promise<string>;
  getGadget: (session: Session, gadgetId: string) => Promise<GadgetRecord | undefined>;
  getSession: (token: string) => Promise<Session | undefined>;
  getState: (session: Session, chatId: string) => Promise<WorkshopState>;
  listChats: (session: Session) => Promise<string[]>;
  listConnectors: (session: Session) => Promise<Connector[]>;
  listGadgets: (session: Session) => Promise<Gadget[]>;
  login: (email: string, password: string) => Promise<Session>;
  mintConnector: (session: Session, input: MintConnectorInput) => Promise<Connector>;
  revert: (session: Session, chatId: string) => Promise<void>;
  setIsolation: (gadgetId: string, reachedApi: boolean) => Promise<void>;
  signup: (email: string, password: string) => Promise<Session>;
  writeProposal: (
    chatId: string,
    files: Record<string, string>,
    chatBindings?: BindingMap,
  ) => Promise<void>;
};

function asBindings(value: unknown): BindingMap {
  if (typeof value !== 'object' || value === null) {
    return {};
  }
  const out: BindingMap = {};
  for (const [key, item] of Object.entries(value)) {
    if (typeof item === 'string') {
      out[key] = item;
    }
  }
  return out;
}

export function createStore(pool: Pool): Store {
  return {
    async signup(email, password) {
      const userId = randomUUID();
      const workspaceId = randomUUID();
      const token = newToken();
      await pool.query('INSERT INTO users (id, email, password_hash) VALUES ($1, $2, $3)', [
        userId,
        email,
        hashPassword(password),
      ]);
      await pool.query(
        `INSERT INTO workspaces (id, user_id, ambient_bindings) VALUES ($1, $2, '{}'::jsonb)`,
        [workspaceId, userId],
      );
      await pool.query('INSERT INTO sessions (token, user_id, workspace_id) VALUES ($1, $2, $3)', [
        token,
        userId,
        workspaceId,
      ]);
      return { token, userId, workspaceId };
    },

    async login(email, password) {
      const user = await pool.query<{ id: string; password_hash: string }>(
        'SELECT id, password_hash FROM users WHERE email = $1',
        [email],
      );
      const row = user.rows.at(0);
      if (row === undefined || !verifyPassword(password, row.password_hash)) {
        throw new Error('invalid credentials');
      }
      const ws = await pool.query<{ id: string }>('SELECT id FROM workspaces WHERE user_id = $1', [
        row.id,
      ]);
      const workspaceId = ws.rows.at(0)?.id;
      if (workspaceId === undefined) {
        throw new Error('invalid credentials');
      }
      const token = newToken();
      await pool.query('INSERT INTO sessions (token, user_id, workspace_id) VALUES ($1, $2, $3)', [
        token,
        row.id,
        workspaceId,
      ]);
      return { token, userId: row.id, workspaceId };
    },

    async getSession(token) {
      const result = await pool.query<Session>(
        'SELECT token, user_id AS "userId", workspace_id AS "workspaceId" FROM sessions WHERE token = $1',
        [token],
      );
      return result.rows.at(0);
    },

    async createChat(session) {
      const chatId = randomUUID();
      await pool.query('INSERT INTO chats (id, workspace_id) VALUES ($1, $2)', [
        chatId,
        session.workspaceId,
      ]);
      return chatId;
    },

    async listChats(session) {
      const result = await pool.query<{ id: string }>(
        'SELECT id FROM chats WHERE workspace_id = $1 ORDER BY id',
        [session.workspaceId],
      );
      return result.rows.map((row) => row.id);
    },

    async listGadgets(session) {
      const result = await pool.query<{
        chat_id: string | null;
        files: Record<string, string>;
        gadget_bindings: BindingMap;
        id: string;
      }>(
        `SELECT id, chat_id, files, gadget_bindings
         FROM gadgets WHERE workspace_id = $1 ORDER BY id`,
        [session.workspaceId],
      );
      return result.rows.map((row) => ({
        id: row.id,
        chatId: row.chat_id,
        files: row.files,
        gadgetBindings: asBindings(row.gadget_bindings),
      }));
    },

    async listConnectors(session) {
      const result = await pool.query<Connector>(
        `SELECT id, workspace_id AS "workspaceId", vendor, name, ambient
         FROM connectors WHERE workspace_id = $1 ORDER BY id`,
        [session.workspaceId],
      );
      return result.rows;
    },

    async mintConnector(session, input) {
      const id = randomUUID();
      await pool.query(
        `INSERT INTO connectors (id, workspace_id, vendor, name, ambient)
         VALUES ($1, $2, $3, $4, $5)`,
        [id, session.workspaceId, input.vendor, input.name, input.ambient],
      );
      if (input.ambient) {
        await pool.query(
          `UPDATE workspaces
           SET ambient_bindings = ambient_bindings || jsonb_build_object($2::text, $1::text)
           WHERE id = $3`,
          [id, input.name, session.workspaceId],
        );
      }
      return {
        id,
        workspaceId: session.workspaceId,
        vendor: input.vendor,
        name: input.name,
        ambient: input.ambient,
      };
    },

    async writeProposal(chatId, files, chatBindings = {}) {
      await pool.query(
        `INSERT INTO proposals (chat_id, files, chat_bindings)
         VALUES ($1, $2::jsonb, $3::jsonb)
         ON CONFLICT (chat_id) DO UPDATE SET files = EXCLUDED.files, chat_bindings = EXCLUDED.chat_bindings`,
        [chatId, JSON.stringify(files), JSON.stringify(chatBindings)],
      );
    },

    async getState(session, chatId) {
      const chat = await pool.query('SELECT id FROM chats WHERE id = $1 AND workspace_id = $2', [
        chatId,
        session.workspaceId,
      ]);
      if (chat.rows.at(0) === undefined) {
        throw new Error('chat not found');
      }
      const proposal = await pool.query<{
        files: Record<string, string>;
        chat_bindings: BindingMap;
      }>('SELECT files, chat_bindings FROM proposals WHERE chat_id = $1', [chatId]);
      const gadget = await pool.query<{
        files: Record<string, string>;
        gadget_bindings: BindingMap;
        id: string;
      }>(
        `SELECT id, files, gadget_bindings FROM gadgets
         WHERE workspace_id = $1 AND chat_id = $2
         ORDER BY id DESC LIMIT 1`,
        [session.workspaceId, chatId],
      );
      const workspace = await pool.query<{ ambient_bindings: BindingMap }>(
        'SELECT ambient_bindings FROM workspaces WHERE id = $1',
        [session.workspaceId],
      );
      const gadgetRow = gadget.rows.at(0);
      let gadgetIsolation: WorkshopState['gadgetIsolation'] = null;
      if (gadgetRow !== undefined) {
        const run = await pool.query<{ reached_api: boolean | null }>(
          'SELECT reached_api FROM gadget_runs WHERE gadget_id = $1',
          [gadgetRow.id],
        );
        const reached = run.rows.at(0)?.reached_api;
        gadgetIsolation =
          reached === null || reached === undefined ? null : { reachedApi: reached };
      }
      return {
        chatId,
        proposalFiles: proposal.rows.at(0)?.files ?? null,
        acceptedFiles: gadgetRow?.files ?? null,
        gadgetId: gadgetRow?.id ?? null,
        gadgetIsolation,
        chatBindings: asBindings(proposal.rows.at(0)?.chat_bindings),
        gadgetBindings: asBindings(gadgetRow?.gadget_bindings),
        ambientBindings: asBindings(workspace.rows.at(0)?.ambient_bindings),
      };
    },

    async getGadget(session, gadgetId) {
      const result = await pool.query<GadgetRecord>(
        `SELECT id, workspace_id AS "workspaceId", chat_id AS "chatId" FROM gadgets
         WHERE id = $1 AND workspace_id = $2`,
        [gadgetId, session.workspaceId],
      );
      return result.rows.at(0);
    },

    async accept(session, chatId) {
      const proposal = await pool.query<{
        files: Record<string, string>;
        chat_bindings: BindingMap;
      }>('SELECT files, chat_bindings FROM proposals WHERE chat_id = $1', [chatId]);
      const files = proposal.rows.at(0)?.files;
      if (files === undefined) {
        throw new Error('no proposal');
      }
      const gadgetId = randomUUID();
      await pool.query(
        `INSERT INTO gadgets (id, workspace_id, chat_id, files, gadget_bindings)
         VALUES ($1, $2, $3, $4::jsonb, $5::jsonb)`,
        [
          gadgetId,
          session.workspaceId,
          chatId,
          JSON.stringify(files),
          JSON.stringify(asBindings(proposal.rows.at(0)?.chat_bindings)),
        ],
      );
      await pool.query('DELETE FROM proposals WHERE chat_id = $1', [chatId]);
      return gadgetId;
    },

    async revert(session, chatId) {
      const chat = await pool.query('SELECT id FROM chats WHERE id = $1 AND workspace_id = $2', [
        chatId,
        session.workspaceId,
      ]);
      if (chat.rows.at(0) === undefined) {
        throw new Error('chat not found');
      }
      await pool.query('DELETE FROM proposals WHERE chat_id = $1', [chatId]);
    },

    async setIsolation(gadgetId, reachedApi) {
      await pool.query(
        `INSERT INTO gadget_runs (gadget_id, reached_api)
         VALUES ($1, $2)
         ON CONFLICT (gadget_id) DO UPDATE SET reached_api = EXCLUDED.reached_api`,
        [gadgetId, reachedApi],
      );
    },
  };
}
