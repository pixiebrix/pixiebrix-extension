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

const RTK_QUERY_SUFFIXES = ["Query", "QueryState", "QuerySubscription"];
const RTK_TRIGGER_PREFIX_SUFFIXES = [
  ["useLazy", "Query"],
  ["useLazy", "QuerySubscription"],
  ["use", "Mutation"],
  ["use", "Prefetch"],
];

const ERROR_MESSAGE =
  "Do not pass null as the first argument to RTK query hooks. If you need to pass no arguments, use undefined instead.";

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
    fixable: "code",
  },

  create(context) {
    return {
      CallExpression(node) {
        if (isRtkQueryHook(node) && isFirstArgumentNull(node.arguments)) {
          context.report({
            node,
            message: ERROR_MESSAGE,
            fix(fixer) {
              return fixer.replaceText(node.arguments[0], "undefined");
            },
          });
        }
      },
      VariableDeclarator(node) {
        if (isRtkQueryTriggerAssignment(node)) {
          const mutationTrigger = node.id.elements[0];
          const references = context.sourceCode
            .getScope(node)
            .references.filter(
              (reference) => reference.identifier.name === mutationTrigger.name,
            );

          for (const reference of references) {
            if (
              reference.identifier.parent &&
              reference.identifier.parent.type === "CallExpression" &&
              isFirstArgumentNull(reference.identifier.parent.arguments)
            ) {
              context.report({
                node: reference.identifier.parent,
                message: ERROR_MESSAGE,
                fix(fixer) {
                  return fixer.replaceText(
                    reference.identifier.parent.arguments[0],
                    "undefined",
                  );
                },
              });
            }
          }
        }
      },
    };
  },
};

function isRtkQueryTriggerAssignment(node) {
  return (
    node.init &&
    node.init.type === "CallExpression" &&
    isRtkQueryHookWithTrigger(node.init) &&
    node.id &&
    node.id.type === "ArrayPattern" &&
    node.id.elements.length > 0 &&
    node.id.elements[0].type === "Identifier"
  );
}

function isFirstArgumentNull(args) {
  return args?.length > 0 && args?.[0].value === null;
}

function isRtkQueryHookFormat(str) {
  return (
    str?.startsWith("use") &&
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

function isRtkQueryHookWithTriggerFormat(str) {
  for (const [prefix, suffix] of RTK_TRIGGER_PREFIX_SUFFIXES) {
    if (str?.startsWith(prefix) && str.endsWith(suffix)) {
      return true;
    }
  }

  return false;
}

function isRtkQueryHookWithTrigger(node) {
  if (node && node.type === "CallExpression" && node.callee) {
    return (
      (node.callee.type === "Identifier" &&
        isRtkQueryHookWithTriggerFormat(node.callee.name)) ||
      (node.callee.type === "MemberExpression" &&
        node.callee.property &&
        isRtkQueryHookWithTriggerFormat(node.callee.property.name))
    );
  }

  return false;
}
