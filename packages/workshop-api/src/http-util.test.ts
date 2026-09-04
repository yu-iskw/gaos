import http from 'node:http';

import { describe, expect, it } from 'vitest';

import { readJson, stringField } from './http-util';

describe('stringField', () => {
  it('returns a string', () => {
    expect(stringField({ email: 'a@b.c' }, 'email')).toBe('a@b.c');
  });

  it('rejects missing values', () => {
    expect(() => stringField({}, 'email')).toThrow('missing email');
  });
});

async function echoJson(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  try {
    const body = await readJson(req);
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify(body));
  } catch (err: unknown) {
    res.writeHead(400);
    res.end(err instanceof Error ? err.message : 'error');
  }
}

describe('readJson', () => {
  it('parses an object body', async () => {
    const server = http.createServer((req, res) => {
      void echoJson(req, res);
    });
    await new Promise<void>((resolve) => {
      server.listen(0, resolve);
    });
    const address = server.address();
    if (address === null || typeof address === 'string') {
      throw new Error('expected tcp');
    }
    try {
      const res = await fetch(`http://127.0.0.1:${String(address.port)}`, {
        method: 'POST',
        body: JSON.stringify({ a: 'b' }),
      });
      await expect(res.json()).resolves.toEqual({ a: 'b' });
    } finally {
      server.close();
    }
  });
});
