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

const { merge } = require("lodash");
const path = require("path");
const rootDir = path.resolve(__dirname, "../");
const webpack = require("webpack");

const { resolve } = require("../resolve.config.js");

module.exports = {
  mode: "development",
  target: "node",
  devtool: "eval",
  context: rootDir,
  entry: {
    headers: path.resolve(rootDir, "src/headers"),
  },
  output: {
    filename: "[name].js",
    path: path.resolve(rootDir, "scripts", "bin"),
  },
  externals: {
    // https://github.com/Automattic/node-canvas/issues/1314#issuecomment-443068600
    canvas: "commonjs canvas",
    // https://github.com/yan-foto/electron-reload/issues/71#issuecomment-588988382
    fsevents: "require('fsevents')",
  },
  resolve: merge(resolve, {
    alias: {
      "@uipath/robot": path.resolve(rootDir, "src/__mocks__/robotMock"),
    },
    fallback: {
      chokidar: false,
    },
  }),
  plugins: [
    new webpack.ProvidePlugin({
      window: "global/window.js",
      document: "global/document.js",
    }),
    new webpack.DefinePlugin({
      "process.env": {
        NPM_PACKAGE_VERSION: JSON.stringify(process.env.npm_package_version),
      },
      chrome: {
        runtime: {
          id: 42,
        },
      },
    }),
  ],
  module: {
    rules: [
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
        exclude: /(bootstrap-icons|simple-icons)/,
        type: "asset/resource",
        generator: {
          filename: "img/[name][ext]",
        },
      },
      {
        test: /(bootstrap-icons|simple-icons).*\.svg$/,
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
    ],
  },
};
