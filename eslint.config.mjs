import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
      '**/coverage/**',
      'apps/web/**', // Next.js has its own eslint setup
    ],
  },
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['apps/*'],
              message: 'Packages and apps must never import from apps/*',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['packages/shared/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@copilot/*', 'packages/*'],
              message: '@copilot/shared cannot import from any internal packages',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['packages/liara-client/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '@copilot/tools',
                '@copilot/agent',
                '@copilot/server',
                '@copilot/mcp',
                '@copilot/demo-app',
              ],
              message: '@copilot/liara-client can only import from @copilot/shared',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['packages/tools/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@copilot/agent', '@copilot/server', '@copilot/mcp', '@copilot/demo-app'],
              message: '@copilot/tools cannot import from agent, server, or apps',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['apps/demo-app/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@copilot/*'],
              message: 'demo-app cannot import any internal packages',
            },
          ],
        },
      ],
    },
  },
);
