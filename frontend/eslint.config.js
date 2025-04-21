// eslint.config.js
import js from '@eslint/js'
import tsPlugin from '@typescript-eslint/eslint-plugin'
import tsParser from '@typescript-eslint/parser'
import vuePlugin from 'eslint-plugin-vue'
import * as vueParser from 'vue-eslint-parser'

export default [
  // Base ESLint recommended config
  js.configs.recommended,
  // TypeScript config
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.vue'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      // Common TypeScript rules
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/ban-ts-comment': 'warn',
      '@typescript-eslint/ban-types': 'off',
      'no-unused-vars': 'off', // Turn off the base rule as it can report incorrect errors with TypeScript
    },
  },
  // Vue specific config
  {
    files: ['**/*.vue'],
    plugins: {
      vue: vuePlugin,
    },
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: tsParser,
        sourceType: 'module',
        ecmaVersion: 'latest',
        extraFileExtensions: ['.vue'],
      },
      globals: {
        defineProps: 'readonly',
        defineEmits: 'readonly',
        defineExpose: 'readonly',
        withDefaults: 'readonly',
      },
    },
    rules: {
      // Use Vue 3 recommended rules from the plugin
      'vue/multi-word-component-names': 'off',
      'vue/no-multiple-template-root': 'off',
      'vue/require-default-prop': 'warn',
      'vue/attributes-order': 'warn',
    },
  },
  // Global rules
  {
    rules: {
      'no-undef': 'off',
    },
    ignores: [
      'node_modules/**',
      'dist/**',
      'dist-ssr/**',
      '.git/**',
      'build/**',
      'coverage/**',
      '**/*.local',
      '**/.DS_Store',
      '**/.env',
      '**/*.py[cod]',
      '**/__pycache__/**',
      '**/.vscode/**',
    ],
  },
]
