import { apiBase } from './api';
import { connectPublic, disposeRpc } from './rpc-client';

import type { AuthedRpc, PublicRpc } from './rpc-client';

function requireElement<T extends Element>(selector: string): T {
  const node = document.querySelector(selector);
  if (node === null) {
    throw new Error(`missing ${selector}`);
  }
  return node as T;
}

function addInput(form: HTMLFormElement, id: string, type: string, placeholder: string): void {
  const input = document.createElement('input');
  input.id = id;
  input.type = type;
  input.placeholder = placeholder;
  input.required = true;
  form.append(input);
}

function addButton(
  parent: HTMLElement,
  id: string,
  label: string,
  type: 'submit' | 'button',
): HTMLButtonElement {
  const button = document.createElement('button');
  button.id = id;
  button.type = type;
  button.textContent = label;
  parent.append(button);
  return button;
}

function main(): void {
  const root = requireElement<HTMLElement>('#app');
  const title = document.createElement('h1');
  title.textContent = 'gaos';
  root.append(title);

  const signupForm = document.createElement('form');
  signupForm.id = 'signup-form';
  addInput(signupForm, 'email', 'email', 'email');
  addInput(signupForm, 'password', 'password', 'password');
  addButton(signupForm, 'signup', 'Sign up', 'submit');
  root.append(signupForm);

  const chatForm = document.createElement('form');
  chatForm.id = 'chat-form';
  chatForm.hidden = true;
  const message = document.createElement('textarea');
  message.id = 'message';
  message.placeholder = 'message';
  chatForm.append(message);
  addButton(chatForm, 'send', 'Send', 'submit');
  addButton(chatForm, 'accept', 'Accept', 'button');
  addButton(chatForm, 'revert', 'Revert', 'button');
  root.append(chatForm);

  const status = document.createElement('p');
  status.id = 'status';
  root.append(status);

  const preview = document.createElement('iframe');
  preview.id = 'preview';
  preview.title = 'gadget preview';
  preview.sandbox.add('allow-scripts');
  root.append(preview);

  let publicApi: PublicRpc = connectPublic();
  let authed: AuthedRpc | null = null;
  let token = '';
  let chatId = '';

  function watchBroken(stub: PublicRpc | AuthedRpc): void {
    stub.onRpcBroken?.(() => {
      disposeRpc(publicApi);
      publicApi = connectPublic();
      if (token.length > 0 && chatId.length > 0) {
        authed = publicApi.restore(token, chatId);
        watchBroken(authed);
      } else {
        watchBroken(publicApi);
      }
    });
  }
  watchBroken(publicApi);

  async function refreshPreview(): Promise<void> {
    if (token.length === 0 || chatId.length === 0) {
      return;
    }
    const res = await fetch(`${apiBase()}/chats/${chatId}/preview`, {
      headers: { authorization: `Bearer ${token}` },
    });
    preview.srcdoc = await res.text();
  }

  signupForm.addEventListener('submit', (event) => {
    event.preventDefault();
    void (async () => {
      const email = requireElement<HTMLInputElement>('#email').value;
      const password = requireElement<HTMLInputElement>('#password').value;
      authed = publicApi.signup(email, password);
      watchBroken(authed);
      token = await authed.token();
      chatId = await authed.chatId();
      chatForm.hidden = false;
      status.textContent = 'signed in';
    })();
  });

  function requireAuthed(): AuthedRpc {
    if (authed === null) {
      throw new Error('not signed in');
    }
    return authed;
  }

  chatForm.addEventListener('submit', (event) => {
    event.preventDefault();
    void (async () => {
      const session = requireAuthed();
      const text = requireElement<HTMLTextAreaElement>('#message').value;
      await session.sendMessage(text);
      status.textContent = 'proposal ready';
      await refreshPreview();
    })();
  });

  requireElement<HTMLButtonElement>('#accept').addEventListener('click', () => {
    void (async () => {
      const session = requireAuthed();
      const gadgetId = await session.accept();
      status.textContent = 'accepted';
      await refreshPreview();
      const rpc = await session.proxyGadget(gadgetId);
      if (rpc.status === 200) {
        status.textContent = 'accepted; gadget live';
      }
    })();
  });

  requireElement<HTMLButtonElement>('#revert').addEventListener('click', () => {
    void (async () => {
      await requireAuthed().revert();
      status.textContent = 'reverted';
      await refreshPreview();
    })();
  });
}

void main();
