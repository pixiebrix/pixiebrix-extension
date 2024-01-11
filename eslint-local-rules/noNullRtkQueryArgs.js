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

// eslint-disable-next-line unicorn/prefer-module
module.exports = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow passing null as the first argument to RTK query hooks",
      category: "Possible Errors",
      recommended: true,
    },
  },

  create(context) {
    return {
      CallExpression(node) {
        console.log("*** node", node);
        if (
          (isRtkQueryHookOnEndpointDefinition(node) || isRtkQueryHook(node)) &&
          node.arguments?.length > 0 &&
          node.arguments?.[0].value === null
        ) {
          context.report({
            node,
            message:
              "Do not pass null as the first argument to RTK query hooks. If you need to pass no arguments, use undefined instead.",
          });
        }
      },
    };
  },
};

function isRtkQueryHook(node) {
  return (
    node &&
    node.type === "CallExpression" &&
    node.callee &&
    node.callee.type === "Identifier" &&
    node.callee.name.startsWith("use") &&
    node.callee.name.endsWith("Query")
  );
}

function isRtkQueryHookOnEndpointDefinition(node) {
  return (
    node.callee &&
    node.callee.type === "MemberExpression" &&
    node.callee.property &&
    node.callee.property.name === "useQuery"
  );
}
