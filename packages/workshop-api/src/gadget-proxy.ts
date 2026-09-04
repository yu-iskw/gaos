import http from 'node:http';

export type UnixHttpResult = {
  body: string;
  status: number;
};

export function proxyUnixHttp(socketPath: string, urlPath: string): Promise<UnixHttpResult> {
  return new Promise((resolve, reject) => {
    const req = http.request({ socketPath, path: urlPath, method: 'GET' }, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });
      res.on('end', () => {
        resolve({
          body: Buffer.concat(chunks).toString('utf8'),
          status: res.statusCode ?? 500,
        });
      });
    });
    req.on('error', reject);
    req.end();
  });
}
