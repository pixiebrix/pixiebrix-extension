import configFactory from "./webpack.config.mjs";

const config = configFactory(process.env, {});

/**
 * https://knip.dev/overview/configuration#customize
 * @type {import("knip").KnipConfig}
 */
const knipConfig = {
  $schema: "https://unpkg.com/knip@5/schema.json",
  entry: [
    // ! suffix files are included in production mode
    ...Object.values(config.entry).map((x) =>
      `${x}.{ts,tsx,js,jsx}!`.replace("./", ""),
    ),
    // App messenger and common storage
    "src/background/messenger/external/api.ts!",
    "src/store/browserExtensionIdStorage.ts!",

    // Loaded via .eslintrc
    "eslint-local-rules/*",

    // Include in default run only
    "end-to-end-tests/fixtures/*.ts",
    "end-to-end-tests/setup/*.setup.ts",
    "end-to-end-tests/utils.ts",

    // Imported via .html files and manifest.json
    "static/*",

    // Scripting/config entry points that are not being picked up
    "src/testUtils/FixJsdomEnvironment.js",
    "scripts/*.{mjs,ts}",
    "src/telemetry/lexicon.ts",

    "webpack.sharedConfig.js",
    ".storybook/main.js",
  ],
  project: [
    // Include in production mode and default run
    "src/**/*.ts!",

    // Exclude from production runs
    "!end-to-end-tests/**!",
    "!src/__mocks__/**!",
    "!src/**/testHelpers.{ts,tsx}!",
    "!src/testUtils/**!",
    "!src/telemetry/lexicon.ts!",
    "!src/development/hooks/**!",
    "!src/vendors/reactPerformanceTesting/**!",
    "!scripts/**!",
    "!webpack.sharedConfig.js!",
    "!.storybook/main.js!",
  ],
  // https://knip.dev/guides/handling-issues#mocks-and-other-implicit-imports
  ignore: [
    // Test Mocks
    "**/__mocks__/**",
    // Development/debugging helpers
    "src/development/hooks/**",
    // Including end-to-end tests for dependency check but not dead code
    "end-to-end-tests/**",

    // https://knip.dev/reference/jsdoc-tsdoc-tags/#tags-cli
    // Instead of adding files to this list, prefer adding a @knip JSDoc comment with explanation, like:

    // /** @knip We want to use this later */
    // export const someValue = 0;
  ],
  ignoreDependencies: [
    // TODO: These are used by production files, shouldn't need to ignore them?
    "@fortawesome/free-brands-svg-icons",
    "@fortawesome/free-regular-svg-icons",
    "@szhsin/react-menu",
    "ace-builds",
    "bootstrap-icons",
    "fit-textarea",
    "holderjs",
    "jquery",
    "jszip",
    "lodash-es",
    "react-ace",
    "react-autosuggest",
    "react-hot-toast",
    "react-hotkeys",
    "react-image-crop",
    "react-outside-click-handler",
    "react-router-dom",
    "react-select-virtualized",
    "react-spinners",
    "react-virtualized-auto-sizer",
    "react-window",
    "simple-icons",

    // PeerDependency of react-select-virtualized
    "react-virtualized",

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

    // Used but not detected
    "@types/holderjs",
    "@types/react-autosuggest",
    "@types/react-outside-click-handler",
    "@types/react-virtualized-auto-sizer",
    "@types/react-window",
  ],
  // False positive for PackageInstance.featureFlag
  ignoreMembers: ["featureFlag"],
};

// Echo settings to console to make CI results easier to understand/debug
console.log(JSON.stringify(knipConfig, null, 2));

export default knipConfig;
