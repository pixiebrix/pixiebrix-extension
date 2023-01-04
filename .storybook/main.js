/*
 * Copyright (C) 2023 PixieBrix, Inc.
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
const mergeWithShared = require("../webpack.sharedConfig.js");

const rootDir = path.resolve(__dirname, "../");

module.exports = {
  stories: ["../src/**/*.stories.@(js|jsx|ts|tsx|mdx)"],
  addons: ["@storybook/addon-links", "@storybook/addon-essentials"],
  core: {
    builder: "webpack5",
  },
  features: {
    // Not currently compatible with Storyshots: https://github.com/storybookjs/storybook/issues/18994
    // Enable for Storybook since it has significant performance benefits
    storyStoreV7: process.env.NODE_ENV !== "test",
  },
  // https://storybook.js.org/docs/react/builders/webpack#extending-storybooks-webpack-config
  webpackFinal: async (config) => {
    const mergedConfig = mergeWithShared(config, {
      resolve: {
        // Mock any modules that appear in __mocks__
        // e.g. src/__mocks__/webextension-polyfill.js
        // https://webpack.js.org/configuration/resolve/#resolvemodules
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
                  sassOptions: {
                    // Due to warnings in dart-sass https://github.com/pixiebrix/pixiebrix-extension/pull/1070
                    quietDeps: true,
                  },
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
    });

    mergedConfig.resolve.alias = {
      // For some reason, during the merge this alias gets placed toward the bottom of the object keys
      // so wasn't taking effect vs. the "@" alias
      "@/services/apiClient": path.resolve(rootDir, "__mocks__/apiClient.mjs"),
      ...mergedConfig.resolve.alias,
    };

    // Storybook has a default rule that matches all static resources, so we need to block that
    // to avoid conflicts that appear at runtime.
    // https://stackoverflow.com/a/61706308/288906
    // https://github.com/pixiebrix/pixiebrix-extension/pull/3410#issuecomment-1130414970
    const fileLoaderRule = config.module.rules.find(
      (rule) => rule.test && rule.test.test(".apng")
    );
    fileLoaderRule.resourceQuery = { not: [/loadAsComponent/] };

    return mergedConfig;
  },
};
