import { describe, expect, it } from 'vitest';

import {
  GADGET_ERROR_TYPE,
  gadgetSrcdoc,
  isHandshakeMessage,
  readGadgetErrorMessage,
} from './preview';

describe('gadgetSrcdoc', () => {
  it('injects a MessagePort handshake and CSP that blocks network', () => {
    const html = gadgetSrcdoc("document.body.textContent = 'hello from gadget';");
    expect(html).toContain('hello%20from%20gadget');
    expect(html).toContain('handshake');
    expect(html).toContain("connect-src 'none'");
    expect(html).not.toContain('<iframe');
  });

  it('installs an error reporter before the gadget module', () => {
    const html = gadgetSrcdoc('gadgets.rpc.call()');
    const reporterAt = html.indexOf('gaos-gadget-error');
    const moduleAt = html.indexOf('type="module"');
    expect(reporterAt).toBeGreaterThan(0);
    expect(moduleAt).toBeGreaterThan(reporterAt);
    expect(html).toContain(`window.parent.postMessage({ type: '${GADGET_ERROR_TYPE}'`);
  });
});

describe('isHandshakeMessage', () => {
  it('accepts only opaque-origin handshake ports from the iframe', () => {
    const source = {} as Window;
    const handshake = {
      source,
      origin: 'null',
      data: 'handshake',
      ports: [{} as MessagePort],
    } as unknown as MessageEvent;
    const foreign = { ...handshake, origin: 'https://evil.example' } as unknown as MessageEvent;
    expect(isHandshakeMessage(handshake, source)).toBe(true);
    expect(isHandshakeMessage(foreign, source)).toBe(false);
  });
});

describe('readGadgetErrorMessage', () => {
  it('accepts only opaque-origin gadget errors from the iframe', () => {
    const source = {} as Window;
    const ok = {
      source,
      origin: 'null',
      data: { type: GADGET_ERROR_TYPE, message: 'gadgets is not defined' },
    } as unknown as MessageEvent;
    const foreign = { ...ok, origin: 'https://evil.example' } as unknown as MessageEvent;
    const handshake = {
      source,
      origin: 'null',
      data: 'handshake',
      ports: [{} as MessagePort],
    } as unknown as MessageEvent;
    expect(readGadgetErrorMessage(ok, source)).toBe('gadgets is not defined');
    expect(readGadgetErrorMessage(foreign, source)).toBeNull();
    expect(readGadgetErrorMessage(handshake, source)).toBeNull();
  });
});
