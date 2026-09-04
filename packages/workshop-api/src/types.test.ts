import { describe, expect, it } from 'vitest';

import type { Chat, Gadget, Proposal, User, Workspace } from './types';

describe('domain types', () => {
  it('names the workshop records', () => {
    const user: User = { id: 'u', email: 'a@b.c' };
    const workspace: Workspace = { id: 'w', userId: user.id };
    const chat: Chat = { id: 'c', workspaceId: workspace.id };
    const proposal: Proposal = { chatId: chat.id, files: {}, chatBindings: {} };
    const gadget: Gadget = { id: 'g', files: {}, gadgetBindings: {}, chatId: chat.id };
    expect(user.email).toContain('@');
    expect(gadget.gadgetBindings).toEqual({});
    expect(proposal.chatBindings).toEqual({});
    expect(gadget.chatId).toBe(chat.id);
  });
});
