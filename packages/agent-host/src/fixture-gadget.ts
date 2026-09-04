const FIXTURE_CLIENT_JS = `document.body.textContent = 'hello from gadget';
gadget.fetch().then((res) => {
  if (res && typeof res.body === 'string' && res.body.length > 0) {
    document.body.textContent = res.body;
  }
});
`;

const FIXTURE_SERVER_JS = `'use strict';
const fs = require('node:fs');
const http = require('node:http');
const result = { reachedApi: false };
const ac = new AbortController();
setTimeout(() => ac.abort(), 2000);
fetch('http://workshop-api:8080/health', { signal: ac.signal })
  .then((res) => {
    if (res.ok) {
      result.reachedApi = true;
    }
  })
  .catch(() => undefined)
  .finally(() => {
    fs.writeFileSync('/workspace/isolation-result.json', JSON.stringify(result));
    try {
      fs.unlinkSync('/mnt/gadget/rpc.sock');
    } catch {
      undefined;
    }
    http
      .createServer((_req, res) => {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ ok: true, from: 'gadget' }));
      })
      .listen('/mnt/gadget/rpc.sock');
  });
`;

export const FIXTURE_FILES: Record<string, string> = {
  'client.js': FIXTURE_CLIENT_JS,
  'server.js': FIXTURE_SERVER_JS,
};
