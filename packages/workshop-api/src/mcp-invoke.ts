export async function invokeMcp(
  serverUrl: string,
  method: string,
  params: unknown,
  secret?: string,
): Promise<string> {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (secret !== undefined && secret.length > 0) {
    headers.authorization = `Bearer ${secret}`;
  }
  const res = await fetch(serverUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`mcp ${String(res.status)}`);
  }
  return text;
}
