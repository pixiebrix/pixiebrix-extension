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
const { mergeWithCustomize, customizeArray } = require("webpack-merge");
const common = require("../../webpack/webpack.dev.js");
const webpack = require("webpack");
const CopyPlugin = require("copy-webpack-plugin");
const { uniq } = require("lodash");
const Policy = require("csp-parse");

const chromeRoot = path.resolve(__dirname, "../");

module.exports = mergeWithCustomize({
  customizeArray: customizeArray({
    plugins: "prepend",
  }),
})(common, {
  output: {
    path: path.resolve(chromeRoot, "bundles"),
  },
  plugins: [
    new webpack.DefinePlugin({
      "process.env": {
        CHROME: JSON.stringify(true),
        CHROME_EXTENSION_ID: JSON.stringify(process.env.CHROME_EXTENSION_ID),
        GOOGLE_API_KEY: JSON.stringify(process.env.GOOGLE_API_KEY),
        GOOGLE_APP_ID: JSON.stringify(process.env.GOOGLE_APP_ID),
      },
    }),
    new CopyPlugin({
      patterns: [
        {
          from: path.resolve(chromeRoot, "manifests", "manifest.template.json"),
          to: "manifest.json",
          transform(content) {
            const manifest = JSON.parse(content.toString());
            manifest.name = "PixieBrix - Development";
            if (process.env.CHROME_MANIFEST_KEY) {
              manifest.key = process.env.CHROME_MANIFEST_KEY;
            }
            manifest.version = process.env.npm_package_version;
            const internal = [
              "http://127.0.0.1:8000/*",
              "http://127.0.0.1/*",
              "http://localhost/*",
            ];

            const policy = new Policy(manifest.content_security_policy);
            policy.add(
              "connect-src",
              "ws://localhost:9090/ http://127.0.0.1:8000"
            );
            manifest.content_security_policy = policy.toString();

            // console.log(policy.toString());

            if (process.env.ENABLE_DEVTOOLS) {
              manifest.permissions = uniq([
                ...manifest.permissions,
                "activeTab",
              ]);
              manifest.devtools_page = "devtools.html";
            }

            manifest.content_scripts[0].matches = uniq([
              ...manifest.content_scripts[0].matches,
              ...internal,
            ]);

            manifest.externally_connectable.matches = uniq([
              ...manifest.externally_connectable.matches,
              ...internal,
            ]);

            if (process.env.GOOGLE_OAUTH_CLIENT_ID) {
              manifest.oauth2 = {
                client_id: process.env.GOOGLE_OAUTH_CLIENT_ID,
                // don't ask for any scopes up front, instead ask when they're required, e.g., when the user
                // installs a brick for google sheets
                scopes: [""],
              };
            }
            return JSON.stringify(manifest, null, 4);
          },
        },
        {
          from: path.resolve(chromeRoot, "src"),
        },
        {
          from: path.resolve(chromeRoot, "..", "src"),
        },
      ],
    }),
  ],
});
