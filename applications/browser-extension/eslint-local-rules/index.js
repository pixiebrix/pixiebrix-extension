/* eslint-disable @typescript-eslint/no-require-imports,@typescript-eslint/no-var-requires,unicorn/prefer-module */
/*
 * Copyright (C) 2024 PixieBrix, Inc.
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

const fs = require("node:fs");
const path = require("node:path");

const ruleFiles = fs
  .readdirSync(__dirname)
  .filter(
    (file) =>
      !file.endsWith("test.js") &&
      !file.endsWith("index.js") &&
      file.endsWith(".js"),
  );

const rules = Object.fromEntries(
  ruleFiles.map((file) => [
    path.basename(file, ".js"),
    // eslint-disable-next-line security/detect-non-literal-require
    require(`./${file}`),
  ]),
);

module.exports = rules;
