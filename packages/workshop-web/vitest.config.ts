import { defineProject } from 'vitest/config';

export default defineProject({
  test: {
    name: '@gaos/workshop-web',
    include: ['src/**/*.{test,spec}.ts'],
    exclude: ['dist/**'],
  },
});
