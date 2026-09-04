export function apiBase(): string {
  const meta = import.meta as unknown as { env?: { VITE_PUBLIC_API_URL?: unknown } };
  const url = meta.env?.VITE_PUBLIC_API_URL;
  if (typeof url === 'string' && url.length > 0) {
    return url;
  }
  return 'http://localhost:8080';
}

export async function postJson(
  path: string,
  body: unknown,
  token?: string,
): Promise<Record<string, unknown>> {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (typeof token === 'string' && token.length > 0) {
    headers.authorization = `Bearer ${token}`;
  }
  const res = await fetch(`${apiBase()}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  const json: unknown = await res.json();
  if (typeof json !== 'object' || json === null) {
    throw new Error('invalid json');
  }
  return json as Record<string, unknown>;
}
