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

const ALLOWED_TYPES = [
  "Literal",
  "TemplateLiteral",
  "FunctionExpression",
  "ArrowFunctionExpression",
];
const ALLOWED_CONSTRUCTORS = [
  "SessionMap",
  "SessionValue",
  "StorageItem",
  "WeakMap",
  "SimpleEventTarget",
  "AbortController",
  "ReusableAbortController",
];
const ALLOWED_FUNCTIONS = [
  "getMethod",
  "pMemoize",
  "memoizeUntilSettled",
  "once",
  "debounce",
  "throttle",
  "getNotifier",
  "createSelector",
  "createSlice",
  "createAsyncThunk",
  "Boolean",
];

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
            const { init, id } = declaration;
            if (
              !init || // Exclude "let"
              ALLOWED_TYPES.includes(init.type)
            ) {
              return;
            }

            if (
              init.type === "NewExpression" &&
              init.callee.type === "Identifier" &&
              ALLOWED_CONSTRUCTORS.includes(init.callee.name)
            ) {
              return;
            }

            // Ignore `CONSTANTS` and `Components`
            if (id.type === "Identifier" && /[A-Z]/.test(id.name[0])) {
              return;
            }

            if (
              init.type === "CallExpression" &&
              init.callee.type === "Identifier" &&
              ALLOWED_FUNCTIONS.includes(init.callee.name)
            ) {
              return;
            }

            context.report({
              node: declaration,
              message:
                "Ensure that mutable module-level variables are not used in background files due to MV3. Use SessionMap or SessionValue instead. If this is a function or immutable value, ignore this rule with the comment 'Static', 'Function', or add more details as to why it should be ignored.",
            });
          }
        }
      },
    };
  },
};
