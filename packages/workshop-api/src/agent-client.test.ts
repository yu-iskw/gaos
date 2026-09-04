import { describe, expect, it } from 'vitest';

import { requestAgentTurn } from './agent-client';

function mockFetch(response: Response): void {
  globalThis.fetch = () => Promise.resolve(response);
}

describe('requestAgentTurn', () => {
  it('posts to the agent host', async () => {
    const originalFetch = globalThis.fetch;
    mockFetch(
      new Response(JSON.stringify({ text: 'ok' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    try {
      const result = await requestAgentTurn({
        agentUrl: 'http://agent-host:8081',
        chatId: 'c1',
        internalToken: 'tok',
        message: 'hi',
      });
      expect(result.text).toBe('ok');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('throws when the host is not ok', async () => {
    const originalFetch = globalThis.fetch;
    mockFetch(new Response('no', { status: 503 }));
    try {
      await expect(
        requestAgentTurn({
          agentUrl: 'http://agent-host:8081',
          chatId: 'c1',
          internalToken: 'tok',
          message: 'hi',
        }),
      ).rejects.toThrow('agent-host 503');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('throws when the body has no text', async () => {
    const originalFetch = globalThis.fetch;
    mockFetch(new Response(JSON.stringify({}), { status: 200 }));
    try {
      await expect(
        requestAgentTurn({
          agentUrl: 'http://agent-host:8081',
          chatId: 'c1',
          internalToken: 'tok',
          message: 'hi',
        }),
      ).rejects.toThrow('invalid agent response');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
