// @ts-check
import js from '@eslint/js';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';

/**
 * Configuración de ESLint 9 (formato "flat").
 *
 * Por qué existe: el `package.json` tenía el script `"lint": "eslint src"` pero
 * ESLint NO estaba entre las dependencias — el script fallaba con "eslint no se
 * reconoce como un comando". Nunca corrió. El único gate real era `tsc` + la
 * suite de vitest.
 *
 * Lo que aporta sobre `tsc`: las reglas de React Hooks. `tsc` no puede ver que
 * un `useEffect` olvidó una dependencia o que un hook se llama dentro de un
 * condicional, y esos son justamente los bugs de React que no se manifiestan
 * hasta que un usuario hace algo en un orden inesperado.
 *
 * Las reglas que dependen de información de tipos quedan fuera a propósito: son
 * valiosas pero exigen otra pasada de compilación y dispararían cientos de
 * hallazgos preexistentes de una sola vez.
 */
export default [
  {
    ignores: ['node_modules/**', 'dist/**', 'coverage/**', '*.config.js', '*.config.ts'],
  },

  {
    // Los `eslint-disable` existentes apuntan a reglas que esta config todavía
    // no habilita; marcarlos como "sin usar" sería pedir que se borren
    // comentarios que vuelven a hacer falta apenas se suba el nivel del linter.
    linterOptions: { reportUnusedDisableDirectives: 'off' },
  },

  js.configs.recommended,

  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2023,
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
      globals: { ...globals.browser },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,

      // Estas dos reglas base no entienden TypeScript y dan falsos positivos
      // (tipos ambiente, sobrecargas de función). `tsc` ya cubre ambos casos.
      'no-undef': 'off',
      'no-redeclare': 'off',

      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],

      // Hay `any` deliberados sobre payloads de la API. Se avisa, no se corta.
      '@typescript-eslint/no-explicit-any': 'warn',

      // Exportar algo que no sea un componente rompe el hot-reload, pero es una
      // molestia de desarrollo, no un defecto del producto.
      'react-refresh/only-export-components': 'warn',

      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },

  {
    files: ['src/**/*.test.{ts,tsx}'],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    rules: { '@typescript-eslint/no-explicit-any': 'off' },
  },
];
