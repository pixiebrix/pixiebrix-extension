/*
 * Copyright (C) 2020 Pixie Brix, LLC
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

const path = require("path");
const webpack = require("webpack");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const WebExtensionTarget = require("webpack-target-webextension");

const rootDir = path.resolve(__dirname, "../../");

const dotenv = require("dotenv");

dotenv.config({
  path: path.resolve(rootDir, "browsers", process.env.ENV_FILE ?? ".env"),
});

if (!process.env.SOURCE_VERSION) {
  process.env.SOURCE_VERSION = require("child_process")
    .execSync("git rev-parse --short HEAD")
    .toString()
    .trim();
}

// https://github.com/TypeStrong/ts-loader/blob/master/examples/react-babel-karma-gulp/webpack.config.base.js#L10
const babelLoader = {
  loader: "babel-loader",
  options: {
    presets: [
      "@babel/preset-env",
      "@babel/preset-react",
      "@babel/preset-typescript",
    ],
    plugins: ["@babel/plugin-proposal-class-properties"],
  },
};

const nodeConfig = {
  global: true,
  process: true,
  Buffer: true,
  console: true,
  fs: "empty",
};

module.exports = {
  context: rootDir,
  node: nodeConfig,
  target: WebExtensionTarget(nodeConfig),
  output: {
    // https://github.com/crimx/webpack-target-webextension#usage
    globalObject: "window",
    filename: "[name].js",
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
    },
    extensions: [".ts", ".tsx", ".jsx", ".js"],
  },
  optimization: {
    // Chrome bug https://bugs.chromium.org/p/chromium/issues/detail?id=1108199
    splitChunks: { automaticNameDelimiter: "-" },
  },
  plugins: [
    // https://webpack.js.org/plugins/provide-plugin/
    new webpack.ProvidePlugin({
      $: "jquery",
      jQuery: "jquery",
    }),
    new webpack.DefinePlugin({
      "process.env": {
        ROLLBAR_BROWSER_ACCESS_TOKEN: JSON.stringify(
          process.env.ROLLBAR_BROWSER_ACCESS_TOKEN
        ),
        SERVICE_URL: JSON.stringify(process.env.SERVICE_URL),
        SOURCE_VERSION: JSON.stringify(process.env.SOURCE_VERSION),
        NPM_PACKAGE_VERSION: JSON.stringify(process.env.npm_package_version),
        NODE_ENV: JSON.stringify(process.env.NODE_ENV),
        ENVIRONMENT: JSON.stringify(process.env.ENVIRONMENT),
        SUPPORT_WIDGET_ID: JSON.stringify(process.env.SUPPORT_WIDGET_ID),
      },
    }),
    new MiniCssExtractPlugin({
      filename: "[name].css",
      chunkFilename: "bundles/[name].bundle.css",
    }),
  ],
  module: {
    rules: [
      // https://github.com/webpack/webpack/issues/3017#issuecomment-285954512
      // prevent lodash from overriding window._
      {
        exclude: /(notifyjs-browser|vendors\/notify)/,
        parser: { amd: false },
      },
      {
        test: /\.s?css$/,
        use: [
          {
            loader: MiniCssExtractPlugin.loader,
            options: {
              // you can specify a publicPath here
              // by default it uses publicPath in webpackOptions.output
              publicPath: "../",
            },
          },
          "css-loader",
          { loader: "sass-loader", options: { sourceMap: true } },
        ],
      },
      {
        test: /\.tsx?$/,
        use: [
          babelLoader,
          { loader: "ts-loader?configFile=tsconfig.webpack.json" },
        ],
        exclude: /(node_modules|bower_components)/,
      },
      {
        test: /\.m?js$/,
        exclude: /(node_modules|bower_components)/,
        use: [babelLoader],
      },
      {
        test: /\.(svg|png|jpg|gif)?$/,
        exclude: /(bootstrap-icons|simple-icons|custom-icons)/,
        use: [
          {
            loader: "file-loader",
            options: {
              emitFile: true,
              outputPath: "img",
            },
          },
        ],
      },
      {
        test: /(bootstrap-icons|simple-icons|custom-icons).*\.svg$/,
        loader: "svg-inline-loader",
      },
      {
        test: /\.(woff(2)?|ttf|eot)(\?v=\d+\.\d+\.\d+)?$/,
        exclude: /(bootstrap-icons|simple-icons)/,
        use: [
          {
            loader: "file-loader",
            options: {
              name: "[name].[ext]",
              outputPath: "fonts/",
              publicPath: "fonts/",
            },
          },
        ],
      },
      {
        test: /\.ya?ml$/,
        type: "json", // Required by Webpack v4
        use: "yaml-loader",
      },
    ],
  },
};
