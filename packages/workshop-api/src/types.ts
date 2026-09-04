/** Named capability in a chat, gadget, or ambient map. */
export type BindingMap = Record<string, string>;

export type User = {
  id: string;
  email: string;
};

export type Workspace = {
  id: string;
  userId: string;
};

export type Gadget = {
  chatId: string | null;
  files: Record<string, string>;
  gadgetBindings: BindingMap;
  id: string;
};

export type Proposal = {
  chatBindings: BindingMap;
  chatId: string;
  files: Record<string, string>;
};

export type Chat = {
  id: string;
  workspaceId: string;
};

export type Connector = {
  ambient: boolean;
  id: string;
  name: string;
  vendor: string;
  workspaceId: string;
};

export type WorkshopState = {
  acceptedFiles: Record<string, string> | null;
  ambientBindings: BindingMap;
  chatBindings: BindingMap;
  chatId: string;
  gadgetBindings: BindingMap;
  gadgetId: string | null;
  gadgetIsolation: { reachedApi: boolean } | null;
  proposalFiles: Record<string, string> | null;
};

export type GadgetRecord = {
  chatId: string | null;
  id: string;
  workspaceId: string;
};
