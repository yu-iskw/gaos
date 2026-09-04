import http from 'node:http';

export function createHealthServer(service: string): http.Server {
  return http.createServer((req, res) => {
    if (req.url === '/health' && req.method === 'GET') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ ok: true, service }));
      return;
    }
    res.writeHead(404);
    res.end();
  });
}

export function listen(server: http.Server, port: number): Promise<void> {
  return new Promise((resolve, reject) => {
    server.listen(port, () => {
      resolve();
    });
    server.on('error', reject);
  });
}
