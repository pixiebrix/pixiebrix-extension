import configFactory from "./webpack.config.mjs";

const config = configFactory(process.env, {});

// https://knip.dev/overview/configuration#customize
const knipConfig = {
  $schema: "https://unpkg.com/knip@5/schema.json",
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
    // Polyfills
    "src/vendors/process.js",
    // Aliases defined in tsconfig.json
    "src/contrib/uipath/quietLogger.ts",
    // Development/debugging helpers
    "src/development/hooks/**",

    // Instead of adding files to this list, prefer adding a @knip JSDoc comment with explanation, like:
    //
    // /** @knip We want to use this later */
    // export const someValue = 0;
  ],
  ignoreDependencies: [
    // Browser environment types
    "@types/chrome",
    "@types/dom-navigation",
    // Webpack environment types, provides require.context, etc.
    "@types/webpack-env",
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
    "@types/gapi.client.sheets-v4",
    // Used by Code Editor so format on save matches pre-commit behavior
    "prettier",
  ],
  ignoreBinaries: [
    // Used without installation
    "knip",
  ],
};

// Echo settings to console to make CI results easier to understand/debug
console.log(JSON.stringify(knipConfig, null, 2));

export default knipConfig;
