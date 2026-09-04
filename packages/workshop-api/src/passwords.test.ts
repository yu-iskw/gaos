import { describe, expect, it } from 'vitest';

import { hashPassword, newToken, verifyPassword } from './passwords';

describe('passwords', () => {
  it('round-trips', () => {
    const stored = hashPassword('secret');
    expect(verifyPassword('secret', stored)).toBe(true);
    expect(verifyPassword('wrong', stored)).toBe(false);
    expect(verifyPassword('secret', 'not-a-hash')).toBe(false);
  });

  it('issues opaque tokens', () => {
    expect(newToken()).not.toBe(newToken());
  });
});
