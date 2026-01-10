const restrictedGlobals = require('eslint-restricted-globals')

module.exports = {
  settings: {
    'import/resolver': {
      exports: {},
      node: {
        extensions: ['.js', '.mjs'],
      },
    },
  },
  globals: {
    window: true,
    document: true,
    origin: true,
    worker: true,
  },
  env: {
    es2021: true,
    node: true,
    browser: true,
  },
  plugins: [
  ],
  extends: 'airbnb-base',
  overrides: [
    {
      files: ['public/j/worker.js'],
      rules: {
        'no-restricted-globals': ['error', 'isFinite', 'isNaN'].concat(restrictedGlobals),
      },
    },
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  rules: {
    'no-use-before-define': ['error', {
      functions: false,
      classes: false,
      variables: true,
      allowNamedExports: true,
    }],
    semi: ['error', 'never'],
    'no-console': 'off',
    'no-underscore-dangle': 'off',
    'import/extensions': 'off',
    'import/prefer-default-export': 'off',
    'max-len': ['error', { code: 100 }],
    'new-cap': 'off',
  },
}
