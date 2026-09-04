import { describe, expect, it } from 'vitest';

import { validateRpc } from './validate-rpc';

describe('validateRpc', () => {
  it('leaves the class in place until capnweb-validate is wired', () => {
    class Sample {}
    const decorate = validateRpc();
    expect(
      decorate(Sample, { kind: 'class', name: 'Sample' } as ClassDecoratorContext<typeof Sample>),
    ).toBe(Sample);
  });
});
