export default {
  // stylelint-config-prettier targets Stylelint <16 (stylistic rules removed in 16+); Standard v39+ aligns with Sl 17.
  extends: ['stylelint-config-standard'],
  ignoreFiles: [
    '**/dist/**',
    '**/node_modules/**',
    '**/coverage/**',
    '**/playwright-report/**',
    '**/test-results/**',
  ],
  rules: {
    // App uses kebab-case blocks with BEM __element / --modifier; not literal single-segment kebab-case.
    'selector-class-pattern': [
      '^([a-z0-9]+(?:-[a-z0-9]+)*)(?:__[a-z0-9]+(?:-[a-z0-9]+)*)?(?:--[a-z0-9]+(?:-[a-z0-9]+)*)?$',
      { resolveNestedSelectors: true },
    ],
    // Intentional source order for cascade; reordering risks regressions (see src/styles/README.md).
    'no-descending-specificity': null,
    // Tailwind CSS v4 CSS-first entrypoints (@source before @import, @theme, @apply, …).
    'at-rule-no-unknown': [
      true,
      {
        ignoreAtRules: [
          'theme',
          'apply',
          'config',
          'plugin',
          'utility',
          'variant',
          'custom-variant',
          'source',
          'reference',
        ],
      },
    ],
    'at-rule-prelude-no-invalid': null,
    'no-invalid-position-at-import-rule': null,
    // @theme tokens use Tailwind's `--text-sm--line-height` compound names.
    'custom-property-pattern': null,
  },
};
