/*
 * Copyright (C) 2022 PixieBrix, Inc.
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

import {
  getFieldNamesFromPathString,
  getPropByPath,
  isSimplePath,
} from "@/runtime/pathHelpers";

describe("getPropByPath", () => {
  test("can get array element by index", () => {
    expect(getPropByPath({ array: [1, 2, 3] }, "array.0")).toBe(1);
  });

  test("can get integer object property", () => {
    expect(getPropByPath({ array: { 0: "foo" } }, "array.0")).toBe("foo");
  });

  test("can get object path in array", () => {
    expect(getPropByPath({ array: [{ key: "foo" }] }, "array.0.key")).toBe(
      "foo"
    );
  });

  test("can apply null coalescing to array index", () => {
    expect(
      getPropByPath({ array: [{ key: "foo" }] }, "array.1?.key")
    ).toBeNull();
  });
});

describe("isSimplePath", () => {
  test("can detect path", () => {
    expect(isSimplePath("array.0", { array: [] })).toBeTruthy();
    expect(
      isSimplePath("@anOutputKey", { "@anOutputKey": "foo" })
    ).toBeTruthy();
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
});

describe("getFieldNamesFromPathString", () => {
  test("root field name", () => {
    expect(getFieldNamesFromPathString("foo")).toStrictEqual([
      undefined,
      "foo",
    ]);
  });

  test("single parent", () => {
    expect(getFieldNamesFromPathString("foo.bar")).toStrictEqual([
      "foo",
      "bar",
    ]);
  });

  test("multiple ancestors", () => {
    expect(getFieldNamesFromPathString("foo.bar.baz")).toStrictEqual([
      "foo.bar",
      "baz",
    ]);
  });
});
