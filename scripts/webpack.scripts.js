/*
 * Copyright (C) 2022 PixieBrix, Inc.
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
const rootDir = path.resolve(__dirname, "../");
const webpack = require("webpack");
const mergeWithShared = require("../webpack.sharedConfig.js");

module.exports = mergeWithShared({
  mode: "development",
  target: "node",
  devtool: "nosources-source-map",
  entry: {
    headers: path.resolve(rootDir, "src/development/headers"),
  },
  output: {
    path: path.resolve(rootDir, "scripts", "bin"),
  },
  externals: {
    // Exclude some troublesome/unnecessary dependencies
    "webextension-polyfill": "{}",
    rollbar: "{init(){}}",
  },
  resolve: {
    alias: {
      "@/icons/list": path.resolve("src/__mocks__/@/icons/list"),
      "@uipath/robot": path.resolve("src/__mocks__/@uipath/robot"),
      "@/telemetry/reportError": path.resolve("src/__mocks__/reportError"),
    },
  },
  plugins: [
    // Fixes warning:
    //  WARNING in ./node_modules/nunjucks/src/node-loaders.js 155:17-38
    //  Critical dependency: the request of a dependency is an expression
    new webpack.IgnorePlugin({
      resourceRegExp: /node-loaders/,
      contextRegExp: /nunjucks/,
    }),
    new webpack.ProvidePlugin({
      document: "min-document",
    }),
    new webpack.EnvironmentPlugin({
      NPM_PACKAGE_VERSION: process.env.npm_package_version,
    }),
    new webpack.DefinePlugin({
      "window.CSSStyleSheet": "{}",
      window: "globalThis.window",
      document: "globalThis.document",
      browser: "({})",
      self: "globalThis.self",
    }),
    // Don't fail on import of styles.
    // Using an identity object instead of actual style sheet because styles are not needed for headers generations
    new webpack.NormalModuleReplacementPlugin(
      /\.module\.(css|scss)$/,
      "identity-obj-proxy"
    ),
  ],
});
