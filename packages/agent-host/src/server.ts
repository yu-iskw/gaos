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

async function authorizedTurn(
  req: http.IncomingMessage,
  expected: string,
  workshopUrl: string,
  internalToken: string,
): Promise<{ error: string; status: number } | { text: string }> {
  if (req.headers.authorization !== expected) {
    return { error: 'unauthorized', status: 401 };
  }
  const body = await readJson(req);
  const chatId = body['chatId'];
  const message = body['message'];
  if (typeof chatId !== 'string' || typeof message !== 'string') {
    return { error: 'missing chatId or message', status: 400 };
  }
  return runTurn({ workshopUrl, internalToken }, { chatId, message });
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
      const isStream = req.method === 'POST' && req.url === '/agent/turn/stream';
      const isJson = req.method === 'POST' && req.url === '/agent/turn';
      if (!isStream && !isJson) {
        send(res, 404, { error: 'not found' });
        return;
      }
      const result = await authorizedTurn(req, expected, workshopUrl, internalToken);
      if ('error' in result) {
        send(res, result.status, { error: result.error });
        return;
      }
      if (isStream) {
        res.writeHead(200, { 'content-type': 'application/x-ndjson' });
        res.end(`${JSON.stringify({ text: result.text })}\n`);
        return;
      }
      send(res, 200, result);
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
