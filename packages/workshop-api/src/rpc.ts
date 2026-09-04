import { newWebSocketRpcSession, RpcTarget } from 'capnweb';
import { WebSocketServer } from 'ws';

import { requestAgentTurn } from './agent-client';
import { ambientVendorsFromEnv, assertAmbientAllowed } from './minting';
import { validateRpc } from './validate-rpc';

import type { AppConfig } from './app';
import type { Session } from './store';
import type { Server } from 'node:http';

@validateRpc()
class AuthenticatedApi extends RpcTarget {
  readonly #chatId: string;
  readonly #config: AppConfig;
  readonly #session: Session;

  public constructor(session: Session, config: AppConfig, chatId: string) {
    super();
    this.#session = session;
    this.#config = config;
    this.#chatId = chatId;
  }

  public async accept(): Promise<string> {
    const gadgetId = await this.#config.store.accept(this.#session, this.#chatId);
    const state = await this.#config.store.getState(this.#session, this.#chatId);
    if (state.acceptedFiles !== null) {
      await this.#config.gadgets.spawnGadget(this.#config.store, gadgetId, state.acceptedFiles);
    }
    return gadgetId;
  }

  public chatId(): string {
    return this.#chatId;
  }

  public createChat(): Promise<string> {
    return this.#config.store.createChat(this.#session);
  }

  public getState() {
    return this.#config.store.getState(this.#session, this.#chatId);
  }

  public listChats(): Promise<string[]> {
    return this.#config.store.listChats(this.#session);
  }

  public listConnectors() {
    return this.#config.store.listConnectors(this.#session);
  }

  public listGadgets() {
    return this.#config.store.listGadgets(this.#session);
  }

  public mintConnector(vendor: string, name: string, ambient: boolean) {
    assertAmbientAllowed(vendor, ambient, ambientVendorsFromEnv());
    return this.#config.store.mintConnector(this.#session, { vendor, name, ambient });
  }

  public async proxyGadget(gadgetId: string): Promise<{ body: string; status: number }> {
    const gadget = await this.#config.store.getGadget(this.#session, gadgetId);
    if (gadget === undefined) {
      throw new Error('gadget not found');
    }
    return this.#config.gadgets.proxyGadget(gadgetId);
  }

  public revert(): Promise<void> {
    return this.#config.store.revert(this.#session, this.#chatId);
  }

  public async sendMessage(text: string): Promise<{ text: string }> {
    return requestAgentTurn({
      agentUrl: this.#config.agentUrl,
      chatId: this.#chatId,
      internalToken: this.#config.internalToken,
      message: text,
    });
  }

  public token(): string {
    return this.#session.token;
  }
}

@validateRpc()
class PublicApi extends RpcTarget {
  readonly #config: AppConfig;

  public constructor(config: AppConfig) {
    super();
    this.#config = config;
  }

  public async login(email: string, password: string): Promise<AuthenticatedApi> {
    const session = await this.#config.store.login(email, password);
    const chatId = await this.#config.store.createChat(session);
    return new AuthenticatedApi(session, this.#config, chatId);
  }

  public async restore(token: string, chatId: string): Promise<AuthenticatedApi> {
    const session = await this.#config.store.getSession(token);
    if (session === undefined) {
      throw new Error('unauthorized');
    }
    return new AuthenticatedApi(session, this.#config, chatId);
  }

  public async signup(email: string, password: string): Promise<AuthenticatedApi> {
    const session = await this.#config.store.signup(email, password);
    const chatId = await this.#config.store.createChat(session);
    return new AuthenticatedApi(session, this.#config, chatId);
  }
}

export function attachRpc(server: Server, config: AppConfig): void {
  const wss = new WebSocketServer({ server, path: '/rpc' });
  wss.on('connection', (socket) => {
    newWebSocketRpcSession(socket as never, new PublicApi(config));
  });
}
