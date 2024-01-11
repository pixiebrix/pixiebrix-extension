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

const noNullRtkQueryArgs = require("./noNullRtkQueryArgs");
const { RuleTester } = require("eslint");

const ruleTester = new RuleTester({
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
  },
});

ruleTester.run("noNullRtkQueryArgs", noNullRtkQueryArgs, {
  valid: [
    { code: "useFooQuery('foo')" },
    { code: "useFooQuery({})" },
    { code: "useFooQuery(undefined)" },
    { code: "useFooQuery('foo', {})" },
    { code: "useFooQuery({}, {})" },
    { code: "useFooQuery(undefined, {})" },
  ],
  invalid: [
    {
      code: "useFooQuery(null)",
      errors: [
        {
          message:
            "Do not pass null as the first argument to RTK query hooks. If you need to pass no arguments, use undefined instead.",
        },
      ],
    },
    {
      code: "useFooQuery(null, {})",
      errors: [
        {
          message:
            "Do not pass null as the first argument to RTK query hooks. If you need to pass no arguments, use undefined instead.",
        },
      ],
    },
    {
      code: "useFooQuery(null)",
      errors: [
        {
          message:
            "Do not pass null as the first argument to RTK query hooks. If you need to pass no arguments, use undefined instead.",
        },
      ],
    },
    {
      code: "useFooQuery(null, {})",
      errors: [
        {
          message:
            "Do not pass null as the first argument to RTK query hooks. If you need to pass no arguments, use undefined instead.",
        },
      ],
    },
  ],
});
