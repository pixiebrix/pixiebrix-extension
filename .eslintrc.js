const { readFileSync } = require("fs");
const { resolve } = require("path");

const boundaries = [
  "background",
  "contentScript",
  "pageEditor",
  "extensionConsole",
  "sidebar",
  "pageScript",
];

module.exports = {
  root: true,
  extends: [
    // Full config: https://github.com/pixiebrix/eslint-config-pixiebrix/blob/main/index.js
    "pixiebrix",
  ],
  plugins: ["local-rules", "@shopify"],
  rules: {
    "@shopify/react-hooks-strict-return": "error",
    "@shopify/prefer-module-scope-constants": "error",
    "@shopify/jest/no-snapshots": "warn",
    "react/no-array-index-key": "error",
    "local-rules/noNullRtkQueryArgs": "error",
    "local-rules/noInvalidDataTestId": "error",
    "local-rules/noExpressionLiterals": "error",
    "local-rules/notBothLabelAndLockableProps": "error",
    "local-rules/preferNullish": "warn",
    "local-rules/preferNullishable": "warn",
    "local-rules/noCrossBoundaryImports": [
      "warn",
      {
        // This rule is customized below for files in "src/platform"
        boundaries,
        allowedGlobs: ["**/messenger/**", "**/*.scss*"],
      },
    ],

    // Avoid imports with side effects
    "import/no-unassigned-import": [
      "error",
      {
        allow: [
          "**/*.css",
          "**/*.scss",
          "@/development/*",
          "@/background/messenger/external/api",
          "@/extensionContext", // Must be run before other code
          "@/background/axiosFetch", // Must be run before other code
          "@/telemetry/reportUncaughtErrors",
          "@testing-library/jest-dom",
          "regenerator-runtime/runtime", // Automatic registration
          "@/vendors/hoverintent", // JQuery plugin
          "iframe-resizer/js/iframeResizer.contentWindow", // vendor library imported for side-effect
        ],
      },
    ],
    // TODO: Gradually fix and then drop https://github.com/pixiebrix/eslint-config-pixiebrix/pull/150
    "@typescript-eslint/no-unsafe-assignment": "warn",
    "@typescript-eslint/no-unsafe-member-access": "warn",
    "@typescript-eslint/no-unsafe-return": "warn",
    "no-restricted-syntax": [
      "error",
      // If they're not specific to the extension, add them to the shared config instead:
      // https://github.com/pixiebrix/eslint-config-pixiebrix/blob/main/no-restricted-syntax.js
      ...require("eslint-config-pixiebrix/no-restricted-syntax"),
      {
        selector: "CallExpression[callee.property.name='allSettled']",
        message:
          'For safety and convenience, use this instead: import { allSettled } from "@/utils/promiseUtils";',
      },
      {
        message:
          'Use `getExtensionConsoleUrl` instead of `browser.runtime.getURL("options.html")` because it automatically handles paths/routes',
        selector:
          "CallExpression[callee.object.property.name='runtime'][callee.property.name='getURL'][arguments.0.value='options.html']",
      },
      // NOTE: If you add more rules, add the tests to eslint-local-rules/noRestrictedSyntax.ts
    ],

    // We want to have a default case to check for `never`
    "@typescript-eslint/switch-exhaustiveness-check": [
      "error",
      {
        allowDefaultCaseForExhaustiveSwitch: true,
        requireDefaultForNonUnion: true,
      },
    ],

    // Rules that depend on https://github.com/pixiebrix/pixiebrix-extension/issues/775
    "@typescript-eslint/restrict-template-expressions": [
      "error",
      { allowNever: true },
    ],
  },
  overrides: [
    {
      files: [
        "webpack.*.js",
        "*.config.js",
        "scripts/*",
        "eslint-local-rules/*",
      ],
      // Full config: https://github.com/pixiebrix/eslint-config-pixiebrix/blob/main/development.js
      extends: ["pixiebrix/development"],
      rules: {
        "local-rules/noCrossBoundaryImports": "off",
      },
    },
    {
      files: [
        "*/scripts/*",
        "**/__mocks__/**",
        "**/testUtils/**",
        "**/*.test.ts",
        "**/*.test.tsx",
        "**/testHelpers.*",
        "**/*.stories.tsx",
      ],
      // Full config: https://github.com/pixiebrix/eslint-config-pixiebrix/blob/main/tests.js
      extends: ["pixiebrix/development", "pixiebrix/tests"],
      rules: {
        "unicorn/prefer-spread": "off",
        "local-rules/noCrossBoundaryImports": "off",
      },
    },
    {
      files: ["./src/platform/**"],
      rules: {
        "local-rules/noCrossBoundaryImports": [
          // Turn into error
          "error",
          {
            boundaries,
            // Do not allow Messenger imports either
            allowedGlobs: ["**/*.scss*"],
          },
        ],
      },
    },
    {
      files: [
        "./src/background/**",
        ...readFileSync(
          resolve(__dirname, "eslint-local-rules/persistBackgroundData.txt"),
          "utf8",
        )
          .split("\n")
          .filter((line) => line.startsWith("./src/")),
      ],
      excludedFiles: ["**/*.test.*", "**/api.ts"],
      rules: {
        "local-rules/persistBackgroundData": "error",
      },
    },
    {
      // Settings for regular ts files that should only apply to react component rests
      files: ["**/!(*.test)*.ts?(x)", "**/*.ts"],
      rules: {
        "testing-library/render-result-naming-convention": "off",
        "testing-library/no-await-sync-queries": "off",
      },
    },
    {
      // These rules should not be enabled for JS files
      files: ["*.js", "*.mjs", "*.cjs"],
      rules: {
        "@typescript-eslint/no-unsafe-member-access": "off",
        "@typescript-eslint/no-unsafe-call": "off",
        "@typescript-eslint/no-unsafe-assignment": "off",
        "@typescript-eslint/no-unsafe-return": "off",
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
