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
const rootDir = path.resolve(__dirname, "../");
const webpack = require("webpack");
const mergeWithShared = require("../webpack.shared-config.js");

module.exports = mergeWithShared({
  mode: "development",
  target: "node",
  devtool: "inline-source-map",
  entry: {
    headers: path.resolve(rootDir, "src/headers"),
  },
  output: {
    path: path.resolve(rootDir, "scripts", "bin"),
  },
  externals: {
    // https://github.com/Automattic/node-canvas/issues/1314#issuecomment-443068600
    canvas: "commonjs canvas",
    // https://github.com/yan-foto/electron-reload/issues/71#issuecomment-588988382
    fsevents: "require('fsevents')",
  },
  resolve: {
    alias: {
      "@/icons/svgIcons": path.resolve("src/__mocks__/iconsMock"),
      "@uipath/robot": path.resolve("src/__mocks__/robotMock"),
    },
  },
  plugins: [
    // Fixes warning:
    //  WARNING in ./node_modules/nunjucks/src/node-loaders.js 155:17-38
    //  Critical dependency: the request of a dependency is an expression
    new webpack.IgnorePlugin({
      resourceRegExp: /loaders/,
      contextRegExp: /nunjucks/,
    }),
    new webpack.ProvidePlugin({
      window: "global/window.js",
      document: "global/document.js",
    }),
    new webpack.EnvironmentPlugin({
      NPM_PACKAGE_VERSION: process.env.npm_package_version,
    }),
    new webpack.DefinePlugin({
      chrome: {
        runtime: {
          id: 42,
        },
      },
    }),
  ],
});
