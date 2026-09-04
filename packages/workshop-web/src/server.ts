#!/usr/bin/env node
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const port = Number(process.env['PORT'] ?? '5173');
const here = path.dirname(fileURLToPath(import.meta.url));
const dist = path.resolve(here, '../dist');

const types: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
};

function send(res: http.ServerResponse, status: number, type: string, body: string | Buffer): void {
  res.writeHead(status, { 'content-type': type });
  res.end(body);
}

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/health') {
    send(res, 200, 'application/json', JSON.stringify({ ok: true, service: 'workshop-web' }));
    return;
  }
  const urlPath =
    req.url === undefined || req.url === '/'
      ? '/index.html'
      : (req.url.split('?')[0] ?? '/index.html');
  const file = path.normalize(path.join(dist, urlPath));
  if (!file.startsWith(dist)) {
    send(res, 403, 'text/plain', 'forbidden');
    return;
  }
  fs.readFile(file, (err, data) => {
    if (err) {
      send(res, 404, 'text/plain', 'not found');
      return;
    }
    const ext = path.extname(file);
    send(res, 200, types[ext] ?? 'application/octet-stream', data);
  });
});

server.listen(port);
