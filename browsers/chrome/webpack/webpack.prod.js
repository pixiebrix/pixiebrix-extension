const path = require("path");
const merge = require("webpack-merge");
const common = require("./webpack.config.js");
const TerserJSPlugin = require("terser-webpack-plugin");
const OptimizeCSSAssetsPlugin = require("optimize-css-assets-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const RollbarSourceMapPlugin = require("rollbar-sourcemap-webpack-plugin");
const webpack = require("webpack");
const dotenv = require("dotenv");
const CopyPlugin = require("copy-webpack-plugin");

const chromeRoot = path.resolve(__dirname, "../");

dotenv.config({
  path: path.resolve(chromeRoot, ".env"),
});

if (!process.env.SOURCE_VERSION) {
  process.env.SOURCE_VERSION = require("child_process")
    .execSync("git rev-parse --short HEAD")
    .toString();
}

module.exports = () => {
  console.log(
    "ROLLBAR_CHROME_ACCESS_TOKEN: ",
    process.env.ROLLBAR_CHROME_ACCESS_TOKEN
  );
  console.log("SOURCE_VERSION: ", process.env.SOURCE_VERSION);
  console.log("SERVICE_URL: ", process.env.SERVICE_URL);
  console.log("CHROME_EXTENSION_ID", process.env.CHROME_EXTENSION_ID);

  let rollbarPlugin = [];

  if (
    process.env.ROLLBAR_POST_SERVER_ITEM_TOKEN &&
    process.env.ROLLBAR_CHROME_ACCESS_TOKEN &&
    process.env.ROLLBAR_CHROME_ACCESS_TOKEN !== "undefined"
  ) {
    rollbarPlugin = [
      new RollbarSourceMapPlugin({
        accessToken: process.env.ROLLBAR_POST_SERVER_ITEM_TOKEN,
        // https://stackoverflow.com/a/43661131
        version: process.env.SOURCE_VERSION,
        publicPath: "chrome-extension://dynamichost/",
      }),
    ];
  } else {
    console.warn("ROLLBAR_POST_SERVER_ITEM_TOKEN not configured");
  }

  return merge.strategy({ plugins: "prepend" })(common, {
    mode: "production",
    devtool: "nosources-source-map",
    optimization: {
      minimizer: [
        new TerserJSPlugin({
          terserOptions: {
            output: { ascii_only: true },
          },
        }),
        new OptimizeCSSAssetsPlugin({}),
      ],
    },
    output: {
      filename: "[name].js",
      chunkFilename: "[name].bundle.js",
    },
    plugins: [
      ...rollbarPlugin,
      new webpack.EnvironmentPlugin({
        NODE_ENV: "production", // use 'production' unless process.env.NODE_ENV is defined
        DEBUG: false,
      }),
      new CopyPlugin({
        patterns: [
          {
            from: path.resolve(
              chromeRoot,
              "manifests",
              process.env.NODE_ENV === "staging"
                ? "manifest.stg.json"
                : "manifest.prod.json"
            ),
            to: "manifest.json",
            transform(content) {
              return content
                .toString()
                .replace(
                  "__NPM_PACKAGE_VERSION__",
                  process.env.npm_package_version
                );
            },
          },
        ],
      }),
      new webpack.DefinePlugin({
        "process.env": {
          ROLLBAR_PUBLIC_PATH: JSON.stringify(
            "chrome-extension://dynamichost/"
          ),
          SOURCE_VERSION: JSON.stringify(process.env.SOURCE_VERSION),
          ROLLBAR_ACCESS_TOKEN: JSON.stringify(
            process.env.ROLLBAR_CHROME_ACCESS_TOKEN
          ),
          MIXPANEL_BROWSER_TOKEN: JSON.stringify(
            process.env.MIXPANEL_BROWSER_TOKEN
          ),
          GOOGLE_API_KEY: JSON.stringify(process.env.GOOGLE_API_KEY),
          SERVICE_URL: JSON.stringify(process.env.SERVICE_URL),
          CHROME_EXTENSION_ID: JSON.stringify(process.env.CHROME_EXTENSION_ID),
        },
      }),
      new MiniCssExtractPlugin({
        path: path.resolve(chromeRoot, "bundles", "css"),
        filename: "css/[name].css",
        chunkFilename: "css/[id].css",
        ignoreOrder: false, // Enable to remove warnings about conflicting order
      }),
    ],
  });
};
