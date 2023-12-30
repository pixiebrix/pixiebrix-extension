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
        "disallow mutable module-level variables in src/background directory due to MV3. Use chrome.storage.session instead.",
      category: "Possible Errors",
      recommended: true,
    },
    schema: [], // No options
  },
  create(context) {
    return {
      "VariableDeclaration:exit"(node) {
        if (node.parent.type === "Program") {
          for (const declaration of node.declarations) {
            const { init } = declaration;
            if (
              [
                "Literal",
                "FunctionExpression",
                "ArrowFunctionExpression",
              ].includes(init.type)
            ) {
              return;
            }

            if (
              init.type === "NewExpression" &&
              init.callee.type === "Identifier" &&
              ["SessionMap", "SessionValue", "StorageItem"].includes(
                init.callee.name,
              )
            ) {
              return;
            }

            context.report({
              node: declaration,
              message:
                "Non-literal module-level variables are not allowed in src/background directory",
            });
          }
        }
      },
    };
  },
};
