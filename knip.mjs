import configFactory from "./webpack.config.mjs";

const config = configFactory(process.env, {});

// https://knip.dev/overview/configuration#customize
const knipConfig = {
  $schema: "https://unpkg.com/knip@4/schema.json",
  webpack: {
    config: [
      "webpack.config.mjs",
      // `sharedConfig` not getting picked up automatically: https://github.com/pixiebrix/pixiebrix-extension/pull/7869
      "webpack.sharedConfig.js",
      ".storybook/main.js",
    ],
  },
  entry: [
    ...Object.values(config.entry).map((x) =>
      `${x}.{ts,tsx,js,jsx}`.replace("./", ""),
    ),
    // App messenger and common storage
    "src/contentScript/externalProtocol.ts",
    "src/background/messenger/external/api.ts",
    "src/store/browserExtensionIdStorage.ts",
    // Jest setup files
    "src/testUtils/testEnv.js",
    "src/testUtils/testAfterEnv.ts",
    "src/testUtils/injectRegistries.ts",
    "src/testUtils/FixJsdomEnvironment.js",
    // Script helpers
    "scripts/manifest.mjs",
    // Content script entry point, init() is dynamically imported in src/contentScript/contentScript.ts
    "src/contentScript/contentScriptCore.ts",
    // Type-only strictNullChecks helper
    "src/types/typeOnlyMessengerRegistration.ts",
    // Lint rules
    "eslint-local-rules/noCrossBoundaryImports.js",
  ],
  project: ["src/**/*.{js,cjs,mjs,jsx,ts,cts,mts,tsx}"],
  // https://knip.dev/guides/handling-issues#mocks-and-other-implicit-imports
  ignore: [
    "@contrib/**",
    // Test Mocks
    "**/__mocks__/**",
    "src/testUtils/detectPageMock.ts",
    // Dummy file to test lint rules
    "eslint-local-rules/noRestrictedSyntax.tsx",
    // `Render` method is unused currently, but may be used in the future. Keep for consistency of API with other
    // render helper modules.
    "src/testUtils/renderWithCommonStore.ts",
    // Polyfills
    "src/vendors/process.js",
    // Aliases defined in tsconfig.json
    "src/contrib/uipath/quietLogger.ts",
    // Development/debugging helpers
    "src/development/hooks/**",
    // Vendor files, to keep parity with upstream
    "src/vendors/page-metadata-parser/**",
    // False positive - dynamically imported in initRobot
    "src/contrib/uipath/UiPathRobot.ts",
    // Unused, but we'll likely need this again in the future
    "src/hooks/useContextInvalidated.ts",
  ],
  ignoreDependencies: [
    // Browser environment types
    "@types/chrome",
    "@types/dom-navigation",
    // Webpack environment types, provides require.context, etc.
    "@types/webpack-env",
    // Used by sheetsApi
    "@types/gapi.client.sheets-v4",
    // Referenced in global.d.ts
    "@total-typescript/ts-reset",
    // Referenced in scss files
    "bootstrap",
    "compass-mixins",
    // Not getting detected by webpack plugin for .storybook/main.js
    "style-loader",
    "@storybook/react-webpack5",
    // Used by src/contrib/google/sheets/core/types.ts
    "@types/gapi.client",
    "@types/gapi.client.drive-v3",
    "@types/gapi.client.oauth2-v2",
    // Used by Code Editor so format on save matches pre-commit behavior
    "prettier",
  ],
  rules: {
    // Issue Type reference: https://knip.dev/reference/issue-types/
    unlisted: "warn",
    unresolved: "warn",
    types: "warn",
    // Incrementally enforce rules over time
    exports: "error",
    nsExports: "error",
    files: "error",
    duplicates: "error",
    dependencies: "error",
    enumMembers: "error",
    classMembers: "error",
    binaries: "error",
    nsTypes: "error",
  },
};

// Echo settings to console to make CI results easier to understand/debug
console.log(JSON.stringify(knipConfig, null, 2));

export default knipConfig;
