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

// eslint-disable-next-line unicorn/prefer-module
const { sortBy, isEqual } = require("lodash");
module.exports = {
  meta: {
    type: "problem",
    docs: {
      description: "disallow usage of expression object literals",
      category: "Best Practices",
      recommended: true,
    },
    fixable: "code",
    schema: [], // No options
  },

  create(context) {
    return {
      ObjectExpression(node) {
        let typeNode = null;
        let valueNode = null;

        // Key is nullable
        const propertyNames = node.properties.map((x) => x.key?.name);

        const isPropertyNameMatch = isEqual(sortBy(propertyNames), [
          "__type__",
          "__value__",
        ]);

        if (!isPropertyNameMatch) {
          return;
        }

        for (const property of node.properties) {
          if (property.key && property.key.name === "__type__") {
            typeNode = property.value;
          }

          if (property.key && property.key.name === "__value__") {
            valueNode = property.value;
          }
        }

        if (typeNode && valueNode) {
          context.report({
            node,
            message:
              "Use toExpression(type, value) instead of an object literal",
            fix(fixer) {
              const typeText = context.getSourceCode().getText(typeNode);

              const valueText = context.getSourceCode().getText(valueNode);

              return fixer.replaceText(
                node,
                `toExpression(${typeText}, ${valueText})`,
              );
            },
          });
        }
      },
    };
  },
};
