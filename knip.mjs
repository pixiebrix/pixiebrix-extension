/*
 * Copyright (C) 2024 PixieBrix, Inc.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import configFactory from "@pixiebrix/extension/webpack.config.mjs";

const config = configFactory(process.env, {});

/**
 * https://knip.dev/overview/configuration#customize
 * @type {import("knip").KnipConfig}
 *
 * Production mode: https://knip.dev/features/production-mode
 */
const knipConfig = {
  $schema: "https://unpkg.com/knip@5/schema.json",

  workspaces: {
    ".": {
      ignoreDependencies: [
        // Provided for use in IDE. See discussion: https://github.com/pixiebrix/pixiebrix-extension/pull/9503
        "prettier",
        // Used in local nx development commands (like generators)
        "@swc/helpers",
      ],
    },
    "libraries/*": {
      // ! suffix files are included in production mode
      entry: "src/index.ts!",
      project: ["src/**/*.ts!"],
      ignore: ["src/lib/globals.d.ts"],
    },
    "applications/browser-extension": {
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

        /**
         * Exclude from production runs (`!` prefix and suffix)
         * @see https://knip.dev/guides/configuring-project-files#production-mode
         */
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

        // Prefer adding `@internal` JSDoc comment if only used by tests, factories, etc.
        // `@internal` only ignores during production runs so it will still flag unused exports during full runs
      ],
      ignoreDependencies: [
        // TODO: These are used by production files, shouldn't need to ignore them?
        // Most appear to be dynamic imports, maybe there's a plugin we need
        "@fortawesome/free-brands-svg-icons",
        "@fortawesome/free-regular-svg-icons",
        "@szhsin/react-menu",
        "ace-builds",
        "fit-textarea",
        "holderjs",
        "jszip",
        "react-ace",
        "react-autosuggest",
        "react-hot-toast",
        "react-hotkeys",
        "react-image-crop",
        "react-outside-click-handler",
        "react-select-virtualized",
        "react-spinners",
        "react-virtualized-auto-sizer",
        "react-window",

        // PeerDependency of react-select-virtualized
        "react-virtualized",

        // Browser environment types
        "@types/chrome",
        "@types/dom-navigation",
        "@types/trusted-types",
        // Provides require.context, etc.
        "@types/webpack-env",
        // Used by src/contrib/google/sheets/core/types.ts
        "@types/gapi.client",
        "@types/gapi.client.drive-v3",
        "@types/gapi.client.oauth2-v2",
        "@types/gapi.client.sheets-v4",

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
        "@tiptap/pm",
        "@tiptap/starter-kit",
        "@tiptap/react",
        "@tiptap/extension-underline",
        "@tiptap/extension-link",
        "@tiptap/extension-image",
        "thenby",

        // False positives flagged in --production checks.
        // In non-production runs, these entries are flagged as unnecessary ignoreDependencies entries
        "bootstrap-icons",
        "jquery",
        "lodash-es",
        "react-router-dom",
        "simple-icons",
      ],
      // False positive for PackageInstance.featureFlag
      ignoreMembers: ["featureFlag"],
    },
  },
};

// Echo settings to console to make CI results easier to understand/debug
console.log(JSON.stringify(knipConfig, null, 2));

export default knipConfig;
