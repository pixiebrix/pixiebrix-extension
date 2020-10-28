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
const merge = require("webpack-merge");
const common = require("./webpack.config.js");
const ExtensionReloader = require("webpack-extension-reloader");
const webpack = require("webpack");
const dotenv = require("dotenv");
const CopyPlugin = require("copy-webpack-plugin");

const chromeRoot = path.resolve(__dirname, "../");

dotenv.config({
  path: path.resolve(chromeRoot, ".env.development"),
});

if (!process.env.SOURCE_VERSION) {
  process.env.SOURCE_VERSION = require("child_process")
    .execSync("git rev-parse --short HEAD")
    .toString();
}

module.exports = merge.strategy({ plugins: "prepend" })(common, {
  mode: "development",
  devtool: "inline-source-map",
  // https://webpack.js.org/configuration/watch/
  // https://webpack.js.org/configuration/watch/#saving-in-webstorm
  watchOptions: {
    ignored: /node_modules/,
  },
  output: {
    filename: "[name].js",
    chunkFilename: "[name].bundle.js",
  },
  plugins: [
    new webpack.EnvironmentPlugin({
      NODE_ENV: "development", // use 'development' unless process.env.NODE_ENV is defined
      DEBUG: true,
    }),
    new CopyPlugin({
      patterns: [
        {
          from: path.resolve(chromeRoot, "manifests", "manifest.template.json"),
          to: "manifest.json",
          transform(content) {
            const manifest = JSON.parse(content.toString());
            manifest.version = process.env.npm_package_version;
            manifest.externally_connectable.matches.push(
              "http://127.0.0.1:8000/*",
              "http://127.0.0.1/*",
              "http://localhost/*"
            );
            if (process.env.GOOGLE_OAUTH_CLIENT_ID) {
              manifest.oauth2 = {
                client_id: process.env.GOOGLE_OAUTH_CLIENT_ID,
                // don't ask for any scopes up front, instead ask when they're required, e.g., when the user
                // installs a brick for google sheets
                scopes: [""],
              };
            }
            return JSON.stringify(manifest);
          },
        },
      ],
    }),
    new webpack.DefinePlugin({
      "process.env": {
        ROLLBAR_PUBLIC_PATH: JSON.stringify("https://dynamichost/static"),
        ROLLBAR_ACCESS_TOKEN: JSON.stringify(
          process.env.ROLLBAR_CHROME_ACCESS_TOKEN
        ),
        CHROME_EXTENSION_ID: JSON.stringify(process.env.CHROME_EXTENSION_ID),
        GOOGLE_API_KEY: JSON.stringify(process.env.GOOGLE_API_KEY),
        SERVICE_URL: JSON.stringify(
          process.env.SERVICE_URL ?? "http://127.0.0.1:8000"
        ),
        SOURCE_VERSION: JSON.stringify(process.env.SOURCE_VERSION),
        NPM_PACKAGE_VERSION: JSON.stringify(process.env.npm_package_version),
      },
    }),
    new ExtensionReloader({
      entries: {
        // The entries used for the content/background scripts or extension pages
        contentScript: "contentScript",
        background: "background",
        options: "options",
      },
    }),
  ],
  optimization: {
    minimize: false,
  },
});
