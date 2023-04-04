/* eslint-disable @typescript-eslint/no-require-imports,@typescript-eslint/no-var-requires,unicorn/prefer-module */
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

const fs = require("node:fs");
const path = require("node:path");

const projectName = "pixiebrix-extension";

const ruleFiles = fs
  .readdirSync("eslint-plugin-pixiebrix-extension/rules")
  .filter((file) => !file.endsWith("test.js"));

const configs = {
  all: {
    plugins: [projectName],
    rules: Object.fromEntries(
      ruleFiles.map((file) => [
        `${projectName}/${path.basename(file, ".js")}`,
        "error",
      ])
    ),
  },
};

const rules = Object.fromEntries(
  // eslint-disable-next-line security/detect-non-literal-require
  ruleFiles.map((file) => [
    path.basename(file, ".js"),
    require("./rules/" + file),
  ])
);

module.exports = { configs, rules };
