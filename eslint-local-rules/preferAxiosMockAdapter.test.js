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

const { RuleTester } = require("eslint");
const preferAxiosMockAdapter = require("./preferAxiosMockAdapter");

const ruleTester = new RuleTester({
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: "module",
  },
});

ruleTester.run("preferAxiosMockAdapter", preferAxiosMockAdapter, {
  valid: [
    {
      code: 'import { appApiMock } from "@/testUtils/appApiMock";',
    },
  ],
  invalid: [
    {
      code: 'jest.mock("@/data/service/api");',
      errors: [
        {
          message:
            "Avoid mocking '@/data/service/api'. Use 'import { appApiMock } from \"@/testUtils/appApiMock\";' instead.",
        },
      ],
    },
    {
      code: 'jest.mock("@/data/service/api", () => ({ get: jest.fn() }));',
      errors: [
        {
          message:
            "Avoid mocking '@/data/service/api'. Use 'import { appApiMock } from \"@/testUtils/appApiMock\";' instead.",
        },
      ],
    },
  ],
});
