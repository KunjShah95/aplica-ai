import typescriptEslint from '@typescript-eslint/parser';

export default [
  {
    files: ['**/*.ts'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parser: typescriptEslint,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      globals: {
        console: 'readonly',
        process: 'readonly',
        setTimeout: 'readonly',
        setInterval: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': {
        rules: {
          'no-explicit-any': 'warn',
          'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
          'consistent-type-imports': 'error',
          'no-floating-promises': 'error',
          'no-misused-promises': 'error',
        },
      },
    },
  },
];
