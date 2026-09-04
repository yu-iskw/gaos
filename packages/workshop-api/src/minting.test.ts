import { describe, expect, it } from 'vitest';

import { ambientVendorsFromEnv, assertAmbientAllowed } from './minting';

describe('minting', () => {
  it('denies ambient unless the vendor is in owner config', () => {
    expect(() => assertAmbientAllowed('mail', true, new Set())).toThrow('ambient not allowed');
    expect(() => assertAmbientAllowed('mail', true, new Set(['mail']))).not.toThrow();
    expect(() => assertAmbientAllowed('mail', false, new Set())).not.toThrow();
  });

  it('parses GAOS_AMBIENT_VENDORS', () => {
    expect(ambientVendorsFromEnv({ GAOS_AMBIENT_VENDORS: 'mail, calendar' })).toEqual(
      new Set(['mail', 'calendar']),
    );
    expect(ambientVendorsFromEnv({})).toEqual(new Set());
  });
});
