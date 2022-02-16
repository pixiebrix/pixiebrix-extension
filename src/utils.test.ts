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
  freshIdentifier,
  isApiVersionAtLeast,
  joinName,
  removeUndefined,
  matchesAnyPattern,
} from "@/utils";
import type { SafeString } from "@/core";

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

describe("isApiVersionAtLeast()", () => {
  test("v2 is at least v1", () => {
    expect(isApiVersionAtLeast("v2", "v1")).toStrictEqual(true);
  });
  test("v2 is at least v2", () => {
    expect(isApiVersionAtLeast("v2", "v2")).toStrictEqual(true);
  });
  test("v3 is at least v1", () => {
    expect(isApiVersionAtLeast("v3", "v1")).toStrictEqual(true);
  });
  test("v1 is not at least v2", () => {
    expect(isApiVersionAtLeast("v1", "v2")).toStrictEqual(false);
  });
});

describe("joinName", () => {
  test("rejects no paths", () => {
    expect(() => joinName("foo")).toThrow("Expected one or more field names");
  });

  test("compacts paths", () => {
    expect(joinName("foo", null, "bar")).toBe("foo.bar");
  });

  test("rejects path part with period", () => {
    expect(() => joinName("foo", "bar.baz")).toThrow("cannot contain periods");
  });

  test("accepts base path part with period", () => {
    expect(joinName("foo.bar", "baz")).toBe("foo.bar.baz");
  });

  test("accepts null/undefined base path part", () => {
    expect(joinName(null, "foo")).toBe("foo");
    expect(joinName(undefined, "foo")).toBe("foo");
  });
});

describe("matchesAnyPattern", () => {
  test("matches a string array", () => {
    expect(matchesAnyPattern("hello", ["hi", "howdy", "hello"])).toBeTruthy();
    expect(
      matchesAnyPattern("hello", ["hi", "howdy", "hello y’all"])
    ).toBeFalsy();
    expect(matchesAnyPattern("yellow", ["hi", "howdy", "hello"])).toBeFalsy();
  });
  test("matches a regex array", () => {
    expect(matchesAnyPattern("hello", [/^hel+o/, /(ho ){3}/])).toBeTruthy();
    expect(matchesAnyPattern("hello", [/^Hello$/])).toBeFalsy();
  });
});
