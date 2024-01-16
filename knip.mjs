import configFactory from "./webpack.config.mjs";

const config = configFactory(process.env, {});

// https://knip.dev/overview/configuration#customize
const knipConfig = {
  $schema: "https://unpkg.com/knip@3/schema.json",
  webpack: {
    config: ["webpack.config.mjs", ".storybook/main.js"],
  },
  entry: [
    ...Object.values(config.entry).map((x) =>
      `${x}.{ts,tsx,js,jsx}`.replace("./", ""),
    ),
    "src/development/headers.ts",
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
  ],
  project: ["src/**/*.{js,cjs,mjs,jsx,ts,cts,mts,tsx}"],
  // https://knip.dev/guides/handling-issues#mocks-and-other-implicit-imports
  ignore: [
    "@contrib/**",
    // Test Mocks
    "**/__mocks__/**",
    "src/testUtils/detectPageMock.ts",
    // Dummy file to test lint rules
    "eslint-local-rules/noRestrictedSyntax.ts",
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
    "webext-base-css",
    "compass-mixins",
    // Not getting detected by webpack plugin for .storybook/main.js
    "style-loader",
    "@storybook/react-webpack5",
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
