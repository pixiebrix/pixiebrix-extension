import configFactory from "./webpack.config.mjs";

const config = configFactory(process.env, {});

/**
 * https://knip.dev/overview/configuration#customize
 * @type {import("knip").KnipConfig}
 */
const knipConfig = {
  $schema: "https://unpkg.com/knip@5/schema.json",
  entry: [
    ...Object.values(config.entry).map((x) =>
      `${x}.{ts,tsx,js,jsx}`.replace("./", ""),
    ),
    // Loaded via .eslintrc
    "eslint-local-rules/*",

    // Imported via .html files and manifest.json
    "static/*",

    // App messenger and common storage
    "src/background/messenger/external/api.ts",
    "src/store/browserExtensionIdStorage.ts",

    // Scripting/config entry points that are not being picked up
    "src/testUtils/FixJsdomEnvironment.js",
    "end-to-end-tests/fixtures/authentication.ts",
    "end-to-end-tests/setup/affiliated.setup.ts",
    "end-to-end-tests/setup/unaffiliated.setup.ts",
    "end-to-end-tests/setup/utils.ts",
    "scripts/DiscardFilePlugin.mjs",
  ],
  // https://knip.dev/guides/handling-issues#mocks-and-other-implicit-imports
  ignore: [
    "@contrib/**",
    // Test Mocks
    "**/__mocks__/**",
    // Dummy file to test lint rules
    "eslint-local-rules/noRestrictedSyntax.tsx",
    // Polyfills
    "src/vendors/process.js",
    // Aliases defined in tsconfig.json
    "src/contrib/uipath/quietLogger.ts",
    // Development/debugging helpers
    "src/development/hooks/**",
    // Type-only strictNullChecks helper
    "src/types/typeOnlyMessengerRegistration.ts",
    "end-to-end-tests/**",

    // https://knip.dev/reference/jsdoc-tsdoc-tags/#tags-cli
    // Instead of adding files to this list, prefer adding a @knip JSDoc comment with explanation, like:

    // /** @knip We want to use this later */
    // export const someValue = 0;
  ],
  ignoreDependencies: [
    // Browser environment types
    "@types/chrome",
    "@types/dom-navigation",
    // Provides require.context, etc.
    "@types/webpack-env",
    // Used by src/contrib/google/sheets/core/types.ts
    "@types/gapi.client",
    "@types/gapi.client.drive-v3",
    "@types/gapi.client.oauth2-v2",
    "@types/gapi.client.sheets-v4",

    // Used by Code Editor so format on save matches pre-commit behavior
    "prettier",
    // Referenced in scss files
    "bootstrap",
    "compass-mixins",
    // Not getting detected by webpack plugin for .storybook/main.js
    "style-loader",
    "@storybook/react-webpack5",
  ],
  // False positive for PackageInstance.featureFlag
  ignoreMembers: ["featureFlag"],
};

// Echo settings to console to make CI results easier to understand/debug
console.log(JSON.stringify(knipConfig, null, 2));

export default knipConfig;
