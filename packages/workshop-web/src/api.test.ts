import { describe, expect, it } from 'vitest';

import { apiBase, postJson } from './api';

describe('apiBase', () => {
  it('defaults to localhost workshop-api', () => {
    expect(apiBase()).toContain('8080');
  });
});

describe('postJson', () => {
  it('posts json and returns the body', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = () =>
      Promise.resolve(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      );
    try {
      await expect(postJson('/signup', { email: 'a@b.c' }, 'tok')).resolves.toEqual({ ok: true });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
