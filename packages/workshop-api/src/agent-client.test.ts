import { describe, expect, it } from 'vitest';

import { agentMessageFromUser, PREVIEW_ERROR_PREFIX, requestAgentTurn } from './agent-client';

function requestUrl(input: unknown): string {
  if (typeof input === 'string') {
    return input;
  }
  if (input instanceof URL) {
    return input.href;
  }
  return '';
}

describe('requestAgentTurn', () => {
  it('reads JSON when no stream callback is given', async () => {
    const original = globalThis.fetch;
    globalThis.fetch = () =>
      Promise.resolve(new Response(JSON.stringify({ text: 'proposed' }), { status: 200 }));
    try {
      await expect(
        requestAgentTurn({
          agentUrl: 'http://agent-host:8081',
          chatId: 'c1',
          internalToken: 'tok',
          message: 'hi',
        }),
      ).resolves.toEqual({ text: 'proposed' });
    } finally {
      globalThis.fetch = original;
    }
  });

  it('concatenates NDJSON chunks when streaming', async () => {
    const original = globalThis.fetch;
    const chunks: string[] = [];
    globalThis.fetch = (url) => {
      if (requestUrl(url).endsWith('/agent/turn/stream')) {
        return Promise.resolve(
          new Response('{"text":"hel"}\n{"text":"lo"}\n', {
            status: 200,
            headers: { 'content-type': 'application/x-ndjson' },
          }),
        );
      }
      return Promise.resolve(new Response('no', { status: 404 }));
    };
    try {
      await expect(
        requestAgentTurn({
          agentUrl: 'http://agent-host:8081',
          chatId: 'c1',
          internalToken: 'tok',
          message: 'hi',
          onChunk: (chunk) => {
            chunks.push(chunk);
          },
        }),
      ).resolves.toEqual({ text: 'hello' });
      expect(chunks).toEqual(['hel', 'lo']);
    } finally {
      globalThis.fetch = original;
    }
  });
});

describe('agentMessageFromUser', () => {
  it('leaves the user text alone when Preview had no error', () => {
    expect(agentMessageFromUser('write a gadget')).toBe('write a gadget');
    expect(agentMessageFromUser('write a gadget', '')).toBe('write a gadget');
  });

  it('prefixes a Preview error for the agent without replacing the user text', () => {
    expect(agentMessageFromUser('fix it', 'gadgets is not defined')).toBe(
      `${PREVIEW_ERROR_PREFIX}gadgets is not defined\n\nfix it`,
    );
  });
});

describe('requestAgentTurn stream resilience', () => {
  it('skips invalid NDJSON lines instead of aborting the turn', async () => {
    const original = globalThis.fetch;
    globalThis.fetch = (url) => {
      if (requestUrl(url).endsWith('/agent/turn/stream')) {
        return Promise.resolve(
          new Response('not-json\n{"text":"ok"}\n', {
            status: 200,
            headers: { 'content-type': 'application/x-ndjson' },
          }),
        );
      }
      return Promise.resolve(new Response('no', { status: 404 }));
    };
    try {
      await expect(
        requestAgentTurn({
          agentUrl: 'http://agent-host:8081',
          chatId: 'c1',
          internalToken: 'tok',
          message: 'hi',
          onChunk: () => undefined,
        }),
      ).resolves.toEqual({ text: 'ok' });
    } finally {
      globalThis.fetch = original;
    }
  });

  it('keeps an empty successful stream instead of re-running /agent/turn', async () => {
    const original = globalThis.fetch;
    let jsonTurnCalls = 0;
    globalThis.fetch = (url) => {
      if (requestUrl(url).endsWith('/agent/turn/stream')) {
        return Promise.resolve(
          new Response('{"text":""}\n', {
            status: 200,
            headers: { 'content-type': 'application/x-ndjson' },
          }),
        );
      }
      jsonTurnCalls += 1;
      return Promise.resolve(
        new Response(JSON.stringify({ text: 'should-not-run' }), { status: 200 }),
      );
    };
    try {
      await expect(
        requestAgentTurn({
          agentUrl: 'http://agent-host:8081',
          chatId: 'c1',
          internalToken: 'tok',
          message: 'hi',
          onChunk: () => undefined,
        }),
      ).resolves.toEqual({ text: '' });
      expect(jsonTurnCalls).toBe(0);
    } finally {
      globalThis.fetch = original;
    }
  });

  it('falls back to JSON only when the stream endpoint is unavailable', async () => {
    const original = globalThis.fetch;
    globalThis.fetch = (url) => {
      if (requestUrl(url).endsWith('/agent/turn/stream')) {
        return Promise.resolve(new Response('gone', { status: 404 }));
      }
      return Promise.resolve(new Response(JSON.stringify({ text: 'from-json' }), { status: 200 }));
    };
    try {
      await expect(
        requestAgentTurn({
          agentUrl: 'http://agent-host:8081',
          chatId: 'c1',
          internalToken: 'tok',
          message: 'hi',
          onChunk: () => undefined,
        }),
      ).resolves.toEqual({ text: 'from-json' });
    } finally {
      globalThis.fetch = original;
    }
  });
});
