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

const { mergeWithCustomize, customizeArray } = require("webpack-merge");
const common = require("./webpack.base.js");
const TerserJSPlugin = require("terser-webpack-plugin");
const OptimizeCSSAssetsPlugin = require("optimize-css-assets-webpack-plugin");
const RollbarSourceMapPlugin = require("rollbar-sourcemap-webpack-plugin");
const webpack = require("webpack");

function rollbarPlugins() {
  console.log(
    "ROLLBAR_CHROME_ACCESS_TOKEN: ",
    process.env.ROLLBAR_CHROME_ACCESS_TOKEN
  );
  if (
    process.env.ROLLBAR_POST_SERVER_ITEM_TOKEN &&
    process.env.ROLLBAR_CHROME_ACCESS_TOKEN &&
    process.env.ROLLBAR_CHROME_ACCESS_TOKEN !== "undefined"
  ) {
    return [
      new RollbarSourceMapPlugin({
        accessToken: process.env.ROLLBAR_POST_SERVER_ITEM_TOKEN,
        // https://stackoverflow.com/a/43661131
        version: process.env.SOURCE_VERSION,
        publicPath: "chrome-extension://dynamichost/",
      }),
    ];
  } else {
    console.warn("ROLLBAR_POST_SERVER_ITEM_TOKEN not configured");
    return [];
  }
}

module.exports = () => {
  console.log("SOURCE_VERSION: ", process.env.SOURCE_VERSION);
  console.log("SERVICE_URL: ", process.env.SERVICE_URL);

  return mergeWithCustomize({
    customizeArray: customizeArray({
      plugins: "prepend",
    }),
  })(common, {
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
      ...rollbarPlugins(),
      new webpack.EnvironmentPlugin({
        // use 'production' unless process.env.NODE_ENV is defined
        NODE_ENV: "production",
        DEBUG: false,
      }),
    ],
  });
};
