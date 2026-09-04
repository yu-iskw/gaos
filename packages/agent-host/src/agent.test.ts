import { afterEach, describe, expect, it } from 'vitest';

import { postProposal, runTurn } from './agent';

describe('runTurn fixture', () => {
  afterEach(() => {
    process.env['GAOS_MODEL'] = 'fixture';
  });

  it('posts proposal files', async () => {
    const originalFetch = globalThis.fetch;
    let posted: unknown;
    globalThis.fetch = (_url, init) => {
      const body = init?.body;
      if (typeof body === 'string') {
        posted = JSON.parse(body);
      }
      return Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    };
    process.env['GAOS_MODEL'] = 'fixture';
    try {
      const result = await runTurn(
        { workshopUrl: 'http://workshop-api:8080', internalToken: 'tok' },
        { chatId: 'c1', message: 'make a gadget' },
      );
      expect(result.text).toContain('Proposed');
      expect(posted).toMatchObject({ chatId: 'c1' });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

describe('postProposal', () => {
  it('throws on failure', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = () => Promise.resolve(new Response('no', { status: 500 }));
    try {
      await expect(
        postProposal({ workshopUrl: 'http://workshop-api:8080', internalToken: 't' }, 'c', {
          a: 'b',
        }),
      ).rejects.toThrow('writeProposal failed 500');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
