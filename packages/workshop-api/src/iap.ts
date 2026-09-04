import { createPublicKey, verify } from 'node:crypto';

import type { IncomingMessage } from 'node:http';

export type IapVerifier = (token: string, audience: string) => Promise<void>;

export function iapAudienceFromEnv(env: NodeJS.ProcessEnv = process.env): string | undefined {
  const audience = env['GAOS_IAP_AUDIENCE'];
  if (audience === undefined || audience.length === 0) {
    return undefined;
  }
  return audience;
}

function decodeJwtPart(part: string): Record<string, unknown> {
  const json = Buffer.from(part, 'base64url').toString('utf8');
  const parsed: unknown = JSON.parse(json);
  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('invalid iap token');
  }
  return parsed as Record<string, unknown>;
}

function jwtPart(parts: string[], index: number): string {
  const part = parts.at(index);
  if (part === undefined || part.length === 0) {
    throw new Error('unauthorized');
  }
  return part;
}

export async function verifyIapJwt(token: string, audience: string): Promise<void> {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('unauthorized');
  }
  const headerPart = jwtPart(parts, 0);
  const payloadPart = jwtPart(parts, 1);
  const signaturePart = jwtPart(parts, 2);
  const payload = decodeJwtPart(payloadPart);
  if (payload['aud'] !== audience) {
    throw new Error('unauthorized');
  }
  const header = decodeJwtPart(headerPart);
  const kid = header['kid'];
  if (typeof kid !== 'string') {
    throw new Error('unauthorized');
  }
  const keysRes = await fetch('https://www.gstatic.com/iap/verify/public_key');
  if (!keysRes.ok) {
    throw new Error('unauthorized');
  }
  const keys: unknown = await keysRes.json();
  if (typeof keys !== 'object' || keys === null) {
    throw new Error('unauthorized');
  }
  const pem = (keys as Record<string, unknown>)[kid];
  if (typeof pem !== 'string') {
    throw new Error('unauthorized');
  }
  const key = createPublicKey(pem);
  const signed = `${headerPart}.${payloadPart}`;
  const ok = verify('SHA256', Buffer.from(signed), key, Buffer.from(signaturePart, 'base64url'));
  if (!ok) {
    throw new Error('unauthorized');
  }
}

export async function assertIap(
  req: IncomingMessage,
  audience: string,
  verifier: IapVerifier = verifyIapJwt,
): Promise<void> {
  if (req.url === '/health') {
    return;
  }
  const header = req.headers['x-goog-iap-jwt-assertion'];
  const token = Array.isArray(header) ? header[0] : header;
  if (typeof token !== 'string' || token.length === 0) {
    throw new Error('unauthorized');
  }
  await verifier(token, audience);
}
