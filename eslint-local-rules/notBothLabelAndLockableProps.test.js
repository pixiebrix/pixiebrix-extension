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

const notBothLabelAndLockableProps = require("./notBothLabelAndLockableProps");
const { RuleTester } = require("eslint");

const ruleTester = new RuleTester({
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: "module",
    ecmaFeatures: {
      jsx: true,
    },
  },
});

ruleTester.run("notBothLabelAndLockableProps", notBothLabelAndLockableProps, {
  valid: [
    {
      code: `
        <ConnectedFieldTemplate
          name="fieldName"
          as={NumberWidget}
          description="The number of milliseconds to delay"
          {...makeLockableFieldProps("Delay Millis", isLocked)}
        />
      `,
    },
    {
      code: `
        <ConnectedFieldTemplate
          name="fieldName"
          label="Delay (ms)"
          as={NumberWidget}
          description="The number of milliseconds to delay"
        />
      `,
    },
  ],

  invalid: [
    {
      code: `
        <ConnectedFieldTemplate
          name={fieldName("debounce", "waitMillis")}
          label="Delay (ms)"
          as={NumberWidget}
          description="The number of milliseconds to delay"
          {...makeLockableFieldProps("Delay Millis", isLocked)}
        />
      `,
      errors: [
        {
          message:
            "Disallow usage of both label attribute and makeLockableFieldProps function in the same component JSX node.",
        },
      ],
    },
  ],
});
