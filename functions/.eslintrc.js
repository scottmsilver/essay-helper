"use strict";

module.exports = {
  env: {
    es6: true,
    node: true,
  },
  parserOptions: {
    ecmaVersion: 2020,
  },
  extends: ["eslint:recommended", "google", "prettier"],
  rules: {
    "no-restricted-globals": ["error", "name", "length"],
    "prefer-arrow-callback": "error",
    quotes: ["error", "double", { allowTemplateLiterals: true }],
    "max-len": ["error", { code: 120 }],
    strict: ["error", "global"],
    "no-var": "error",
    "prefer-const": "error",
    eqeqeq: ["error", "always"],
    curly: ["error", "all"],
    "no-throw-literal": "error",
    "no-return-await": "error",
    // Disable deprecated rules from google config (removed in ESLint 9)
    "valid-jsdoc": "off",
    "require-jsdoc": "off",
  },
  overrides: [
    {
      files: ["**/*.test.js", "**/*.spec.js"],
      env: {
        jest: true,
      },
      rules: {},
    },
  ],
  globals: {},
};
