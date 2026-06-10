import js from '@eslint/js';
import globals from 'globals';

export default [
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: globals.node,
    },
    rules: {
      ...js.configs.recommended.rules,
      // Express error middleware must keep its 4-arg signature
      'no-unused-vars': ['error', { argsIgnorePattern: '^next$' }],
    },
  },
];
