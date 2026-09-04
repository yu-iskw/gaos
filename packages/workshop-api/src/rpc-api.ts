/**
 * Typed Cap'n Web contract. capnweb-validate `@validateRpc` is not wired yet;
 * these interfaces are the source of truth for PublicApi / AuthenticatedApi.
 */
import type { AdminConfig, ChatMessage, ContextDoc, ScheduleRecord, ShareRecord } from './extras';

export type WorkshopAuthedApi = {
  accept: () => Promise<string>;
  chatId: () => string;
  createChat: () => Promise<string>;
  createSchedule: (cron: string, chatId: string, message: string) => Promise<ScheduleRecord>;
  createShare: () => Promise<ShareRecord>;
  getAdminConfig: () => Promise<AdminConfig>;
  getMessages: () => Promise<ChatMessage[]>;
  getState: () => Promise<unknown>;
  getUserEmail: () => Promise<string>;
  invokeConnector: (connectorId: string, method: string, params: string) => Promise<string>;
  listChats: () => Promise<string[]>;
  listConnectors: () => Promise<unknown[]>;
  listContext: () => Promise<ContextDoc[]>;
  listGadgets: () => Promise<unknown[]>;
  listSchedules: () => Promise<ScheduleRecord[]>;
  mintConnector: (vendor: string, name: string, ambient: boolean) => Promise<unknown>;
  proxyGadget: (gadgetId: string) => Promise<{ body: string; status: number }>;
  revert: () => Promise<void>;
  sendMessage: (
    text: string,
    onChunk?: (chunk: string) => void,
    previewError?: string,
  ) => Promise<{ text: string }>;
  token: () => string;
  updateAdminConfig: (patch: AdminConfig) => Promise<AdminConfig>;
  writeContext: (title: string, body: string) => Promise<ContextDoc>;
};

export type WorkshopPublicApi = {
  login: (email: string, password: string) => Promise<WorkshopAuthedApi>;
  restore: (token: string, chatId: string) => Promise<WorkshopAuthedApi>;
  signup: (email: string, password: string) => Promise<WorkshopAuthedApi>;
};
