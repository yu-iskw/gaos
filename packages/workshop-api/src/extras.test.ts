import { describe, expect, it } from 'vitest';

import { extraStubs } from './extras';
import { assertIap, iapAudienceFromEnv } from './iap';
import { invokeMcp } from './mcp-invoke';

describe('iapAudienceFromEnv', () => {
  it('is unset by default', () => {
    expect(iapAudienceFromEnv({})).toBeUndefined();
  });

  it('reads GAOS_IAP_AUDIENCE', () => {
    expect(iapAudienceFromEnv({ GAOS_IAP_AUDIENCE: '/projects/1/iap' })).toBe('/projects/1/iap');
  });
});

describe('assertIap', () => {
  it('skips health', async () => {
    await expect(
      assertIap({ url: '/health', headers: {} } as never, '/aud', () => Promise.resolve()),
    ).resolves.toBeUndefined();
  });

  it('rejects missing assertion', async () => {
    await expect(
      assertIap({ url: '/chats', headers: {} } as never, '/aud', () => Promise.resolve()),
    ).rejects.toThrow('unauthorized');
  });

  it('accepts a verified assertion', async () => {
    await expect(
      assertIap(
        { url: '/chats', headers: { 'x-goog-iap-jwt-assertion': 'token' } } as never,
        '/aud',
        (token, audience) => {
          expect(token).toBe('token');
          expect(audience).toBe('/aud');
          return Promise.resolve();
        },
      ),
    ).resolves.toBeUndefined();
  });
});

describe('extraStubs', () => {
  it('round-trips context and schedules', async () => {
    const extras = extraStubs();
    const session = { token: 't', userId: 'u', workspaceId: 'w' };
    await extras.writeContext(session, 'note', 'body');
    expect(await extras.listContext(session)).toHaveLength(1);
    const schedule = await extras.createSchedule(session, '0 9 * * *', 'c', 'hi');
    expect(await extras.fireSchedule(schedule.id)).toEqual(schedule);
    expect((await extras.getAdminConfig()).siteName).toBe('gaos');
  });
});

describe('invokeMcp', () => {
  it('posts JSON-RPC', async () => {
    const original = globalThis.fetch;
    globalThis.fetch = () => Promise.resolve(new Response('{"jsonrpc":"2.0"}', { status: 200 }));
    try {
      await expect(invokeMcp('http://mcp.example/sse', 'tools/list', {})).resolves.toContain(
        'jsonrpc',
      );
    } finally {
      globalThis.fetch = original;
    }
  });
});
