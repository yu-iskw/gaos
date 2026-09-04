import { describe, expect, it } from 'vitest';

import { parseIsolationJson } from './isolation';

describe('parseIsolationJson', () => {
  it('reads reachedApi', () => {
    expect(parseIsolationJson('{"reachedApi":false}')).toBe(false);
    expect(parseIsolationJson('{"reachedApi":true}')).toBe(true);
    expect(parseIsolationJson('{}')).toBe(false);
    expect(parseIsolationJson('null')).toBe(false);
  });
});
