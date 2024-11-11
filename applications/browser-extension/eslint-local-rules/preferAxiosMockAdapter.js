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

module.exports = {
  meta: {
    type: "suggestion",
    docs: {
      description: "Warn against mocking '@/data/service/api' in Jest tests",
      category: "Best Practices",
      recommended: true,
    },
    messages: {
      noMockApi:
        "Avoid mocking '@/data/service/api'. Use 'import { appApiMock } from \"@/testUtils/appApiMock\";' instead.",
    },
    schema: [],
  },
  create(context) {
    return {
      CallExpression(node) {
        if (
          node.callee.type === "MemberExpression" &&
          node.callee.object.name === "jest" &&
          node.callee.property.name === "mock" &&
          node.arguments.length > 0 &&
          node.arguments[0].type === "Literal" &&
          node.arguments[0].value === "@/data/service/api"
        ) {
          context.report({
            node,
            messageId: "noMockApi",
          });
        }
      },
    };
  },
};
