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
      description: "Encourages using Nullish type instead of null | undefined",
      category: "Best Practices",
      recommended: true,
    },
  },
  create(context) {
    return {
      TSUnionType(node) {
        // If the union type is not exactly two types, then it can't be null | undefined
        // Prefer Nullishable<T> instead of T | Nullish when there are more than two types
        if (node.types.length !== 2) return;

        const types = node.types.map((type) => type.type);
        if (
          types.includes("TSNullKeyword") &&
          types.includes("TSUndefinedKeyword")
        ) {
          context.report({
            node,
            message: "Consider using Nullish instead of null | undefined",
          });
        }
      },
    };
  },
};
