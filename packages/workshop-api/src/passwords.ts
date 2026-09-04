import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const KEY_LEN = 32;

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, KEY_LEN);
  return `${salt.toString('hex')}:${hash.toString('hex')}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const separator = stored.indexOf(':');
  if (separator < 1) {
    return false;
  }
  const saltHex = stored.slice(0, separator);
  const hashHex = stored.slice(separator + 1);
  if (hashHex.length === 0) {
    return false;
  }
  const salt = Buffer.from(saltHex, 'hex');
  const expected = Buffer.from(hashHex, 'hex');
  const actual = scryptSync(password, salt, KEY_LEN);
  if (actual.length !== expected.length) {
    return false;
  }
  return timingSafeEqual(actual, expected);
}

export function newToken(): string {
  return randomBytes(24).toString('hex');
}
