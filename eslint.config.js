const eslint = require('@eslint/js');
const prettier = require('eslint-config-prettier');
const tseslint = require('typescript-eslint');

module.exports = tseslint.config(
  { ignores: ['node_modules', '.expo', 'dist', 'coverage', '*.config.js'] },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
);
