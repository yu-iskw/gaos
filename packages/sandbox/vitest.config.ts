import { defineProject } from 'vitest/config';

export default defineProject({
  test: {
    name: '@gaos/sandbox',
    include: ['src/**/*.{test,spec}.ts'],
    exclude: ['dist/**'],
  },
});
