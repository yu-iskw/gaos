#!/usr/bin/env node
import { createHealthServer, listen } from './health';

const port = Number(process.env['PORT'] ?? '8090');

async function main(): Promise<void> {
  const server = createHealthServer('sandbox');
  await listen(server, port);
}

void main();
