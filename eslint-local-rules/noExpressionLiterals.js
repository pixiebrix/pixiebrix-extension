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
        let expressionType = null;
        let valueNode = null;

        for (const property of node.properties) {
          if (property.key && property.key.name === "__type__") {
            expressionType = property.value.value;
          }

          if (property.key && property.key.name === "__value__") {
            valueNode = property.value;
          }
        }

        if (
          ["nunjucks", "mustache", "handlebars"].includes(expressionType) &&
          valueNode
        ) {
          context.report({
            node,
            message: `Use makeTemplateExpression("${expressionType}", value) instead of an object literal`,
            fix(fixer) {
              return fixer.replaceText(
                node,
                `makeTemplateExpression("${expressionType}", ${context
                  .getSourceCode()
                  .getText(valueNode)})`,
              );
            },
          });
        }

        if (expressionType === "var" && valueNode) {
          context.report({
            node,
            message:
              "Use makeVariableExpression(value) instead of an object literal",
            fix(fixer) {
              return fixer.replaceText(
                node,
                `makeVariableExpression(${context
                  .getSourceCode()
                  .getText(valueNode)})`,
              );
            },
          });
        }
      },
    };
  },
};
