/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/strict',
  ],
  plugins: ['@typescript-eslint'],
  parserOptions: {
    sourceType: 'module',
    ecmaVersion: 2022,
    extraFileExtensions: ['.svelte'],
  },
  env: {
    browser: true,
    es2022: true,
    node: true,
  },
  overrides: [
    // ── Svelte files ─────────────────────────
    {
      files: ['*.svelte'],
      extends: ['plugin:svelte/recommended'],
      parser: 'svelte-eslint-parser',
      parserOptions: {
        parser: '@typescript-eslint/parser',
      },
      rules: {
        // Allow reactive $: statements
        'no-self-assign': 'off',
        // Svelte-specific
        'svelte/no-at-html-tags': 'warn',
        'svelte/require-each-key': 'error',
        'svelte/valid-compile': 'error',
      },
    },
    // ── Backend (Bun/Node) files ─────────────
    {
      files: ['apps/server/**/*.ts'],
      env: {
        browser: false,
        node: true,
      },
      rules: {
        // Allow console.log on the server
        'no-console': 'off',
      },
    },
    // ── Test files ───────────────────────────
    {
      files: ['**/*.test.ts', '**/*.spec.ts'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-non-null-assertion': 'off',
      },
    },
    // ── Config files (JS) ───────────────────
    {
      files: ['*.js', '*.cjs'],
      env: {
        node: true,
        browser: false,
      },
      rules: {
        '@typescript-eslint/no-var-requires': 'off',
      },
    },
  ],
  ignorePatterns: ['node_modules', 'dist', '.svelte-kit', 'build', '.turbo', '.vercel', 'coverage'],
  rules: {
    // ── TypeScript ───────────────────────────
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        destructuredArrayIgnorePattern: '^_',
      },
    ],
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/consistent-type-imports': [
      'error',
      { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
    ],
    '@typescript-eslint/no-import-type-side-effects': 'error',

    // ── General ──────────────────────────────
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'prefer-const': 'error',
    'no-var': 'error',
    eqeqeq: ['error', 'always'],
    curly: ['error', 'multi-line'],
    'no-throw-literal': 'error',
    'no-duplicate-imports': 'error',
  },
};
