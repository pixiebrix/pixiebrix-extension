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

const fs = require("fs");
const path = require("path");
const JSON5 = require("json5");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const { mergeWithCustomize, customizeObject } = require("webpack-merge");

const merge = mergeWithCustomize({
  // Webpack resolves aliases in order, so the mocks need to be first
  customizeObject: customizeObject({
    "resolve.alias": "prepend",
  }),
});

const tsconfig = JSON5.parse(fs.readFileSync("./tsconfig.json", "utf8"));

/** @type import("webpack").Configuration */
const shared = {
  stats: {
    preset: "errors-warnings",
    entrypoints: process.argv.includes("production"),
    timings: true,
  },
  watchOptions: {
    aggregateTimeout: 200,
  },
  resolve: {
    alias: {
      // An existence check triggers webpack’s warnings https://github.com/handlebars-lang/handlebars.js/issues/953
      handlebars: "handlebars/dist/handlebars.js",

      // https://github.com/webpack/webpack/pull/12693#issuecomment-914079083
      filenamify: "filenamify/browser",
    },
    extensions: [".ts", ".tsx", ".jsx", ".js"],
    fallback: {
      fs: false,
      crypto: false,
      console: false,
      vm: false,
      path: false,
      chokidar: false,
    },
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        loader: "ts-loader",
        exclude: /node_modules/,
        options: {
          transpileOnly: true,
        },
      },
      {
        test: /\.s?css$/,
        resourceQuery: { not: [/loadAsUrl/] },
        use: [
          MiniCssExtractPlugin.loader,
          "css-loader",
          {
            loader: "sass-loader",
            options: {
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
      },
      {
        test: /\.(svg|png|jpe?g|gif)?$/,
        resourceQuery: { not: [/loadAsComponent/] },
        exclude: /(bootstrap-icons|simple-icons|custom-icons)/,
        type: "asset/resource",
        generator: {
          filename: "img/[name][ext]",
        },
      },
      {
        test: /bootstrap-icons\/.*\.svg$/,
        type: "asset/resource",
        generator: {
          filename: "user-icons/bootstrap-icons/[name][ext]",
        },
      },
      {
        test: /simple-icons\/.*\.svg$/,
        type: "asset/resource",
        generator: {
          filename: "user-icons/simple-icons/[name][ext]",
        },
      },
      {
        test: /custom-icons\/.*\.svg$/,
        type: "asset/resource",
        generator: {
          filename: "user-icons/custom-icons/[name][ext]",
        },
      },
      {
        test: /\.ya?ml$/,
        use: "yaml-loader",
      },
      {
        test: /\.txt/,
        type: "asset/source",
      },
      {
        resourceQuery: /loadAsUrl/,
        type: "asset/resource",
        generator: {
          filename: "css/[name][ext]",
        },
      },
    ],
  },
};
// Convert tsconfig paths to webpack aliases
for (const [from, [to]] of Object.entries(tsconfig.compilerOptions.paths)) {
  shared.resolve.alias[from.replace("/*", "")] = path.resolve(
    to.replace("/*", "")
  );
}

/**
 * @param {import("webpack").Configuration} baseConfig
 */
module.exports = (baseConfig) => merge(shared, baseConfig);
