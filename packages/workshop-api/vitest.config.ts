import { defineProject } from 'vitest/config';

export default defineProject({
  test: {
    name: '@gaos/workshop-api',
    include: ['src/**/*.{test,spec}.ts'],
    exclude: ['dist/**'],
  },
});
