import js from "@eslint/js";
import globals from "globals";
import prettier from "eslint-config-prettier";

export default [
  {
    ignores: ["node_modules/**"],
  },
  js.configs.recommended,
  prettier,
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: "commonjs",
      globals: {
        ...globals.node,
        ...globals.es2020,
      },
    },
    rules: {
      // From google config (the useful parts)
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
    },
  },
  {
    files: ["**/*.test.js", "**/*.spec.js"],
    languageOptions: {
      globals: {
        ...globals.jest,
      },
    },
  },
];
