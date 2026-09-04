import { Pool } from 'pg';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS workspaces (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  ambient_bindings JSONB NOT NULL DEFAULT '{}'::jsonb
);
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  workspace_id TEXT NOT NULL REFERENCES workspaces(id)
);
CREATE TABLE IF NOT EXISTS chats (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id)
);
CREATE TABLE IF NOT EXISTS proposals (
  chat_id TEXT PRIMARY KEY REFERENCES chats(id),
  files JSONB NOT NULL,
  chat_bindings JSONB NOT NULL DEFAULT '{}'::jsonb
);
CREATE TABLE IF NOT EXISTS gadgets (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  chat_id TEXT REFERENCES chats(id),
  files JSONB NOT NULL,
  gadget_bindings JSONB NOT NULL DEFAULT '{}'::jsonb
);
CREATE TABLE IF NOT EXISTS gadget_runs (
  gadget_id TEXT PRIMARY KEY REFERENCES gadgets(id),
  reached_api BOOLEAN
);
CREATE TABLE IF NOT EXISTS connectors (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  vendor TEXT NOT NULL,
  name TEXT NOT NULL,
  ambient BOOLEAN NOT NULL DEFAULT false,
  secret TEXT
);
CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY,
  chat_id TEXT NOT NULL REFERENCES chats(id),
  role TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS shares (
  token TEXT PRIMARY KEY,
  chat_id TEXT NOT NULL REFERENCES chats(id),
  workspace_id TEXT NOT NULL REFERENCES workspaces(id)
);
CREATE TABLE IF NOT EXISTS schedules (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  chat_id TEXT NOT NULL REFERENCES chats(id),
  cron TEXT NOT NULL,
  message TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS context_docs (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  gcs_object TEXT
);
CREATE TABLE IF NOT EXISTS admin_config (
  id TEXT PRIMARY KEY,
  config JSONB NOT NULL
);
`;

const ALTERS = `
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS ambient_bindings JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE gadgets ADD COLUMN IF NOT EXISTS chat_id TEXT REFERENCES chats(id);
ALTER TABLE connectors ADD COLUMN IF NOT EXISTS secret TEXT;
`;

export function createPool(connectionString: string): Pool {
  return new Pool({ connectionString });
}

export async function migrate(pool: Pool): Promise<void> {
  await pool.query(SCHEMA);
  await pool.query(ALTERS);
}
