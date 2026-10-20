import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'dist',
      'extension/dist',
      'coverage',
      'docs/prototipo',
      'playwright-report',
      'test-results',
      '.claude',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
  {
    files: ['extension/src/**/*.ts'],
    languageOptions: { globals: { ...globals.browser, ...globals.serviceworker } },
    rules: { '@typescript-eslint/consistent-type-imports': 'error' },
  },
  {
    // The core is framework-free: React must never leak into it.
    files: ['src/{sources,render,layout,flip,viewer,storage,platform}/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['react', 'react-dom', 'react/*', 'react-dom/*'],
              message: 'The core must stay framework-free.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['*.config.{js,ts}', 'scripts/**/*.{js,mjs,ts}', 'build/**/*.ts', 'e2e/**/*.ts'],
    languageOptions: { globals: globals.node },
  },
);
