import configFactory from "./webpack.config.mjs";

const config = configFactory(process.env, {});

/**
 * https://knip.dev/overview/configuration#customize
 * @type {import("knip").KnipConfig}
 */
const knipConfig = {
  $schema: "https://unpkg.com/knip@5/schema.json",
  entry: [
    ...Object.values(config.entry)
      .map((x) => `${x}.{ts,tsx,js,jsx}`.replace("./", ""))
      .map((x) => `${x}!`),

    // App messenger and common storage
    "src/background/messenger/external/api.ts!",
    "src/store/browserExtensionIdStorage.ts!",
  ],
  project: [
    "src/**/*.ts!",
    "!src/__mocks__/**!",
    "!src/**/testHelpers.{ts,tsx}!",
    "!src/testUtils/**!",
    "!src/telemetry/lexicon.ts!",
    "!src/development/hooks/**!",
    "!src/vendors/reactPerformanceTesting/**!",
  ],
  ignoreDependencies: [
    // TODO: These are used by production files, shouldn't need to ignore them?
    "@fortawesome/free-brands-svg-icons",
    "@fortawesome/free-regular-svg-icons",
    "@szhsin/react-menu",
    "ace-builds",
    "bootstrap",
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
  ],
  // False positive for PackageInstance.featureFlag
  ignoreMembers: ["featureFlag"],
};

// Echo settings to console to make CI results easier to understand/debug
console.log(JSON.stringify(knipConfig, null, 2));

export default knipConfig;
