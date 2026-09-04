import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { proxyUnixHttp } from './gadget-proxy';

describe('proxyUnixHttp', () => {
  let socketPath = '';
  let server: http.Server | undefined;

  afterEach(async () => {
    await new Promise<void>((resolve) => {
      server?.close(() => {
        resolve();
      });
      if (server === undefined) {
        resolve();
      }
    });
    if (socketPath.length > 0) {
      fs.rmSync(path.dirname(socketPath), { recursive: true, force: true });
    }
  });

  it('forwards GET to a unix socket HTTP server', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gaos-proxy-'));
    socketPath = path.join(dir, 'rpc.sock');
    server = http.createServer((_req, res) => {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ ok: true, from: 'gadget' }));
    });
    await new Promise<void>((resolve, reject) => {
      server?.listen(socketPath, () => {
        resolve();
      });
      server?.on('error', reject);
    });
    const result = await proxyUnixHttp(socketPath, '/');
    expect(result.status).toBe(200);
    expect(result.body).toContain('from');
    expect(JSON.parse(result.body)).toEqual({ ok: true, from: 'gadget' });
  });
});
