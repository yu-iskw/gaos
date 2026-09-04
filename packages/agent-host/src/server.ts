#!/usr/bin/env node
import http from 'node:http';

import { runTurn } from './agent';

const port = Number(process.env['PORT'] ?? '8081');

function send(res: http.ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
}

async function readJson(req: http.IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(chunk as Buffer);
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  if (raw.length === 0) {
    return {};
  }
  return JSON.parse(raw) as Record<string, unknown>;
}

async function main(): Promise<void> {
  const workshopUrl = process.env['WORKSHOP_URL'] ?? 'http://workshop-api:8080';
  const internalToken = process.env['INTERNAL_TOKEN'] ?? 'dev-internal-token';
  const expected = `Bearer ${internalToken}`;
  const server = http.createServer((req, res) => {
    void (async () => {
      if (req.method === 'GET' && req.url === '/health') {
        send(res, 200, { ok: true, service: 'agent-host' });
        return;
      }
      if (req.method === 'POST' && req.url === '/agent/turn') {
        if (req.headers.authorization !== expected) {
          send(res, 401, { error: 'unauthorized' });
          return;
        }
        const body = await readJson(req);
        const chatId = body['chatId'];
        const message = body['message'];
        if (typeof chatId !== 'string' || typeof message !== 'string') {
          send(res, 400, { error: 'missing chatId or message' });
          return;
        }
        const result = await runTurn({ workshopUrl, internalToken }, { chatId, message });
        send(res, 200, result);
        return;
      }
      send(res, 404, { error: 'not found' });
    })().catch((err: unknown) => {
      send(res, 500, { error: err instanceof Error ? err.message : 'error' });
    });
  });
  await new Promise<void>((resolve) => {
    server.listen(port, () => {
      resolve();
    });
  });
}

void main();
