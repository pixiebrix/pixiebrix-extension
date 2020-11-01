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
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const { mergeWithCustomize, customizeArray } = require("webpack-merge");
const commonFactory = require("../../webpack/webpack.prod.js");
const CopyPlugin = require("copy-webpack-plugin");
const { uniq } = require("lodash");

const firefoxRoot = path.resolve(__dirname, "../");

module.exports = () =>
  mergeWithCustomize({
    customizeArray: customizeArray({
      plugins: "prepend",
    }),
  })(commonFactory(), {
    output: {
      path: path.resolve(firefoxRoot, "bundles"),
    },
    plugins: [
      new CopyPlugin({
        patterns: [
          {
            from: path.resolve(
              firefoxRoot,
              "manifests",
              "manifest.template.json"
            ),
            to: "manifest.json",
            transform(content) {
              const manifest = JSON.parse(content.toString());
              manifest.version = process.env.npm_package_version;
              const services = uniq([
                "https://app.pixiebrix.com",
                process.env.SERVICE_URL ?? "https://app.pixiebrix.com",
              ]).join(" ");
              manifest.content_security_policy = `default-src 'self'; connect-src 'self' ${services}; script-src 'self'; font-src 'self' data: https://fonts.gstatic.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`;
              return JSON.stringify(manifest, null, 4);
            },
          },
          {
            from: path.resolve(firefoxRoot, "src"),
          },
          {
            from: path.resolve(firefoxRoot, "..", "src"),
          },
        ],
      }),
      new MiniCssExtractPlugin({
        path: path.resolve(firefoxRoot, "bundles", "css"),
        filename: "css/[name].css",
        chunkFilename: "css/[id].css",
        ignoreOrder: false, // Enable to remove warnings about conflicting order
      }),
    ],
  });
