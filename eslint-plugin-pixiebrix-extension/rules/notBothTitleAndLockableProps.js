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
        "Disallow usage of both title attribute and makeLockableFieldProps function in the same component JSX node",
      category: "Possible Errors",
      recommended: true,
    },
    schema: [],
  },

  create(context) {
    return {
      JSXOpeningElement(node) {
        const hasTitleAttribute = node.attributes.some(
          (attribute) =>
            attribute.type === "JSXAttribute" && attribute.name.name === "title"
        );

        const hasLockablePropsSpread = node.attributes.some((attribute) => {
          if (attribute.type === "JSXSpreadAttribute") {
            const { argument } = attribute;
            if (
              argument.type === "CallExpression" &&
              argument.callee.name === "makeLockableFieldProps"
            ) {
              return true;
            }
          }

          return false;
        });

        if (hasTitleAttribute && hasLockablePropsSpread) {
          context.report({
            node,
            message:
              "Disallow usage of both title attribute and makeLockableFieldProps function in the same component JSX node.",
          });
        }
      },
    };
  },
};
