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

const rule = require("./preferNullishable");
const { RuleTester } = require("@typescript-eslint/rule-tester");

const ruleTester = new RuleTester({
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: "module",
    ecmaFeatures: {},
  },
});

ruleTester.run("preferNullishable", rule, {
  valid: [
    "let x: Nullish;",
    "let y: string | number;",
    "let z: null",
    "let a: undefined;",
    "type Foo = string | number",
    "type Bar = null | (() => void)",
    "type Baz = Foo | Bar",
  ],
  invalid: [
    {
      code: "let x: string | null | undefined;",
      errors: [
        {
          message:
            "Consider using Nullishable<T> instead of T | null | undefined",
        },
      ],
    },
    {
      code: "type Foo = string | number | Nullish;",
      errors: [
        {
          message: "Consider using Nullishable<T> instead of T | Nullish",
        },
      ],
    },
    {
      code: "type Bar = string | number | null | undefined;",
      errors: [
        {
          message:
            "Consider using Nullishable<T> instead of T | null | undefined",
        },
      ],
    },
  ],
});
