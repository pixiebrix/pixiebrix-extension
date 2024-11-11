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

const rule = require("./preferNullish");
const { RuleTester } = require("@typescript-eslint/rule-tester");

const ruleTester = new RuleTester({
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: "module",
    ecmaFeatures: {},
  },
});

ruleTester.run("preferNullish", rule, {
  valid: [
    "let x: Nullish;",
    "let y: string | number;",
    "let z: null",
    "let a: undefined;",
    "type Foo = string | number",
    "type Bar = null | (() => void)",
    // See preferNullishable for the following test cases
    "type Foo = string | null | undefined;",
    "let y: string | undefined | null;",
  ],
  invalid: [
    {
      code: "let x: null | undefined;",
      errors: [
        {
          message: "Consider using Nullish instead of null | undefined",
        },
      ],
    },
    {
      code: "type Bar = null | undefined;",
      errors: [
        {
          message: "Consider using Nullish instead of null | undefined",
        },
      ],
    },
  ],
});
