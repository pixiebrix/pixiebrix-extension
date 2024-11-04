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

import path from "node:path";
import { execSync } from "node:child_process";
import webpack from "webpack";
import MiniCssExtractPlugin from "mini-css-extract-plugin";
import WebExtensionTarget from "webpack-target-webextension";
import NodePolyfillPlugin from "node-polyfill-webpack-plugin";
import WebpackBuildNotifierPlugin from "webpack-build-notifier";
import TerserPlugin from "terser-webpack-plugin";
import CssMinimizerPlugin from "css-minimizer-webpack-plugin";
import { BundleAnalyzerPlugin } from "webpack-bundle-analyzer";
import CopyPlugin from "copy-webpack-plugin";
import { compact } from "lodash-es";
import mergeWithShared from "./webpack.sharedConfig.js";
import { parseEnv, loadEnv } from "./scripts/env.mjs";
import customizeManifest from "./scripts/manifest.mjs";
import { createRequire } from "node:module";
import DiscardFilePlugin from "./scripts/DiscardFilePlugin.mjs";
import isolatedComponentList from "./src/components/isolatedComponentList.mjs";
import ReactRefreshWebpackPlugin from "@pmmmwh/react-refresh-webpack-plugin";

const require = createRequire(import.meta.url);

loadEnv();

console.log("SOURCE_VERSION:", process.env.SOURCE_VERSION);
console.log("SERVICE_URL:", process.env.SERVICE_URL);
console.log("MARKETPLACE_URL:", process.env.MARKETPLACE_URL);
console.log("CHROME_EXTENSION_ID:", process.env.CHROME_EXTENSION_ID);
console.log("MV:", process.env.MV);
console.log(
  "REQUIRE_OPTIONAL_PERMISSIONS_IN_MANIFEST:",
  process.env.REQUIRE_OPTIONAL_PERMISSIONS_IN_MANIFEST,
);

if (!process.env.SOURCE_VERSION) {
  process.env.SOURCE_VERSION = execSync("git rev-parse --short HEAD")
    .toString()
    .trim();
}

// Configure sourcemaps
// Disable sourcemaps on CI unless it's a PUBLIC_RELEASE
const produceSourcemap =
  !parseEnv(process.env.CI) || parseEnv(process.env.PUBLIC_RELEASE);

const sourceMapPublicUrl =
  parseEnv(process.env.PUBLIC_RELEASE) &&
  `${process.env.SOURCE_MAP_URL_BASE}/${process.env.SOURCE_MAP_PATH}/`;

let sourcemapsLogMessage = "Sourcemaps: ";

if (sourceMapPublicUrl) {
  sourcemapsLogMessage += sourceMapPublicUrl;
} else if (produceSourcemap) {
  sourcemapsLogMessage += "Local";
} else {
  sourcemapsLogMessage += "None";
}

console.log(sourcemapsLogMessage);

const isProd = (options) => options.mode === "production";

function mockHeavyDependencies() {
  if (process.env.DEV_SLIM.toLowerCase() === "true") {
    console.warn("Mocking dependencies for development build: @/icons/list");
    return {
      "@/icons/list": path.resolve("src/__mocks__/@/icons/list"),
    };
  }
}

const isHMR = Boolean(process.env.HMR);

