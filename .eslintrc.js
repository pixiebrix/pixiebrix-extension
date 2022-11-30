const restrictedZones = [
  "background",
  "contentScript",
  "pageEditor",
  "options",
  "sidebar",
  // "pageScript", // TODO: After Messenger migration
].map((exporter) => ({
  target: `./src/!(${exporter})/**/*`,
  from: `./src/${exporter}`,
  message: `Cross-context imports break expectations. Shared components should be in shared folders. Solution 1: keep both importer and imported modules in the same context (shared or @/${exporter}). Solution 2: Use the Messenger if they are in the correct context.`,
  except: [
    `../${exporter}/messenger`,
    `../${exporter}/types.ts`,
    // `../${exporter}/**/*Types.ts`, // TODO: Globs don't seem to work
    `../${exporter}/nativeEditor/types.ts`,
    `../${exporter}/pageEditorTypes.ts`,
    `../${exporter}/runBlockTypes.ts`,
    `../${exporter}/extensionPoints/formStateTypes.ts`,
    `../${exporter}/tabs/editTab/dataPanel/dataPanelTypes.ts`,
  ],
}));

module.exports = {
  root: true,
  extends: [
    // Full config: https://github.com/fregante/eslint-config-pixiebrix/blob/main/index.js
    "pixiebrix",
  ],
  rules: {
    // TODO: It duplicates imports, wait for https://github.com/typescript-eslint/typescript-eslint/issues/4338
    "@typescript-eslint/consistent-type-imports": "off",

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
          "webext-dynamic-content-scripts", // Automatic registration
          "regenerator-runtime/runtime", // Automatic registration
        ],
      },
    ],

    // Rules that depend on https://github.com/pixiebrix/pixiebrix-extension/issues/775
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/restrict-template-expressions": "warn",

    // Enabled for the IDE, but it's disabled in the `lint` script
    "import/no-cycle": "warn",
  },
  overrides: [
    {
      files: [
        "webpack.*.js",
        "*.config.js",
        "**/testUtils/**",
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
      },
    },
  ],
};
