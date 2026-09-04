import { defineProject } from 'vitest/config';

export default defineProject({
  test: {
    name: '@gaos/agent-host',
    include: ['src/**/*.{test,spec}.ts'],
    exclude: ['dist/**'],
  },
});
