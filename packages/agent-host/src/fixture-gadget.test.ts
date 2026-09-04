import { describe, expect, it } from 'vitest';

import { FIXTURE_FILES } from './fixture-gadget';

describe('FIXTURE_FILES', () => {
  it('includes client.js and server.js', () => {
    expect(FIXTURE_FILES['client.js']).toContain('hello from gadget');
    expect(FIXTURE_FILES['client.js']).toContain('gadget.fetch()');
    expect(FIXTURE_FILES['server.js']).toContain('isolation-result.json');
    expect(FIXTURE_FILES['server.js']).toContain('/mnt/gadget/rpc.sock');
  });
});
