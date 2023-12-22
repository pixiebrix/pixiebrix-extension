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

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description:
        "disallow module-level variables in src/background directory due to MV3",
      category: "Possible Errors",
      recommended: true,
    },
    schema: [], // No options
  },
  create(context) {
    const filename = context.getFilename();
    const isBackgroundDirectory = filename.includes("/src/background/");

    if (!isBackgroundDirectory) {
      return {}; // Exit early if not in the src/background directory
    }

    return {
      "VariableDeclaration:exit"(node) {
        if (node.parent.type === "Program") {
          context.report({
            node,
            message:
              "Module-level variables are forbidden in src/background directory",
          });
        }
      },
    };
  },
};
