import configFactory from "./webpack.config.mjs";

const config = configFactory(process.env, {});

// https://knip.dev/overview/configuration#customize
const knipConfig = {
  $schema: "https://unpkg.com/knip@3/schema.json",
  webpack: {
    config: [
      "webpack.config.mjs",
      "scripts/webpack.scripts.js",
      ".storybook/main.js",
    ],
  },
  entry: [
    ...Object.values(config.entry).map((x) =>
      `${x}.{ts,tsx,js,jsx}`.replace("./", ""),
    ),
    "src/development/headers.ts",
    // App messenger
    "src/contentScript/externalProtocol.ts",
    // Jest setup files
    "src/testUtils/testEnv.js",
    "src/testUtils/testAfterEnv.ts",
    "src/testUtils/injectRegistries.ts",
    "src/testUtils/FixJsdomEnvironment.js",
    // Script helpers
    "scripts/manifest.mjs",
  ],
  project: ["src/**/*.{js,cjs,mjs,jsx,ts,cts,mts,tsx}"],
  // https://knip.dev/guides/handling-issues#mocks-and-other-implicit-imports
  ignore: [
    "**/__mocks__/**",
    "@contrib/**",
    // Polyfills
    "src/vendors/process.js",
    // Aliases defined in tsconfig.json
    "src/contrib/uipath/quietLogger.ts",
    // Development/debugging helpers
    "src/development/hooks/**",
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
    // Polyfills via ProvidePlugin aren't detected by webpack plugin
    "min-document",
    // Not getting detected by webpack plugin for .storybook/main.js
    "style-loader",
    "@storybook/react-webpack5",
  ],
  rules: {
    // Issue Type reference: https://knip.dev/reference/issue-types/
    unlisted: "warn",
    unresolved: "warn",
    exports: "warn",
    nsExports: "warn",
    types: "warn",
    nsTypes: "warn",
    enumMembers: "warn",
    // Incrementally enforce rules over time
    files: "error",
    duplicates: "error",
    dependencies: "error",
    classMembers: "error",
    binaries: "error",
  },
};

// Echo settings to console to make CI results easier to understand/debug
console.log(JSON.stringify(knipConfig, null, 2));

export default knipConfig;
