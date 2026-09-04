import { describe, expect, it } from 'vitest';

import { WORKSHOP_AGENT_INSTRUCTIONS } from './gadget-contract';

describe('WORKSHOP_AGENT_INSTRUCTIONS', () => {
  it('teaches the iframe contract instead of gadgets.rpc', () => {
    expect(WORKSHOP_AGENT_INSTRUCTIONS).toContain('writeProposal');
    expect(WORKSHOP_AGENT_INSTRUCTIONS).toContain('client.js');
    expect(WORKSHOP_AGENT_INSTRUCTIONS).toContain('gadget.fetch()');
    expect(WORKSHOP_AGENT_INSTRUCTIONS).toContain('Paint visible DOM immediately');
    expect(WORKSHOP_AGENT_INSTRUCTIONS).toContain('Prefer computing in client.js');
    expect(WORKSHOP_AGENT_INSTRUCTIONS).toContain('status: 0');
    expect(WORKSHOP_AGENT_INSTRUCTIONS).toContain('takes no URL or init');
    expect(WORKSHOP_AGENT_INSTRUCTIONS).toContain('addEventListener');
    expect(WORKSHOP_AGENT_INSTRUCTIONS).toContain('type="button"');
    expect(WORKSHOP_AGENT_INSTRUCTIONS).toContain('error overlay');
    expect(WORKSHOP_AGENT_INSTRUCTIONS).toContain('no gadgets.rpc');
    expect(WORKSHOP_AGENT_INSTRUCTIONS).toContain('no localStorage');
    expect(WORKSHOP_AGENT_INSTRUCTIONS).not.toContain('gadgets.rpc.call');
    expect(WORKSHOP_AGENT_INSTRUCTIONS).toContain('The previous gadget failed in Preview:');
    expect(WORKSHOP_AGENT_INSTRUCTIONS).toContain('Do not ask the user to paste');
  });
});
