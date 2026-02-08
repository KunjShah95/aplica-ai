export default [
  {
    files: ['**/*.ts'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
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
