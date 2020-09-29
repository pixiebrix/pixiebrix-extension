const path = require("path");
const merge = require("webpack-merge");
const common = require("./webpack.config.js");
const ExtensionReloader = require("webpack-extension-reloader");
const webpack = require("webpack");
const dotenv = require("dotenv");
const CopyPlugin = require("copy-webpack-plugin");

const chromeRoot = path.resolve(__dirname, "../");

dotenv.config({
  path: path.resolve(chromeRoot, ".env.development"),
});

module.exports = merge.strategy({ plugins: "prepend" })(common, {
  mode: "development",
  devtool: "inline-source-map",
  // https://webpack.js.org/configuration/watch/
  // https://webpack.js.org/configuration/watch/#saving-in-webstorm
  watchOptions: {
    ignored: /node_modules/,
  },
  output: {
    filename: "[name].js",
    chunkFilename: "[name].bundle.js",
  },
  plugins: [
    new webpack.EnvironmentPlugin({
      NODE_ENV: "development", // use 'development' unless process.env.NODE_ENV is defined
      DEBUG: true,
    }),
    new CopyPlugin({
      patterns: [
        {
          from: path.resolve(chromeRoot, "manifests", "manifest.dev.json"),
          to: "manifest.json",
        },
      ],
    }),
    new webpack.DefinePlugin({
      "process.env": {
        ROLLBAR_PUBLIC_PATH: JSON.stringify("https://dynamichost/static"),
        ROLLBAR_ACCESS_TOKEN: JSON.stringify(
          process.env.ROLLBAR_CHROME_ACCESS_TOKEN
        ),
        MIXPANEL_BROWSER_TOKEN: JSON.stringify(
          process.env.MIXPANEL_BROWSER_TOKEN
        ),
        GOOGLE_API_KEY: JSON.stringify(process.env.GOOGLE_API_KEY),
        SERVICE_URL: JSON.stringify("http://127.0.0.1:8000"),
      },
    }),
    new ExtensionReloader({
      entries: {
        // The entries used for the content/background scripts or extension pages
        contentScript: "contentScript",
        background: "background",
        options: "options",
      },
    }),
  ],
  optimization: {
    minimize: false,
  },
});
