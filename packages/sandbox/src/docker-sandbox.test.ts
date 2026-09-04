import { describe, expect, it } from 'vitest';

import { createCloudRunSandbox, createDockerSandbox } from './index';

describe('sandbox adapters', () => {
  it('exports docker and cloud run factories', () => {
    expect(typeof createDockerSandbox).toBe('function');
    expect(typeof createCloudRunSandbox).toBe('function');
  });
});
