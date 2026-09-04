import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: ['packages/*/vitest.config.ts'],
    coverage: {
      provider: 'v8',
      include: ['packages/*/src/**/*.ts'],
      exclude: [
        'packages/*/src/**/*.{test,spec}.ts',
        'packages/*/src/**/*.d.ts',
        'packages/*/dist/**',
        'packages/*/src/server.ts',
        'packages/*/src/main.ts',
        'packages/workshop-api/src/rpc.ts',
        'packages/workshop-api/src/gadgets.ts',
        'packages/workshop-api/src/store.ts',
        'packages/workshop-api/src/db.ts',
        'packages/sandbox/src/docker-sandbox.ts',
        'packages/sandbox/src/index.ts',
        'packages/agent-host/src/mastra-agent.ts',
        'packages/workshop-api/src/types.ts',
        '**/*.config.{js,mjs,cjs,ts}',
      ],
      reporter: ['text', 'html', 'lcov', 'json-summary'],
      thresholds: {
        lines: 80,
        functions: 80,
        statements: 80,
        branches: 70,
      },
    },
  },
});
