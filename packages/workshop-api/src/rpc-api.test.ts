import { describe, expect, it } from 'vitest';

import type { WorkshopAuthedApi, WorkshopPublicApi } from './rpc-api';

describe('rpc-api', () => {
  it('names restore, minting, and gadget proxy on the workshop contract', () => {
    const authed: keyof WorkshopAuthedApi = 'proxyGadget';
    const pub: keyof WorkshopPublicApi = 'restore';
    expect(authed).toBe('proxyGadget');
    expect(pub).toBe('restore');
  });
});
