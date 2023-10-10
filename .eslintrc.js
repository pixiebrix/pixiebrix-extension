const restrictedZones = [
  "background",
  "contentScript",
  "pageEditor",
  "extensionConsole",
  "sidebar",
  "pageScript",
].map((exporter) => ({
  // All of these files cannot import `from` (exclude self-imports)
  target:
    exporter === "contentScript"
      ? `./src/!(${exporter}|bricks|starterBricks)/**/*` // Temporary: Bricks and starterBricks are implicitly run from CS
      : `./src/!(${exporter})/**/*`,

  // The files above cannot import `from` this folder
  from: `./src/${exporter}`,

  // These can be imported from anywhere
  except: [
    `../${exporter}/messenger`,
    `../${exporter}/types.ts`,
    // `../${exporter}/**/*Types.ts`, // TODO: Globs don't seem to work
    `../${exporter}/pageEditor/types.ts`,
    `../${exporter}/pageEditorTypes.ts`,
    `../${exporter}/runBlockTypes.ts`,
    `../${exporter}/extensionPoints/formStateTypes.ts`,
    `../${exporter}/tabs/editTab/dataPanel/dataPanelTypes.ts`,
  ],

  message: `Cross-context imports break expectations. Shared components should be in shared folders.
  Solution 1: Keep both importing and imported modules in the same context (shared or @/${exporter}).
  Solution 2: Use the Messenger if they are in the correct context.
  Solution 3: Propose a clearly-shared component within the context, like we do for Messenger and *Types files.`,
}));

module.exports = {
  root: true,
  extends: [
    // Full config: https://github.com/pixiebrix/eslint-config-pixiebrix/blob/main/index.js
    "pixiebrix",
    "plugin:pixiebrix-extension/all",
  ],
  rules: {
    "import/no-restricted-paths": [
      "warn",
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
          "@/background/messenger/external/api",
          "@/extensionContext", // Must be run before other code
          "@/background/axiosFetch", // Must be run before other code
          "@/telemetry/reportUncaughtErrors",
          "@testing-library/jest-dom",
          "jest-location-mock",
          "regenerator-runtime/runtime", // Automatic registration
          "@/vendors/hoverintent/hoverintent", // JQuery plugin
          "iframe-resizer/js/iframeResizer.contentWindow", // vendor library imported for side-effect
        ],
      },
    ],

    "no-restricted-syntax": [
      "error",
      {
        message: "Don't use randomUUID. It's not available in http: contexts",
        selector: 'MemberExpression > Identifier[name="randomUUID"]',
      },
    ],

    // Rules that depend on https://github.com/pixiebrix/pixiebrix-extension/issues/775
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/restrict-template-expressions": "warn",
    "@typescript-eslint/no-non-null-assertion": "error", // TODO: Move to shared config

    // Enabled for the IDE, but it's disabled in the `lint` script
    "import/no-cycle": "warn",
  },
  overrides: [
    {
      files: [
        "webpack.*.js",
        "*.config.js",
        "**/testUtils/testEnv.js",
        "**/__mocks__/**",
        "*.test.js",
        "*.test.ts",
        "*.test.tsx",
      ],
      env: {
        node: true,
        jest: true,
      },
      // Overridden rules: https://github.com/pixiebrix/eslint-config-pixiebrix/blob/main/server.js
      extends: ["pixiebrix/server"],
      rules: {
        "import/no-restricted-paths": "off",
        "@typescript-eslint/no-non-null-assertion": "off", // TODO: Move to shared config
      },
    },
    {
      files: ["**/*.js"],
      rules: {
        "@typescript-eslint/no-unsafe-argument": "off",
      },
    },
    {
      files: [
        "**/testEnv.js",
        "**/testHelpers.*",
        "**/testUtils/*",
        "**/*.stories.tsx",
      ],
      rules: {
        "unicorn/prefer-spread": "off",
      },
    },
    {
      files: ["src/testUtils/**/*"],
      rules: {
        "jest/no-export": "off",
        "testing-library/render-result-naming-convention": "off",
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
  ],
};
