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

const RTK_QUERY_SUFFIXES = ["Query", "QueryState", "QuerySubscription"];

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
        if (
          isRtkQueryHook(node) &&
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
      VariableDeclarator(node) {
        if (
          node.init &&
          node.init.type === "CallExpression" &&
          isRtkMutationHook(node.init)
        ) {
          if (
            node.id &&
            node.id.type === "ArrayPattern" &&
            node.id.elements.length > 0 &&
            node.id.elements[0].type === "Identifier"
          ) {
            const mutationTrigger = node.id.elements[0];
            const references = context
              .getScope()
              .references.filter(
                (reference) =>
                  reference.identifier.name === mutationTrigger.name,
              );

            references.forEach((reference) => {
              if (
                reference.identifier.parent &&
                reference.identifier.parent.type === "CallExpression" &&
                reference.identifier.parent.arguments?.length > 0 &&
                reference.identifier.parent.arguments?.[0].value === null
              ) {
                context.report({
                  node: reference.identifier.parent,
                  message:
                    // TODO: make this message more specific to mutations
                    "Do not pass null as the first argument to RTK query hooks. If you need to pass no arguments, use undefined instead.",
                });
              }
            });
          }
        }
      },
    };
  },
};

function isRtkQueryHookFormat(str) {
  return (
    str.startsWith("use") &&
    RTK_QUERY_SUFFIXES.some((suffix) => str.endsWith(suffix))
  );
}

function isRtkQueryHook(node) {
  if (node && node.type === "CallExpression" && node.callee) {
    return (
      (node.callee.type === "Identifier" &&
        isRtkQueryHookFormat(node.callee.name)) ||
      (node.callee.type === "MemberExpression" &&
        node.callee.property &&
        isRtkQueryHookFormat(node.callee.property.name))
    );
  }

  return false;
}

function isRtkMutationHookFormat(str) {
  return str.startsWith("use") && str.endsWith("Mutation");
}

function isRtkMutationHook(node) {
  if (node && node.type === "CallExpression" && node.callee) {
    return (
      (node.callee.type === "Identifier" &&
        isRtkMutationHookFormat(node.callee.name)) ||
      (node.callee.type === "MemberExpression" &&
        node.callee.property &&
        isRtkMutationHookFormat(node.callee.property.name))
    );
  }

  return false;
}
