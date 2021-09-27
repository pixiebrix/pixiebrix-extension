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

import {
  camelCaseToSentenceCase,
  freshIdentifier,
  getPropByPath,
  removeUndefined,
} from "@/utils";
import type { SafeString } from "@/core";

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

test("can generate fresh identifier", () => {
  const root = "field" as SafeString;
  expect(freshIdentifier(root, [])).toBe("field");
  expect(freshIdentifier(root, [], { includeFirstNumber: true })).toBe(
    "field1"
  );
  expect(
    freshIdentifier(root, [], { includeFirstNumber: true, startNumber: 0 })
  ).toBe("field0");
  expect(freshIdentifier(root, ["field"])).toBe("field2");
  expect(freshIdentifier(root, ["foo", "bar"])).toBe("field");
});

describe("removeUndefined", () => {
  test("remove top-level undefined", () => {
    expect(removeUndefined({ foo: undefined, bar: null })).toStrictEqual({
      bar: null,
    });
  });
  test("remove nested undefined", () => {
    expect(removeUndefined({ foo: { bar: undefined } })).toStrictEqual({
      foo: {},
    });
  });
});

describe("camelCaseToSentenceCase()", () => {
  test("myCamelCaseString", () => {
    expect(camelCaseToSentenceCase("myCamelCaseString")).toStrictEqual(
      "My Camel Case String"
    );
  });
  test("MyPascalCaseString", () => {
    expect(camelCaseToSentenceCase("MyPascalCaseString")).toStrictEqual(
      "My Pascal Case String"
    );
  });
  test("stringnospaces", () => {
    expect(camelCaseToSentenceCase("stringnospaces")).toStrictEqual(
      "Stringnospaces"
    );
  });
  test("string34WithNumbers14", () => {
    expect(camelCaseToSentenceCase("string34WithNumbers14")).toStrictEqual(
      "String 34 With Numbers 14"
    );
  });
});
