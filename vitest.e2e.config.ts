import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'e2e',
    include: ['e2e/**/*.test.ts'],
    testTimeout: 120_000,
    hookTimeout: 120_000,
    fileParallelism: false,
    reporters: process.env['CI'] === 'true' ? ['default', 'junit'] : ['default'],
    outputFile: { junit: 'e2e-results.xml' },
  },
});
