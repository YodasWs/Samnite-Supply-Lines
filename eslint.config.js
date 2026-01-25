const { defineConfig } = require("eslint/config");

module.exports = defineConfig([
  {
    languageOptions: {
      sourceType: "module",
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
    rules: {
      strict: [2, "global"],
      indent: [2, "tab", { SwitchCase: 1 }],
      "space-before-function-paren": 0,
      "comma-dangle": 0,
      "no-console": 0,
      "no-undef": 0,
      "no-tabs": 0,
      "no-var": 2,
      semi: 0,
    },
  },
]);
