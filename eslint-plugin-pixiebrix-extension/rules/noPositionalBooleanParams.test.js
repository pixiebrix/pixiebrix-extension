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

const noPositionalBooleanParams = require("./noPositionalBooleanParams");
const { RuleTester } = require("eslint");

// Create a new RuleTester instance
const ruleTester = new RuleTester({
  parser: require.resolve("@typescript-eslint/parser"), // Use the TypeScript parser
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: "module",
  },
});

// Define the test cases
ruleTester.run("noPositionalBooleanParams", noPositionalBooleanParams, {
  valid: [
    // Valid test cases (code that should not trigger the rule)
    {
      code: `function add(a: number, b: number): number {
        return a + b;
      }`,
    },
    {
      code: `const multiply = (a: number, b: number): number => a * b;`,
    },
  ],

  invalid: [
    // Invalid test cases (code that should trigger the rule)
    {
      code: `function toggleFlag(flag: boolean): void {
        // ...
      }`,
      errors: [
        {
          message: "Boolean positional parameters are not allowed.",
        },
      ],
    },
    {
      code: `const setVisibility = (visible: boolean): void => {
        // ...
      };`,
      errors: [
        {
          message: "Boolean positional parameters are not allowed.",
        },
      ],
    },
  ],
});
