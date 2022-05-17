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
const webpack = require("webpack");
const NodePolyfillPlugin = require("node-polyfill-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const mergeWithShared = require("../webpack.sharedConfig.js");

const rootDir = path.resolve(__dirname, "../");

module.exports = {
  stories: ["../src/**/*.stories.@(js|jsx|ts|tsx|mdx)"],
  addons: ["@storybook/addon-links", "@storybook/addon-essentials"],
  core: {
    builder: "webpack5",
  },
  // https://storybook.js.org/docs/riot/configure/webpack#extending-storybooks-webpack-config
  webpackFinal: async (config) =>
    mergeWithShared(config, {
      resolve: {
        // Mock any modules that appear in __mocks__
        // e.g. src/__mocks__/webextension-polyfill.js
        modules: [path.resolve(rootDir, "src/__mocks__"), "node_modules"],

        alias: {
          // Mock any LOCAL modules that appear in __mocks__
          // e.g. src/__mocks__/@/telemetry/reportErrors.ts
          "@": [
            path.resolve(rootDir, "src/__mocks__/@"),
            path.resolve(rootDir, "src"),
          ],
          "webextension-polyfill": false,
        },
      },
      module: {
        rules: [
          {
            test: /\.scss$/,
            use: [
              // style-loader loads the css into the DOM
              "style-loader",
              "css-loader",
              {
                loader: "sass-loader",
                options: {
                  sourceMap: true,
                  // Due to warnings in dart-sass https://github.com/pixiebrix/pixiebrix-extension/pull/1070
                  implementation: require("node-sass"),
                },
              },
            ],
          },
        ],
      },

      plugins: [
        new NodePolyfillPlugin(),
        new webpack.ProvidePlugin({
          $: "jquery",
          jQuery: "jquery",
          browser: [
            path.resolve(rootDir, "src/__mocks__/browserMock.mjs"),
            "default",
          ],
        }),
      ],
    }),
};
