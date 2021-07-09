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

const rootDir = path.resolve(__dirname, "../");

// Include defaults required for webpack here. Add defaults for the extension bundle to EnvironmentPlugin
const defaults = {
  DEV_NOTIFY: "true",
  CHROME_EXTENSION_ID: "mpjjildhmpddojocokjkgmlkkkfjnepo",
  ROLLBAR_PUBLIC_PATH: "extension://dynamichost",

  // PixieBrix URL to enable connection to for credential exchange
  SERVICE_URL: "https://app.pixiebrix.com",
};

dotenv.config({
  path: path.resolve(__dirname, process.env.ENV_FILE ?? ".env"),
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

const nodeConfig = {
  global: true,
};

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
  } else {
    console.warn("ROLLBAR_POST_SERVER_ITEM_TOKEN not configured");
    return [];
  }
}

function getVersionName(isProduction) {
  if (process.env.ENVIRONMENT === "staging") {
    // staging builds (i.e., from CI) are production builds, so check ENVIRONMENT first
    return `${process.env.npm_package_version}-alpha+${process.env.SOURCE_VERSION}`;
  } else if (isProduction) {
    return process.env.npm_package_version;
  } else {
    return `${
      process.env.npm_package_version
    }-local+${new Date().toISOString()}`;
  }
}

function getConditionalPlugins(isProduction) {
  if (isProduction) {
    return [
      new BundleAnalyzerPlugin({
        analyzerMode: "static",
        reportFilename: path.join(rootDir, "report.html"),
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
      title: "PixieBrix build",
      showDuration: true,
    }),
  ];
}

const isProd = (options) => options.mode === "production";

function customizeManifest(manifest, isProduction) {
  manifest.version = process.env.npm_package_version;
  manifest.version_name = getVersionName(isProduction);

  if (!isProduction) {
    manifest.name = "PixieBrix - Development";
  }

  if (process.env.CHROME_MANIFEST_KEY) {
    manifest.key = process.env.CHROME_MANIFEST_KEY;
  }
  const internal = isProduction
    ? []
    : ["http://127.0.0.1:8000/*", "http://127.0.0.1/*", "http://localhost/*"];

  const policy = new Policy(manifest.content_security_policy);

  policy.add("connect-src", process.env.SERVICE_URL);
  if (!isProduction) {
    policy.add("connect-src", "ws://localhost:9090/ http://127.0.0.1:8000");
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
      // don't ask for any scopes up front, instead ask when they're required, e.g., when the user
      // installs a brick for google sheets
      scopes: [""],
    };
  }
}

module.exports = (env, options) => ({
  context: rootDir,
  node: nodeConfig,

  // https://stackoverflow.com/a/57460886/402560
  devtool: isProd(options) ? "nosources-source-map" : "inline-source-map",

  // https://webpack.js.org/configuration/watch/#saving-in-webstorm
  watchOptions: {
    ignored: /node_modules/,
  },

  output: {
    path: path.resolve(__dirname, "dist"),
    globalObject: "window",
    chunkFilename: "bundles/[name].bundle.js",
  },
  entry: {
    background: path.resolve(rootDir, "src/background"),
    contentScript: path.resolve(rootDir, "src/contentScript"),
    devtools: path.resolve(rootDir, "src/devtools"),
    devtoolsPanel: path.resolve(rootDir, "src/devtoolsPanel"),
    // the script that gets injected into the host page
    script: path.resolve(rootDir, "src/script"),
    frame: path.resolve(rootDir, "src/frame"),
    options: path.resolve(rootDir, "src/options"),
    support: path.resolve(rootDir, "src/support"),
    action: path.resolve(rootDir, "src/action"),
  },
  resolve: {
    // Need to set these fields manually as their default values rely on `web` target.
    // See https://v4.webpack.js.org/configuration/resolve/#resolvemainfields
    mainFields: ["browser", "module", "main"],
    aliasFields: ["browser"],
    alias: {
      "@": path.resolve(rootDir, "src"),
      "@img": path.resolve(rootDir, "img"),
      "@contrib": path.resolve(rootDir, "contrib"),
      "@schemas": path.resolve(rootDir, "schemas"),
      vendors: path.resolve(rootDir, "src/vendors"),
      "@microsoft/applicationinsights-web": path.resolve(
        rootDir,
        "src/contrib/uipath/quietLogger"
      ),

      // An existence check triggers webpack’s warnings https://github.com/handlebars-lang/handlebars.js/issues/953
      handlebars: "handlebars/dist/handlebars.js",
    },
    fallback: {
      fs: false,
      crypto: false,
      console: false,
      vm: false,
      path: false,
    },
    extensions: [".ts", ".tsx", ".jsx", ".js"],
  },

  // https://github.com/webpack/webpack/issues/3017#issuecomment-285954512
  // prevent lodash from overriding window._
  amd: false,

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
    new WebExtensionTarget(nodeConfig),
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
          from: path.resolve(__dirname, "manifest.json"),
          to: "manifest.json",
          transform: (jsonString) => {
            const manifest = JSON.parse(jsonString);
            customizeManifest(manifest, isProd(options));
            return JSON.stringify(manifest, null, 4);
          },
        },
        {
          from: path.resolve(__dirname, "src"),
        },
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
          { loader: "sass-loader", options: { sourceMap: true } },
        ],
      },
      {
        test: /\.tsx?$/,
        use: [
          {
            loader: "ts-loader",
            options: {
              configFile: "tsconfig.webpack.json",
            },
          },
        ],
        exclude: /node_modules/,
      },
      {
        test: /\.(svg|png|jpg|gif)?$/,
        exclude: /(bootstrap-icons|simple-icons|custom-icons)/,
        type: "asset/resource",
        generator: {
          filename: "img/[name][ext]",
        },
      },
      {
        test: /(bootstrap-icons|simple-icons|custom-icons).*\.svg$/,
        loader: "svg-inline-loader",
      },
      {
        test: /\.(woff(2)?|ttf|eot)(\?v=\d+\.\d+\.\d+)?$/,
        exclude: /(bootstrap-icons|simple-icons)/,
        type: "asset/resource",
        generator: {
          filename: "fonts/[name][ext]",
        },
      },
      {
        test: /\.ya?ml$/,
        type: "json", // Required by Webpack v4
        use: "yaml-loader",
      },
      {
        test: /\.txt/,
        type: "asset/source",
      },
    ],
  },
});
