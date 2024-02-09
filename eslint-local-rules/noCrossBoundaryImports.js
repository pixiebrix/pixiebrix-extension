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

const path = require("path");
const minimatch = require("minimatch");

// eslint-disable-next-line unicorn/prefer-module
module.exports = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow imports of files under certain folders unless the current file is within those folders.",
      category: "Best Practices",
      recommended: true,
    },
    schema: [
      {
        type: "object",
        properties: {
          forbiddenFolders: {
            type: "array",
            items: {
              type: "string",
            },
            uniqueItems: true,
          },
          allowedFiles: {
            type: "array",
            items: {
              type: "string",
            },
            uniqueItems: true,
          },
        },
        additionalProperties: false,
      },
    ],
  },
  create(context) {
    const options = context.options[0] || {};
    const forbiddenFolders = options.forbiddenFolders || [];
    const allowedFiles = options.allowedFiles || [];

    function isFileUnderForbiddenFolder(importPath, currentFilePath) {
      if (!importPath.startsWith("@/")) {
        return false;
      }

      const aliasedCurrentFilePath = path
        .relative(process.cwd(), currentFilePath)
        .replace("src/", "@/");
      return forbiddenFolders.some(
        (folder) =>
          importPath.startsWith(`@/${folder}`) &&
          !aliasedCurrentFilePath.startsWith(`@/${folder}`),
      );
    }

    function isFileWhitelisted(importPath) {
      return allowedFiles.some((pattern) => minimatch(importPath, pattern));
    }

    return {
      ImportDeclaration(node) {
        const importPath = node.source.value;
        const currentFilePath = context.getFilename();

        if (
          isFileUnderForbiddenFolder(importPath, currentFilePath) &&
          !isFileWhitelisted(importPath)
        ) {
          context.report({
            node,
            message: `Unexpected path "${importPath}" imported in restricted zone.`,
          });
        }
      },
    };
  },
};
