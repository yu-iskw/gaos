import { afterEach, describe, expect, it } from 'vitest';

import { createHealthServer, listen } from './health';

describe('createHealthServer', () => {
  let server: ReturnType<typeof createHealthServer> | undefined;

  afterEach(() => {
    server?.close();
  });

  it('answers /health', async () => {
    server = createHealthServer('sandbox');
    await listen(server, 0);
    const address = server.address();
    if (address === null || typeof address === 'string') {
      throw new Error('expected tcp address');
    }
    const res = await fetch(`http://127.0.0.1:${String(address.port)}/health`);
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true, service: 'sandbox' });
  });

  it('returns 404 for other paths', async () => {
    server = createHealthServer('sandbox');
    await listen(server, 0);
    const address = server.address();
    if (address === null || typeof address === 'string') {
      throw new Error('expected tcp address');
    }
    const res = await fetch(`http://127.0.0.1:${String(address.port)}/nope`);
    expect(res.status).toBe(404);
  });
});
