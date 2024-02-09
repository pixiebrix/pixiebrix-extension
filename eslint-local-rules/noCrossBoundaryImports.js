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

const path = require("node:path");
const multimatch = require("multimatch");

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
          boundaries: {
            type: "array",
            items: {
              type: "string",
            },
            uniqueItems: true,
          },
          allowedGlobs: {
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
    const { boundaries = [], allowedGlobs = [] } = context.options[0] ?? {};
    if (boundaries.length === 0) {
      throw new Error("No boundaries specified");
    }

    return {
      ImportDeclaration(node) {
        if (node.importKind === "type") {
          // Ignore `import type Default`
          return;
        }

        if (
          node.specifiers.length > 0 &&
          node.specifiers.every((specifier) => specifier.importKind === "type")
        ) {
          // Ignore `import {type X, type Y}`
          // The length check handles empty arrays
          return;
        }

        const importPath = node.source.value;
        const [alias, importedFolder] = importPath.split("/");
        if (alias !== "@" || !boundaries.includes(importedFolder)) {
          // Ignore `import 'react'`
          // Ignore `import '@/utils'`
          return;
        }

        const thisFileFolder = path
          .relative(path.join(context.cwd, "src"), context.getFilename())
          .split("/")[0];
        if (importedFolder === thisFileFolder) {
          // Ignore `import '@/background'` when in `@/background`
          return;
        }

        const isAllowedFile = multimatch(importPath, allowedGlobs).length > 0;
        if (isAllowedFile) {
          // Ignore whitelisted globs like the messenger
          return;
        }

        context.report({
          node,
          message: `"${importPath}" cannot be imported from "${thisFileFolder}" folder. Info on https://github.com/pixiebrix/pixiebrix-extension/wiki/Contexts#eslint`,
        });
      },
    };
  },
};
