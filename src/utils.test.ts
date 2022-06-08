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
  makeURL,
  getScopeAndId,
  smartAppendPeriod,
} from "@/utils";
import type { RegistryId, SafeString } from "@/core";
import { BusinessError } from "@/errors/businessErrors";
import { assertHttpsUrl } from "@/errors/assertHttpsUrl";

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

describe("assertHttpsUrl", () => {
  test("parses HTTPS URLs", () => {
    expect(assertHttpsUrl("https://example.com")).toStrictEqual(
      new URL("https://example.com")
    );
  });
  test("rejects HTTP URLs", () => {
    expect(() => assertHttpsUrl("http://example.com")).toThrow(
      new BusinessError("Unsupported protocol: http:. Use https:")
    );
  });
  test("rejects invalid URLs", () => {
    expect(() => assertHttpsUrl("https::/example.com")).toThrow(
      new BusinessError("Invalid URL: https::/example.com")
    );
  });
  test("parses relative URLs with a base", () => {
    expect(
      assertHttpsUrl("/cool/path", "https://example.com/page")
    ).toStrictEqual(new URL("https://example.com/cool/path"));
  });
  test("rejects relative HTTP URLs", () => {
    expect(() =>
      assertHttpsUrl("/cool/path", "http://example.com/page")
    ).toThrow(new BusinessError("Unsupported protocol: http:. Use https:"));
  });
  test("rejects invalid base URLs", () => {
    expect(() => assertHttpsUrl("/cool/path", "https::/example.com")).toThrow(
      new BusinessError(
        "Invalid URL: /cool/path (base URL: https::/example.com)"
      )
    );
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

  test("accepts base path part with period", () => {
    expect(joinName("foo.bar", "baz")).toBe("foo.bar.baz");
  });

  test("accepts null/undefined base path part", () => {
    expect(joinName(null, "foo")).toBe("foo");
    expect(joinName(undefined, "foo")).toBe("foo");
  });

  test.each([
    [["bar.baz"], 'foo["bar.baz"]'],
    [["bar", "baz.qux"], 'foo.bar["baz.qux"]'],
    [["bar.baz", "qux"], 'foo["bar.baz"].qux'],
  ])("accepts periods in path parts (%s)", (pathParts, expected) => {
    expect(joinName("foo", ...pathParts)).toBe(expected);
  });
  test.each([
    [["bar[baz"], 'foo["bar[baz"]'],
    [["bar", "[baz]qux"], 'foo.bar["[baz]qux"]'],
    [["bar[]baz", "qux"], 'foo["bar[]baz"].qux'],
  ])("accepts square brackets in path parts (%s)", (pathParts, expected) => {
    expect(joinName("foo", ...pathParts)).toBe(expected);
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

describe("makeURL", () => {
  test("basic parameter support", () => {
    const origin = "https://pixiebrix.com";
    expect(makeURL(origin)).toBe("https://pixiebrix.com/");
    expect(makeURL(origin, {})).toBe("https://pixiebrix.com/");
    expect(makeURL(origin, { a: undefined, b: null })).toBe(
      "https://pixiebrix.com/"
    );
    expect(makeURL(origin, { a: 1, b: "hi", c: false })).toBe(
      "https://pixiebrix.com/?a=1&b=hi&c=false"
    );
  });

  test("spaces support", () => {
    const origin = "https://pixiebrix.com/path";
    expect(makeURL(origin, { a: "b c", d: "e+f" })).toBe(
      "https://pixiebrix.com/path?a=b%20c&d=e%2Bf"
    );
    expect(makeURL(origin, { a: "b c", d: "e+f" }, "plus")).toBe(
      "https://pixiebrix.com/path?a=b+c&d=e%2Bf"
    );
  });

  test("relative URLs support", () => {
    expect(makeURL("bricks")).toBe("http://localhost/bricks");
    expect(makeURL("/blueprints", { id: 1 })).toBe(
      "http://localhost/blueprints?id=1"
    );
  });

  test("preserve existing search parameters", () => {
    const origin = "https://pixiebrix.com?a=ORIGINAL&b=ORIGINAL";
    expect(makeURL(origin, { a: "NEW", c: "NEW" })).toBe(
      "https://pixiebrix.com/?a=NEW&b=ORIGINAL&c=NEW"
    );
  });

  test("override existing search parameters if requested", () => {
    const origin = "https://pixiebrix.com?a=ORIGINAL&b=ORIGINAL&c=ORIGINAL";
    expect(makeURL(origin, { a: null, c: null })).toBe(
      "https://pixiebrix.com/?b=ORIGINAL"
    );
  });

  test("preserve hash", () => {
    const origin = "https://pixiebrix.com#example";
    expect(makeURL(origin)).toBe("https://pixiebrix.com/#example");
  });

  test("preserve hash and query string", () => {
    const origin = "https://pixiebrix.com?foo=bar#example";
    expect(makeURL(origin)).toBe("https://pixiebrix.com/?foo=bar#example");
  });
});

describe("getScopeAndId", () => {
  test("normal id", () => {
    const id = "@foo/bar" as RegistryId;
    expect(getScopeAndId(id)).toStrictEqual(["@foo", "bar"]);
  });
  test("id with slash", () => {
    const id = "@foo/bar/baz" as RegistryId;
    expect(getScopeAndId(id)).toStrictEqual(["@foo", "bar/baz"]);
  });
  test("id without scope", () => {
    const id = "foobar" as RegistryId;
    expect(getScopeAndId(id)).toStrictEqual([undefined, "foobar"]);
  });
  test("id without scope with slash", () => {
    const id = "foo/bar/baz" as RegistryId;
    expect(getScopeAndId(id)).toStrictEqual([undefined, "foo/bar/baz"]);
  });
  test("scope without id", () => {
    const id = "@foo" as RegistryId;
    expect(getScopeAndId(id)).toStrictEqual(["@foo", undefined]);
  });
});

test("smartAppendPeriod", () => {
  expect(smartAppendPeriod("hello")).toBe("hello.");
  expect(smartAppendPeriod("hello.")).toBe("hello.");
  expect(smartAppendPeriod("hello (good looking)")).toBe(
    "hello (good looking.)"
  );
  expect(smartAppendPeriod("hello (good looking.)")).toBe(
    "hello (good looking.)"
  );
});
