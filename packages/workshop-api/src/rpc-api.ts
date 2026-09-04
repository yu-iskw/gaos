/**
 * Typed Cap'n Web contract. capnweb-validate `@validateRpc` is not wired yet;
 * these interfaces are the source of truth for PublicApi / AuthenticatedApi.
 */
export type WorkshopAuthedApi = {
  accept: () => Promise<string>;
  chatId: () => string;
  createChat: () => Promise<string>;
  getState: () => Promise<unknown>;
  listChats: () => Promise<string[]>;
  listConnectors: () => Promise<unknown[]>;
  listGadgets: () => Promise<unknown[]>;
  mintConnector: (vendor: string, name: string, ambient: boolean) => Promise<unknown>;
  proxyGadget: (gadgetId: string) => Promise<{ body: string; status: number }>;
  revert: () => Promise<void>;
  sendMessage: (text: string) => Promise<{ text: string }>;
  token: () => string;
};

export type WorkshopPublicApi = {
  login: (email: string, password: string) => Promise<WorkshopAuthedApi>;
  restore: (token: string, chatId: string) => Promise<WorkshopAuthedApi>;
  signup: (email: string, password: string) => Promise<WorkshopAuthedApi>;
};
