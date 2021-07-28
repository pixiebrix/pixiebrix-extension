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

// Resolve-only webpack configuration for ESlint

const path = require("path");

module.exports = {
  resolve: {
    alias: {
      "@": path.resolve("src"),
      "@img": path.resolve("img"),
      "@contrib": path.resolve("contrib"),
      "@schemas": path.resolve("schemas"),
      vendors: path.resolve("src/vendors"),
      "@microsoft/applicationinsights-web": path.resolve(
        "src/contrib/uipath/quietLogger"
      ),
      // `lodash-es` is a build of lodash using es6 modules. It also avoids an import error loading lodash methods we
      // were seeing on https://www.cbssports.com/fantasy/football/players/2258303/aj-brown/
      lodash: "lodash-es",
      // An existence check triggers webpack’s warnings https://github.com/handlebars-lang/handlebars.js/issues/953
      handlebars: "handlebars/dist/handlebars.js",
    },
    extensions: [".ts", ".tsx", ".jsx", ".js"],
  },
};
