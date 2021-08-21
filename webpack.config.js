/*
 * Copyright (C) 2021 PixieBrix, Inc.
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

const path = require("path");
const dotenv = require("dotenv");
const webpack = require("webpack");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const WebExtensionTarget = require("webpack-target-webextension");
const NodePolyfillPlugin = require("node-polyfill-webpack-plugin");
const WebpackBuildNotifierPlugin = require("webpack-build-notifier");
const TerserJSPlugin = require("terser-webpack-plugin");
const CssMinimizerPlugin = require("css-minimizer-webpack-plugin");
const RollbarSourceMapPlugin = require("rollbar-sourcemap-webpack-plugin");
const { BundleAnalyzerPlugin } = require("webpack-bundle-analyzer");
const CopyPlugin = require("copy-webpack-plugin");
const { uniq, isEmpty } = require("lodash");
const Policy = require("csp-parse");
const mergeWithShared = require("./webpack.sharedConfig.js");

// Include defaults required for webpack here. Add defaults for the extension bundle to EnvironmentPlugin
const defaults = {
  DEV_NOTIFY: "true",
  DEV_SLIM: "false",
  CHROME_EXTENSION_ID: "mpjjildhmpddojocokjkgmlkkkfjnepo",
  ROLLBAR_PUBLIC_PATH: "extension://dynamichost",

  // PixieBrix URL to enable connection to for credential exchange
  SERVICE_URL: "https://app.pixiebrix.com",
};

dotenv.config({
  path: process.env.ENV_FILE ?? ".env",
});

for (const [env, defaultValue] of Object.entries(defaults)) {
  if (isEmpty(process.env[env])) {
    process.env[env] = defaultValue;
  }
}

console.log("SOURCE_VERSION:", process.env.SOURCE_VERSION);
console.log("SERVICE_URL:", process.env.SERVICE_URL);
console.log("CHROME_EXTENSION_ID:", process.env.CHROME_EXTENSION_ID);

if (!process.env.SOURCE_VERSION) {
  process.env.SOURCE_VERSION = require("child_process")
    .execSync("git rev-parse --short HEAD")
    .toString()
    .trim();
}

function rollbarPlugins() {
  console.log(
    "ROLLBAR_BROWSER_ACCESS_TOKEN:",
    process.env.ROLLBAR_BROWSER_ACCESS_TOKEN
  );
  if (
    process.env.ROLLBAR_POST_SERVER_ITEM_TOKEN &&
    process.env.ROLLBAR_BROWSER_ACCESS_TOKEN &&
    process.env.ROLLBAR_BROWSER_ACCESS_TOKEN !== "undefined"
  ) {
    return [
      new RollbarSourceMapPlugin({
        accessToken: process.env.ROLLBAR_POST_SERVER_ITEM_TOKEN,
        // https://stackoverflow.com/a/43661131
        version: process.env.SOURCE_VERSION,
        publicPath: process.env.ROLLBAR_PUBLIC_PATH,
      }),
    ];
  }

  console.warn("ROLLBAR_POST_SERVER_ITEM_TOKEN not configured");
  return [];
}

function getVersion() {
  // `manifest.json` only supports numbers in the version, so use the semver
  const match = /^(?<version>\d+\.\d+\.\d+)/.exec(
    process.env.npm_package_version
  );
  return match.groups.version;
}

function getVersionName(isProduction) {
  if (process.env.ENVIRONMENT === "staging") {
    // Staging builds (i.e., from CI) are production builds, so check ENVIRONMENT first
    return `${getVersion()}-alpha+${process.env.SOURCE_VERSION}`;
  }

  if (isProduction) {
    return process.env.npm_package_version;
  }

  return `${process.env.npm_package_version}-local+${new Date().toISOString()}`;
}

function getConditionalPlugins(isProduction) {
  if (isProduction) {
    return [
      new BundleAnalyzerPlugin({
        analyzerMode: "static",
        reportFilename: path.resolve("report.html"),
      }),
      ...rollbarPlugins(),
    ];
  }

  if (process.env.DEV_NOTIFY === "false") {
    return [];
  }

  // Only notifies when watching. `zsh-notify` is suggested for the `build` script
  return [
    new WebpackBuildNotifierPlugin({
      title: "PB Extension",
      showDuration: true,
    }),
  ];
}

const isProd = (options) => options.mode === "production";

function customizeManifest(manifest, isProduction) {
  manifest.version = getVersion();
  manifest.version_name = getVersionName(isProduction);

  if (!isProduction) {
    manifest.name = "PixieBrix - Development";
  }

  if (process.env.CHROME_MANIFEST_KEY) {
    manifest.key = process.env.CHROME_MANIFEST_KEY;
  }

  const internal = isProduction
    ? []
    : // The port is part of the origin: https://developer.mozilla.org/en-US/docs/Web/API/URL/origin
      [
        "http://127.0.0.1:8000/*",
        "http://127.0.0.1/*",
        "http://localhost/*",
        "http://localhost:8000/*",
      ];

  const policy = new Policy(manifest.content_security_policy);

  policy.add("connect-src", process.env.SERVICE_URL);
  if (!isProduction) {
    policy.add("connect-src", "ws://localhost:9090/ http://127.0.0.1:8000");
  }

  if (!isProduction) {
    // React Dev Tools app. See https://github.com/pixiebrix/pixiebrix-extension/wiki/Local-build-setup#stand-alone
    policy.add("script-src", "http://localhost:8097");
    policy.add("connect-src", "ws://localhost:8097/");
  }

  manifest.content_security_policy = policy.toString();

  if (process.env.EXTERNALLY_CONNECTABLE) {
    manifest.externally_connectable.matches = uniq([
      ...manifest.externally_connectable.matches,
      ...process.env.EXTERNALLY_CONNECTABLE.split(","),
    ]);
  }

  manifest.content_scripts[0].matches = uniq([
    new URL("*", process.env.SERVICE_URL).href,
    ...manifest.content_scripts[0].matches,
    ...internal,
  ]);

  manifest.externally_connectable.matches = uniq([
    ...manifest.externally_connectable.matches,
    ...internal,
  ]);

  if (process.env.GOOGLE_OAUTH_CLIENT_ID) {
    manifest.oauth2 = {
      client_id: process.env.GOOGLE_OAUTH_CLIENT_ID,
      // Don't ask for any scopes up front, instead ask when they're required, e.g., when the user
      // installs a brick for google sheets
      scopes: [""],
    };
  }
}

function mockHeavyDependencies() {
  if (process.env.DEV_SLIM.toLowerCase() === "true") {
    console.warn(
      "Mocking dependencies for development build: @/icons/list, uipath/robot"
    );
    return {
      "@/icons/list": path.resolve("src/__mocks__/iconsListMock"),
      "@uipath/robot": path.resolve("src/__mocks__/robotMock"),
    };
  }
}

module.exports = (env, options) =>
  mergeWithShared({
    node: {
      global: true,
    },

    // https://stackoverflow.com/a/57460886/402560
    devtool: isProd(options) ? "nosources-source-map" : "inline-source-map",

    // https://webpack.js.org/configuration/watch/#saving-in-webstorm
    watchOptions: {
      ignored: /node_modules/,
    },

    output: {
      path: path.resolve("dist"),
      globalObject: "window",
      chunkFilename: "bundles/[name].bundle.js",
    },
    entry: {
      // All of these entries require the `vendors.js` file to be included first
      ...Object.fromEntries(
        [
          "background",
          "contentScript",
          "devtools",
          "devtoolsPanel",
          "frame",
          "options",
          "support",
          "action",
          "permissionsPopup",
        ].map((name) => [
          name,
          { import: `./src/${name}`, dependOn: "vendors" },
        ])
      ),

      // This creates a `vendors.js` file that must be included together with the bundles generated above
      vendors: [
        "react",
        "react-dom",
        "webextension-polyfill",
        "jquery",
        "lodash-es",
        "js-beautify",
        "css-selector-generator",
        "@fortawesome/free-solid-svg-icons",
      ],
      // The script that gets injected into the host page should not have a vendor chunk
      script: "./src/script",
    },

    resolve: {
      alias: {
        ...mockHeavyDependencies(),

        // Enables static analysis and removal of dead code
        "webext-detect-page": path.resolve("src/__mocks__/webextDetectPage"),
      },
    },

    optimization: {
      // Chrome bug https://bugs.chromium.org/p/chromium/issues/detail?id=1108199
      splitChunks: {
        automaticNameDelimiter: "-",
        cacheGroups: {
          vendors: false,
        },
      },

      minimizer: [
        new TerserJSPlugin({
          terserOptions: {
            output: { ascii_only: true },
          },
        }),
        new CssMinimizerPlugin(),
      ],
    },

    performance: {
      maxEntrypointSize: 5_120_000,
      maxAssetSize: 5_120_000,
    },
    plugins: [
      ...getConditionalPlugins(isProd(options)),

      new NodePolyfillPlugin(),
      new WebExtensionTarget(),
      new webpack.ProvidePlugin({
        $: "jquery",
        jQuery: "jquery",
      }),

      // This will inject the current ENVs into the bundle, if found
      new webpack.EnvironmentPlugin({
        // If not found, these values will be used as defaults
        DEBUG: !isProd(options),
        REDUX_DEV_TOOLS: !isProd(options),
        NPM_PACKAGE_VERSION: process.env.npm_package_version,
        ENVIRONMENT: process.env.ENVIRONMENT ?? options.mode,

        // If not found, "undefined" will cause the build to fail
        SERVICE_URL: undefined,
        SOURCE_VERSION: undefined,
        CHROME_EXTENSION_ID: undefined,
        ROLLBAR_PUBLIC_PATH: undefined,

        // If not found, "null" will leave the ENV unset in the bundle
        ROLLBAR_BROWSER_ACCESS_TOKEN: null,
        SUPPORT_WIDGET_ID: null,
        GOOGLE_API_KEY: null,
        GOOGLE_APP_ID: null,
      }),

      new MiniCssExtractPlugin({
        chunkFilename: "css/[id].css",
      }),
      new CopyPlugin({
        patterns: [
          {
            from: "src/manifest.json",
            transform: (jsonString) => {
              const manifest = JSON.parse(jsonString);
              customizeManifest(manifest, isProd(options));
              return JSON.stringify(manifest, null, 4);
            },
          },
          {
            from: "*.{css,html}",
            context: "src",
          },
          "static",
        ],
      }),
    ],
    module: {
      rules: [
        {
          test: /\.s?css$/,
          use: [
            MiniCssExtractPlugin.loader,
            "css-loader",
            {
              loader: "sass-loader",
              options: {
                // Due to warnings in dart-sass https://github.com/pixiebrix/pixiebrix-extension/pull/1070
                implementation: require("node-sass"),
              },
            },
          ],
        },
      ],
    },
  });
