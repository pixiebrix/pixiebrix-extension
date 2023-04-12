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

const noInvalidDataTestId = require("./noInvalidDataTestId");
const { RuleTester } = require("eslint");

const ruleTester = new RuleTester({
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
  },
});

ruleTester.run("noInvalidDataTestId", noInvalidDataTestId, {
  valid: [{ code: '<div data-testid="myTestDiv" />' }],
  invalid: [
    {
      code: '<div data-test-id="myTestDiv" />',
      errors: [{ message: "Use data-testid." }],
      output: '<div data-testid="myTestDiv" />',
    },
    {
      code: '<div data-testId="myTestDiv" />',
      errors: [{ message: "Use data-testid." }],
      output: '<div data-testid="myTestDiv" />',
    },
    {
      code: '<div dataTest-id="myTestDiv" />',
      errors: [{ message: "Use data-testid." }],
      output: '<div data-testid="myTestDiv" />',
    },
    {
      code: '<div dataTestId="myTestDiv" />',
      errors: [{ message: "Use data-testid." }],
      output: '<div data-testid="myTestDiv" />',
    },
    {
      code: '<div testId="myTestDiv" />',
      errors: [{ message: "Use data-testid." }],
      output: '<div data-testid="myTestDiv" />',
    },
    {
      code: '<div testid="myTestDiv" />',
      errors: [{ message: "Use data-testid." }],
      output: '<div data-testid="myTestDiv" />',
    },
  ],
});
