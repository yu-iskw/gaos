/** Client contract copied from the gaos kernel, not from Cloudflare OS workshop-shared. */

export type Connector = {
  ambient: boolean;
  id: string;
  name: string;
  vendor: string;
};

export type WorkshopState = {
  acceptedFiles: Record<string, string> | null;
  gadgetId: string | null;
  proposalFiles: Record<string, string> | null;
};

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

export type AuthedRpc = {
  accept: () => Promise<string>;
  chatId: () => Promise<string>;
  createChat: () => Promise<string>;
  createSchedule: (cron: string, chatId: string, message: string) => Promise<ScheduleRecord>;
  createShare: () => Promise<ShareRecord>;
  getAdminConfig: () => Promise<AdminConfig>;
  getMessages: () => Promise<ChatMessage[]>;
  getState: () => Promise<WorkshopState>;
  getUserEmail: () => Promise<string>;
  invokeConnector: (connectorId: string, method: string, params: string) => Promise<string>;
  listChats: () => Promise<string[]>;
  listConnectors: () => Promise<Connector[]>;
  listContext: () => Promise<ContextDoc[]>;
  listSchedules: () => Promise<ScheduleRecord[]>;
  mintConnector: (vendor: string, name: string, ambient: boolean) => Promise<Connector>;
  proxyGadget: (gadgetId: string) => Promise<{ body: string; status: number }>;
  revert: () => Promise<void>;
  sendMessage: (
    text: string,
    onChunk?: (chunk: string) => void,
    previewError?: string,
  ) => Promise<{ text: string }>;
  token: () => Promise<string>;
  updateAdminConfig: (patch: AdminConfig) => Promise<AdminConfig>;
  writeContext: (title: string, body: string) => Promise<ContextDoc>;
  onRpcBroken?: (handler: (error: unknown) => void) => void;
};

export type PublicRpc = {
  login: (email: string, password: string) => AuthedRpc;
  restore: (token: string, chatId: string) => AuthedRpc;
  signup: (email: string, password: string) => AuthedRpc;
  onRpcBroken?: (handler: (error: unknown) => void) => void;
};
