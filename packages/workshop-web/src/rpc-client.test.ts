import { describe, expect, it } from 'vitest';

import { rpcWsUrl } from './rpc-client';

describe('rpcWsUrl', () => {
  it('maps the HTTP API origin onto /rpc', () => {
    expect(rpcWsUrl()).toBe('ws://localhost:8080/rpc');
  });
});
