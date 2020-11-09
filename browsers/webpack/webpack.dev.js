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
const ExtensionReloader = require("webpack-extension-reloader");
const webpack = require("webpack");

const devConfig = {
  mode: "development",
  // https://stackoverflow.com/a/57460886/402560
  devtool: "inline-source-map",
  devServer: {
    writeToDisk: true,
  },
  // https://webpack.js.org/configuration/watch/
  // https://webpack.js.org/configuration/watch/#saving-in-webstorm
  watchOptions: {
    ignored: /node_modules/,
  },
  plugins: [
    new webpack.EnvironmentPlugin({
      NODE_ENV: "development", // use 'development' unless process.env.NODE_ENV is defined
      ENVIRONMENT: "development",
      DEBUG: true,
    }),
    new webpack.DefinePlugin({
      "process.env": {
        SERVICE_URL: JSON.stringify(
          process.env.SERVICE_URL ?? "http://127.0.0.1:8000"
        ),
      },
    }),
    // https://github.com/rubenspgcavalcante/webpack-extension-reloader#using-as-a-plugin
    new ExtensionReloader({
      reloadPage: false,
      entries: {
        contentScript: "contentScript",
        background: "background",
        options: "options",
      },
    }),
  ],
  optimization: {
    minimize: false,
    splitChunks: {
      cacheGroups: {
        vendors: false,
      },
    },
  },
};

module.exports = mergeWithCustomize({
  customizeArray: customizeArray({
    plugins: "prepend",
  }),
})(common, devConfig);
