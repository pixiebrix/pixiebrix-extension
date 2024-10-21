const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const noRestrictedImports = require("eslint-config-pixiebrix/no-restricted-imports");

function extendNoRestrictedImports({ patterns = [], paths = [] }) {
  // Clone object to avoid modifying the original
  const customized = structuredClone(noRestrictedImports);
  customized.patterns.push(...patterns);
  customized.paths.push(...paths);
  return customized;
}

const boundaries = [
  "background",
  "contentScript",
  "pageEditor",
  "extensionConsole",
  "sidebar",
  "pageScript",
];

const forbiddenDomPropsConfig = [
  "error",
  {
    // Context: https://github.com/pixiebrix/pixiebrix-extension/pull/7832
    forbid: [
      {
        propName: "target",
        message:
          'In this folder, `target="_blank"` already the default thanks to the `<base>` in the .html file',
      },
      {
        propName: "rel",
        message:
          "This attribute was probably left behind after dropping the `target` attribute.",
      },
    ],
  },
];

module.exports = {
  root: true,
  extends: [
    // Full config: https://github.com/pixiebrix/eslint-config-pixiebrix/blob/main/index.js
    "pixiebrix",
  ],
  plugins: ["local-rules"],
  rules: {
    "new-cap": [
      "error",
      {
        capIsNewExceptionPattern:
          "(TEST_|INTERNAL_|HACK_|UNSAFE_|API_PATHS.|UI_PATHS.)",
      },
    ],
    "no-param-reassign": [
      "warn",
      {
        props: true,
        ignorePropertyModificationsFor: ["draft", "state"],
      },
    ],
    "@eslint-community/eslint-comments/require-description": [
      "error",
      { ignore: ["eslint-enable"] },
    ],
    "jest/valid-title": [
      "error",
      {
        mustNotMatch: {
          test: [
            /^it/.source,
            'Test title should not begin with `it`. Use `it("should ...")` or omit `it` from the title instead.',
          ],
        },
      },
    ],
    "local-rules/preferAxiosMockAdapter": "error",
    "local-rules/noNullRtkQueryArgs": "error",
    "local-rules/noInvalidDataTestId": "error",
    "local-rules/noExpressionLiterals": "error",
    "local-rules/notBothLabelAndLockableProps": "error",
    "local-rules/preferNullish": "error",
    "local-rules/preferNullishable": "error",
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
          "iframe-resizer/js/iframeResizer.contentWindow", // Vendor library imported for side-effect
        ],
      },
    ],

    "no-restricted-imports": [
      "error",
      // If they're not specific to the extension, add them to the shared config instead:
      // https://github.com/pixiebrix/eslint-config-pixiebrix/blob/main/no-restricted-imports.js
      extendNoRestrictedImports({
        patterns: [
          {
            group: ["axios"],
            importNames: ["AxiosRequestConfig"],
            message:
              'Use this instead: import { NetworkRequestConfig } from "@/types/networkTypes"',
          },
          {
            group: ["react-shadow/emotion"],
            message:
              'Use this instead: import EmotionShadowRoot from "@/components/EmotionShadowRoot"',
          },
        ],
      }),
    ],

    "no-restricted-syntax": [
      "error",
      // If they're not specific to the extension, add them to the shared config instead:
      // https://github.com/pixiebrix/eslint-config-pixiebrix/blob/main/no-restricted-syntax.js
      ...require("eslint-config-pixiebrix/no-restricted-syntax"),
      {
        message:
          'Use `getExtensionConsoleUrl` instead of `browser.runtime.getURL("options.html")` because it automatically handles paths/routes',
        selector:
          "CallExpression[callee.object.property.name='runtime'][callee.property.name='getURL'][arguments.0.value='options.html']",
      },
      {
        message:
          "Prefer using `getSelectionRange()` helper or check `selection.rangeCount` first: https://github.com/pixiebrix/pixiebrix-extension/pull/7989",
        selector: "CallExpression[callee.property.name='getRangeAt']",
      },
      // NOTE: If you add more rules, add the tests to eslint-local-rules/noRestrictedSyntax.tsx
    ],
  },
  overrides: [
    {
      files: ["**/*.ts", "**/*.tsx", "**/*.mts", "**/*.cts"],
      rules: {
        // TODO: Gradually fix and then drop https://github.com/pixiebrix/eslint-config-pixiebrix/pull/150
        "@typescript-eslint/no-unsafe-assignment": "warn",
        "@typescript-eslint/no-unsafe-member-access": "warn",
      },
    },
    {
      // TODO: consider packaging e2e tests in a mono-repo structure for specific linting rules
      files: ["end-to-end-tests/**"], // Or *.test.js
      extends: "plugin:playwright/recommended",
      rules: {
        "no-restricted-imports": "off",
        "unicorn/prefer-dom-node-dataset": "off",
        "unicorn/prefer-module": "off", // `import.meta.dirname` throws "cannot use 'import meta' outside a module"
        "no-await-in-loop": "off",
        "security/detect-object-injection": "off",
        "playwright/no-skipped-test": [
          "error",
          {
            allowConditional: true,
          },
        ],
        "playwright/no-page-pause": "error",
        "playwright/no-wait-for-timeout": "error",
        "playwright/no-useless-not": "error",
        "playwright/expect-expect": [
          "error",
          { assertFunctionNames: ["checkUnavailibilityForNavigationMethod"] },
        ],
        "playwright/no-conditional-in-test": "error",
        "playwright/no-conditional-expect": "error",
        "playwright/no-commented-out-tests": "error",
        "playwright/no-hooks": "error", // Use fixtures instead to share common setup / teardown code
        "playwright/no-get-by-title": "error",
        // Disabled because raw locators are sometimes necessary for specific test scenarios, and we don't want noisy warnings in the IDE
        // However, our README encourages writing tests using the recommended built-in locators where possible
        // "playwright/no-raw-locators": "warn",
        "playwright/prefer-comparison-matcher": "error",
        "playwright/prefer-equality-matcher": "error",
        "playwright/prefer-strict-equal": "error",
        "playwright/prefer-to-be": "error",
        "playwright/prefer-to-contain": "error",
        "playwright/prefer-to-have-count": "error",
        "playwright/prefer-to-have-length": "error",
        "playwright/require-to-throw-message": "error",
        "no-restricted-syntax": [
          "error",
          {
            message:
              "Define a value for the timeout options parameter to avoid waiting forever (`.toPass` by default will retry forever)",
            selector:
              "CallExpression[callee.property.name='toPass'][arguments.length=0]",
          },
        ],
        "local-rules/preferUsingStepsForLongTests": "error",
      },
    },
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
      // Settings for regular ts files that should only apply to react component tests
      files: ["**/!(*.test)*.ts?(x)", "**/*.ts"],
      rules: {
        "testing-library/render-result-naming-convention": "off",
        "testing-library/no-await-sync-queries": "off",
      },
    },
    {
      files: ["./src/*"],
      rules: {
        "no-restricted-imports": [
          "error",
          extendNoRestrictedImports({
            patterns: [
              {
                group: ["./*"],
                message:
                  'Use root-based imports (`import "@/something"`) instead of relative imports.',
              },
              {
                group: ["../*"],
                message:
                  'Use root-based imports (`import "@/something"`) instead of relative imports.',
              },
            ],
          }),
        ],
      },
    },
    {
      files: ["./src/**/*.tsx", "./src/**/use*.ts"],
      rules: {
        "no-restricted-imports": [
          "error",
          extendNoRestrictedImports({
            patterns: [
              {
                group: ["@/auth/featureFlagStorage"],
                message:
                  "Use useFlags instead of featureFlagStorage in React code.",
              },
            ],
          }),
        ],
      },
    },
    {
      files: ["./src/pageEditor/**.tsx", "./src/sidebar/**.tsx"],
      rules: {
        "react/forbid-dom-props": forbiddenDomPropsConfig,
        "react/forbid-component-props": forbiddenDomPropsConfig,
      },
    },
    {
      files: ["**/*.test.ts?(x)", "**/*.spec.ts"],
      rules: {
        "@typescript-eslint/no-non-null-assertion": "off",
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
