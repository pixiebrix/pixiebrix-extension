module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint"],
  overrides: [
    {
      files: ["**/*.ts", "**/*.tsx"],
      extends: [
        // Full config: https://github.com/pixiebrix/eslint-config-pixiebrix/blob/main/index.js
        // XXX: use exact configuration for now because applications/browser-extension has a lot of local configuration.
        // When we bring eslint-config-pixiebrix into the monorepo, we can iterate on code sharing across configs.
        "pixiebrix",
      ],

      parserOptions: {
        // Use the nearest tsconfig.json in its directory
        // See https://typescript-eslint.io/blog/parser-options-project-true/#introducing-true
        project: ["./tsconfig.*?.json"],
        tsconfigRootDir: __dirname,
      },
    },
  ],
};

// `npm run lint:fast` will skip the (slow) import/* rules
// Useful if you're trying to iterate fixes over other rules
if (process.env.ESLINT_NO_IMPORTS) {
  const importRules = Object.keys(require("eslint-plugin-import").rules);
  for (const ruleName of importRules) {
    module.exports.rules[`import/${ruleName}`] = "off";
  }
}
