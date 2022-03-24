const contexts = [
  "background",
  "contentScript",
  "pageEditor",
  "options",
  "sidebar",
  // "pageScript", // TODO: After Messenger migration
];

const restrictedZones = [];
for (const exporter of contexts) {
  for (const importer of contexts) {
    if (exporter !== importer) {
      restrictedZones.push({
        target: `./src/${importer}/**/*`,
        from: `./src/${exporter}`,
        except: [
          `../${exporter}/messenger/api.ts`,
          `../${exporter}/types.ts`,
          `../${exporter}/nativeEditor/types.ts`,
        ],
      });
    }
  }
}

module.exports = {
  root: true,
  extends: [
    // Full config: https://github.com/fregante/eslint-config-pixiebrix/blob/main/index.js
    "pixiebrix",
  ],
  rules: {
    "import/no-restricted-paths": [
      "error",
      {
        zones: restrictedZones,
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
          "@/messaging/external",
          "@/extensionContext", // Must be run before other code
          "@/background/axiosFetch", // Must be run before other code
          "@/telemetry/reportUncaughtErrors",
          "@testing-library/jest-dom",
          "webext-dynamic-content-scripts", // Automatic registration
          "regenerator-runtime/runtime", // Automatic registration
        ],
      },
    ],

    // Incorrectly suggests to use `runtime.sendMessage` instead of `browser.runtime.sendMessage`
    "import/no-named-as-default-member": "off",

    // Rules that depend on https://github.com/pixiebrix/pixiebrix-extension/issues/775
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/restrict-template-expressions": "warn",
    "@typescript-eslint/no-unnecessary-type-assertion": "warn",

    // Rules to fix and enforce over time
    "no-await-in-loop": "warn",
    "unicorn/consistent-function-scoping": "warn", // Complains about some of the lifted functions
    "unicorn/no-await-expression-member": "warn", // Annoying sometimes, let's try it
    "@typescript-eslint/consistent-type-assertions": "warn",
  },
  overrides: [
    {
      files: [
        "webpack.*.js",
        "*.config.js",
        "test-env.js",
        "**/__mocks__/**",
        "*.test.js",
        "*.test.ts",
        "*.test.tsx",
      ],
      env: {
        node: true,
        jest: true,
      },
      // Overridden rules: https://github.com/fregante/eslint-config-pixiebrix/blob/main/server.js
      extends: ["pixiebrix/server", "plugin:jest/recommended"],
      rules: {
        "@typescript-eslint/consistent-type-assertions": "off",
        "jest/no-conditional-expect": "off",
        "unicorn/consistent-function-scoping": "off",
        // Incorrectly suggests to use `runtime.sendMessage` instead of `browser.runtime.sendMessage`
        "import/no-named-as-default-member": "off",
      },
    },
  ],
};
