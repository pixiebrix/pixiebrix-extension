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

const rootDir = path.resolve(__dirname, "../");

module.exports = {
  stories: ["../src/**/*.stories.mdx", "../src/**/*.stories.@(js|jsx|ts|tsx)"],
  addons: ["@storybook/addon-links", "@storybook/addon-essentials"],
  core: {
    builder: "webpack5",
  },
  webpackFinal: async (config, { configType }) => {
    // https://storybook.js.org/docs/riot/configure/webpack#extending-storybooks-webpack-config

    config.resolve.fallback = {
      fs: false,
    };
    config.resolve.alias = {
      "@": path.resolve(rootDir, "src"),
      "@img": path.resolve(rootDir, "img"),
      "@contrib": path.resolve(rootDir, "contrib"),
      "@schemas": path.resolve(rootDir, "schemas"),
      "webextension-polyfill": false,
    };

    const fileLoaderRule = config.module.rules.find(
      (rule) => rule.test && rule.test.test(".svg")
    );
    fileLoaderRule.resourceQuery = { not: [/loadAsComponent/] };

    config.module.rules.push(
      {
        test: /\.ya?ml$/,
        resourceQuery: { not: [/loadAsText/] },
        type: "json",
        use: "yaml-loader",
      },
      {
        test: /\.ya?ml$/,
        resourceQuery: /loadAsText/,
        use: "raw-loader",
      },
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
      {
        test: /\.svg$/,
        resourceQuery: /loadAsComponent/,
        use: [
          {
            loader: "@svgr/webpack",
            options: {
              typescript: true,
              ext: "tsx",
            },
          },
        ],
      }
    );

    config.plugins.push(
      ...[
        new NodePolyfillPlugin(),
        new webpack.ProvidePlugin({
          $: "jquery",
          jQuery: "jquery",
        }),
      ]
    );

    return config;
  },
};