const createConfig = (env, options) =>
  mergeWithShared({
    node: {
      global: true,
    },

    // Don't use `eval` maps https://stackoverflow.com/a/57460886/402560
    // Explicitly handled by `SourceMapDevToolPlugin` below
    devtool: false,

    output: {
      publicPath: "",
      path: path.resolve("dist"),
      chunkFilename: "bundles/[name].bundle.js",
      environment: {
        // https://github.com/awesome-webextension/webpack-target-webextension#code-splitting
        dynamicImport: true,
      },
    },

    entry: Object.fromEntries(
      [
        "background/background",

        "contentScript/contentScript",
        "contentScript/loadActivationEnhancements",
        "contentScript/setExtensionIdInApp",

        "pageEditor/pageEditor",
        "extensionConsole/options",
        "sidebar/sidebar",
        "sandbox/sandbox",

        "tinyPages/ephemeralForm",
        "tinyPages/walkthroughModal",
        "tinyPages/ephemeralPanel",
        "tinyPages/restrictedUrlPopup",

        // Tiny files without imports
        "tinyPages/frame",
        "tinyPages/devtools",

        // The script that gets injected into the host page
        "pageScript/pageScript",

        "tinyPages/offscreen",

        // The isolated components whose CSS will be loaded in a shadow DOM
        ...isolatedComponentList,
      ].map((name) => [path.basename(name), `./src/${name}`]),
    ),

    resolve: {
      alias: {
        ...mockHeavyDependencies(),

        ...(isProd(options) || process.env.DEV_REDUX_LOGGER === "false"
          ? { "redux-logger": false }
          : {}),
      },
    },

    optimization: {
      // Module concatenation mangles class names https://github.com/pixiebrix/pixiebrix-extension/issues/4763
      concatenateModules: false,

      // Chrome bug https://bugs.chromium.org/p/chromium/issues/detail?id=1108199
      splitChunks: {
        automaticNameDelimiter: "-",
        cacheGroups: {
          vendors: false,
        },
      },

      minimizer: [
        new TerserPlugin({
          parallel: true,
          terserOptions: {
            // https://github.com/webpack-contrib/terser-webpack-plugin#terseroptions
            // Keep error classnames because we perform name comparison (see selectSpecificError)
            // We use Action for SubmitPanelAction, AbortPanelAction, etc.
            keep_classnames: /.*(Error|Action)$/,
          },
        }),
        new CssMinimizerPlugin(),
      ],
    },

    performance: {
      // Silence warnings because the size includes the sourcemaps
      maxEntrypointSize: 15_120_000,
      maxAssetSize: 15_120_000,
    },

    // Enable HMR
    devServer: {
      hot: true,
    },
    plugins: compact([
      produceSourcemap &&
        new webpack.SourceMapDevToolPlugin({
          publicPath: sourceMapPublicUrl,

          // The sourcemap will be inlined if `undefined`. Only inlined sourcemaps work locally
          // https://bugs.chromium.org/p/chromium/issues/detail?id=974543
          // NOTE: Datadog requires .js.map as the extension: https://github.com/DataDog/datadog-ci/issues/870
          // The [file] already includes the js file extension
          filename: sourceMapPublicUrl && "[file].map[query]",
        }),

      // Only notifies when watching. `zsh-notify` is suggested for the `build` script
      !isProd(options) &&
        process.env.DEV_NOTIFY !== "false" &&
        new WebpackBuildNotifierPlugin({
          title: "PB Extension",
          showDuration: true,
        }),

      isProd(options) &&
        new BundleAnalyzerPlugin({
          analyzerMode: "static",
          reportFilename: path.resolve("report.html"),
          excludeAssets: /svg-icons/,
        }),

      new NodePolyfillPlugin({
        // Specify the least amount of polyfills.
        // By default it polyfills even `console`
        includeAliases: ["buffer", "Buffer", "http", "https"],
      }),
      new WebExtensionTarget({
        weakRuntimeCheck: true,

        // Required to support sandboxed iframes
        // https://github.com/awesome-webextension/webpack-target-webextension/pull/42
        background: {
          // Do not use serviceWorkerEntry:
          // https://github.com/awesome-webextension/webpack-target-webextension/issues/24#issuecomment-1914057083
          pageEntry: "background",
        },
      }),
      new webpack.ProvidePlugin({
        $: "jquery",
        jQuery: "jquery",
        browser: "webextension-polyfill",
        process: path.resolve("src/vendors/process.js"),
      }),

      // This will inject the current ENVs into the bundle, if found
      new webpack.EnvironmentPlugin({
        // If not found, these values will be used as defaults
        DEBUG: !isProd(options),
        NODE_DEBUG: false,
        REDUX_DEV_TOOLS: !isProd(options),
        NPM_PACKAGE_VERSION: process.env.npm_package_version,
        ENVIRONMENT: options.mode,
        SOURCE_MAP_PUBLIC_PATH:
          sourceMapPublicUrl ?? "extension://dynamichost/",
        // Record telemetry events in development?
        DEV_EVENT_TELEMETRY: false,
        SANDBOX_LOGGING: false,
        IS_BETA: process.env.RELEASE_CHANNEL === "beta",
        SHADOW_DOM: "open",

        // If not found, "undefined" will cause the build to fail
        SERVICE_URL: undefined,
        MARKETPLACE_URL: undefined,
        SOURCE_VERSION: undefined,
        CHROME_EXTENSION_ID: undefined,

        // If not found, "null" will leave the ENV unset in the bundle
        // DataDog RUM/Logging
        DATADOG_APPLICATION_ID: null,
        DATADOG_CLIENT_TOKEN: null,
      }),

      new MiniCssExtractPlugin({
        // Use [name] to keep the original filename; allowing us to filter on it
        // See https://github.com/pixiebrix/pixiebrix-extension/issues/8965
        chunkFilename: "css/[name].css",
      }),
      new CopyPlugin({
        patterns: [
          {
            from: "src/manifest.json",
            transform(jsonString) {
              const manifest = JSON.parse(jsonString);
              const customizedManifest = customizeManifest(manifest, {
                isProduction: isProd(options),
                manifestVersion: process.env.MV === "2" ? 2 : 3, // Default to 3 if missing
                env: process.env,
                isBeta: process.env.RELEASE_CHANNEL === "beta",
              });

              return JSON.stringify(customizedManifest, null, 2);
            },
          },
          {
            from: "src/*/*.html", // Only one level deep
            to: "[name][ext]", // Flat output, no subfolders
          },
          "static",
        ],
      }),

      // These files are not used, they're only webpack entry points in order to generate
      // a full CSS files that can be injected in shadow DOM. See this for more context:
      // https://github.com/webpack-contrib/mini-css-extract-plugin/issues/1092#issuecomment-2037540032
      new DiscardFilePlugin(isolatedComponentList),

      isHMR &&
        new ReactRefreshWebpackPlugin({
          overlay: false,
        }),
    ]),
    module: {
      rules: [
        {
          test: /\.s?css$/,
          resourceQuery: { not: [/loadAsUrl|loadAsText/] },
          use: [MiniCssExtractPlugin.loader, "css-loader"],
        },
        {
          test: /\.scss$/,
          use: [
            {
              loader: "sass-loader",
              options: {
                sassOptions: {
                  // Due to warnings in dart-sass https://github.com/pixiebrix/pixiebrix-extension/pull/1070
                  quietDeps: true,
                },
              },
            },
          ],
        },
        // Pull bootstrap-icons and simple-icons from CDN to reduce bundle size.
        {
          test: /bootstrap-icons\/.*\.svg$/,
          type: "asset/resource",
          generator: {
            emit: false,
            publicPath: `https://cdn.jsdelivr.net/npm/bootstrap-icons@${
              require("bootstrap-icons/package.json").version
            }/`,
            filename: "icons/[name][ext]",
          },
        },
        {
          test: /simple-icons\/.*\.svg$/,
          type: "asset/resource",
          generator: {
            emit: false,
            publicPath: `https://cdn.jsdelivr.net/npm/simple-icons@${
              require("simple-icons/package.json").version
            }/`,
            filename: "icons/[name][ext]",
          },
        },
      ],
    },
  });

export default createConfig;
