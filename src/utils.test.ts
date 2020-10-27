/*
 * Copyright (C) 2020 Pixie Brix, LLC
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { getPropByPath } from "@/utils";

test("can get array element by index", () => {
  expect(getPropByPath({ array: [1, 2, 3] }, "array.0")).toBe(1);
});

test("can get integer object property", () => {
  expect(getPropByPath({ array: { 0: "foo" } }, "array.0")).toBe("foo");
});

test("can get object path in array", () => {
  expect(getPropByPath({ array: [{ key: "foo" }] }, "array.0.key")).toBe("foo");
});

test("can apply null coalescing to array index", () => {
  expect(getPropByPath({ array: [{ key: "foo" }] }, "array.1?.key")).toBeNull();
});
