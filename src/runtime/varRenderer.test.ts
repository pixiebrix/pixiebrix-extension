/*
 * Copyright (C) 2021 PixieBrix, Inc.
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

import { isSimplePath } from "./pathHelpers";

test("can detect path", () => {
  expect(isSimplePath("array.0", { array: [] })).toBeTruthy();
  expect(isSimplePath("@anOutputKey", { "@anOutputKey": "foo" })).toBeTruthy();
  expect(isSimplePath("kebab-case", { "kebab-case": "foo" })).toBeTruthy();
  expect(isSimplePath("snake_case", { snake_case: "foo" })).toBeTruthy();
});

test("can detect path with optional chaining", () => {
  expect(isSimplePath("array?.0", { array: [] })).toBeTruthy();
});

test("first path must exist in context", () => {
  expect(isSimplePath("array", {})).toBeFalsy();
  expect(isSimplePath("@anOutputKey", { anOutputKey: "foo" })).toBeFalsy();
  expect(isSimplePath("kebab-case", { kebab_case: "foo" })).toBeFalsy();
  expect(isSimplePath("snake_case", { "snake-case": "foo" })).toBeFalsy();
});
