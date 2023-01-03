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

import {
  getFieldNamesFromPathString,
  getPathFromArray,
  getPropByPath,
  isSimplePath,
} from "@/runtime/pathHelpers";
import { toPath } from "lodash";

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

  test.each([
    [
      {
        foo: {
          "bar.baz": "qux",
        },
      },
      'foo["bar.baz"]',
      "qux",
    ],
    [
      {
        "foo.bar": {
          baz: "qux",
        },
      },
      '["foo.bar"].baz',
      "qux",
    ],
  ])("can get property accessed by []", (context, path, expected) => {
    expect(getPropByPath(context, path)).toBe(expected);
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

  test.each([
    ['foo["bar.baz"]', ["foo", "bar.baz"]],
    ['foo.bar["baz.qux"]', ["foo.bar", "baz.qux"]],
    ['foo["bar.baz"].qux', ['foo["bar.baz"]', "qux"]],
    ['foo["bar.baz"].qux.quux', ['foo["bar.baz"].qux', "quux"]],
  ])("path with periods", (name, expected) => {
    expect(getFieldNamesFromPathString(name)).toStrictEqual(expected);
  });
});

test("getPathFromArray", () => {
  const expectMatch = (
    pathArray: Array<number | string>,
    expectedPathString: string
  ) => {
    const pathString = getPathFromArray(pathArray);
    const lodashArray = toPath(pathString);

    // Compare the array to the expected string
    expect(pathString).toBe(expectedPathString);

    // Expect the same input, except that lodash only returns strings even for numbers
    expect(lodashArray).toEqual(pathArray.map(String));
  };

  expectMatch(["user"], "user");
  expectMatch(["users", 0], "users.0");
  expectMatch(["users", 0, "name"], "users.0.name");
  expectMatch(["users", ""], 'users[""]');
  expectMatch(["names", "Dante Alighieri"], 'names["Dante Alighieri"]');
  expectMatch(
    ["Ugo Foscolo", "User Location"],
    '["Ugo Foscolo"]["User Location"]'
  );
  expectMatch(["User List", 100, "id"], '["User List"].100.id');
  expectMatch(
    ["User List", 100_000_000, "The name"],
    '["User List"].100000000["The name"]'
  );
});
