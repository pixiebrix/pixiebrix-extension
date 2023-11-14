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

const prohibitedNodeNames = [
  "data-test-id",
  "data-testId",
  "dataTest-id",
  "dataTestId",
  "testId",
  "testid",
];

// eslint-disable-next-line unicorn/prefer-module
module.exports = {
  meta: {
    type: "problem",
    docs: {
      description: "Disallow usage of incorrect data-testid attribute",
      category: "Possible Errors",
      recommended: true,
    },
    fixable: "code",
    schema: [],
  },

  create(context) {
    return {
      JSXAttribute(node) {
        if (node.name && prohibitedNodeNames.includes(node.name.name)) {
          context.report({
            node,
            message: "Use data-testid.",
            fix(fixer) {
              return fixer.replaceText(node.name, "data-testid");
            },
          });
        }
      },
    };
  },
};
