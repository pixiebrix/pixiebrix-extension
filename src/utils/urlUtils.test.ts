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

import { BusinessError } from "@/errors/businessErrors";
import {
  assertProtocolUrl,
  makeURL,
  selectAbsoluteUrl,
  isUrlRelative,
  isPixieBrixDomain,
} from "@/utils/urlUtils";

describe("assertHttpsUrl", () => {
  test("parses HTTPS URLs", () => {
    expect(() => {
      assertProtocolUrl("https://example.com", ["https:"]);
    }).not.toThrow();
  });
  test("rejects HTTP URLs if not specified", () => {
    expect(() => {
      assertProtocolUrl("http://example.com", ["https:"]);
    }).toThrow(new BusinessError("Unsupported protocol: http:. Use https:"));
  });
  test("allows HTTP URLs if specified", () => {
    expect(() => {
      assertProtocolUrl("https://example.com", ["https:"]);
    }).not.toThrow();
  });
  test("rejects unsupported protocol", () => {
    expect(() => {
      assertProtocolUrl("file://foo.txt", ["http:", "https:"]);
    }).toThrow(
      new BusinessError("Unsupported protocol: file:. Use http:, https:"),
    );
  });
  test("rejects invalid URLs", () => {
    expect(() => {
      assertProtocolUrl("https::/example.com", ["https:"]);
    }).toThrow(new BusinessError("Invalid URL: https::/example.com"));
  });
});

describe("makeURL", () => {
  test("basic parameter support", () => {
    const origin = "https://pixiebrix.com";
    expect(makeURL(origin)).toBe("https://pixiebrix.com/");
    expect(makeURL(origin, {})).toBe("https://pixiebrix.com/");
    expect(makeURL(origin, { a: null, b: null })).toBe(
      "https://pixiebrix.com/",
    );
    expect(makeURL(origin, { a: 1, b: "hi", c: false })).toBe(
      "https://pixiebrix.com/?a=1&b=hi&c=false",
    );
  });

  test("spaces support", () => {
    const origin = "https://pixiebrix.com/path";
    expect(makeURL(origin, { a: "b c", d: "e+f" })).toBe(
      "https://pixiebrix.com/path?a=b%20c&d=e%2Bf",
    );
    expect(makeURL(origin, { a: "b c", d: "e+f" }, "plus")).toBe(
      "https://pixiebrix.com/path?a=b+c&d=e%2Bf",
    );
  });

  test("relative URLs support", () => {
    expect(makeURL("bricks")).toBe("http://localhost/bricks");
    expect(makeURL("/blueprints", { id: 1 })).toBe(
      "http://localhost/blueprints?id=1",
    );
  });

  test("preserve existing search parameters", () => {
    const origin = "https://pixiebrix.com?a=ORIGINAL&b=ORIGINAL";
    expect(makeURL(origin, { a: "NEW", c: "NEW" })).toBe(
      "https://pixiebrix.com/?a=NEW&b=ORIGINAL&c=NEW",
    );
  });

  test("override existing search parameters if called", () => {
    const origin = "https://pixiebrix.com?a=ORIGINAL&b=ORIGINAL&c=ORIGINAL";
    expect(makeURL(origin, { a: null, c: null })).toBe(
      "https://pixiebrix.com/?b=ORIGINAL",
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

describe("selectAbsoluteUrl", () => {
  it("combines URL", () => {
    expect(
      selectAbsoluteUrl({ url: "/foo", baseURL: "https://example.com" }),
    ).toBe("https://example.com/foo");
  });

  it("handles trailing baseURL slash", () => {
    expect(
      selectAbsoluteUrl({ url: "/foo", baseURL: "https://example.com/" }),
    ).toBe("https://example.com/foo");
  });

  it("handles absolute URL", () => {
    expect(
      selectAbsoluteUrl({
        url: "https://example.com/foo",
        baseURL: "https://example.com/",
      }),
    ).toBe("https://example.com/foo");
  });

  it("throws if URL is not provided", () => {
    expect(() => selectAbsoluteUrl({ baseURL: "https://example.com" })).toThrow(
      new Error("selectAbsoluteUrl: The URL was not provided"),
    );
  });

  it("throws if baseURL is not provided on a relative URL", () => {
    expect(() => selectAbsoluteUrl({ url: "/foo" })).toThrow(
      new Error("selectAbsoluteUrl: The base URL was not provided"),
    );
  });

  it("throws if URL is invalid", () => {
    expect(() =>
      selectAbsoluteUrl({ url: "/path", baseURL: "invalid" }),
    ).toThrow(new Error("Invalid URL: /path (base URL: invalid)"));
  });
});

describe("isUrlRelative", () => {
  it("returns true for relative URLs", () => {
    expect(isUrlRelative("foo")).toBe(true);
    expect(isUrlRelative("/foo")).toBe(true);
    expect(isUrlRelative("./foo")).toBe(true);
    expect(isUrlRelative("../foo")).toBe(true);
  });

  it("returns false for absolute URLs", () => {
    expect(isUrlRelative("https://example.com/foo")).toBe(false);
    expect(isUrlRelative("http://example.com/foo")).toBe(false);
    expect(isUrlRelative("file://example.com/foo")).toBe(false);
    expect(isUrlRelative("//example.com/foo")).toBe(false);
  });
});

describe("isPixieBrixDomain", () => {
  it.each([
    "https://pixiebrix.com",
    "https://docs.pixiebrix.com",
    "https://www.pixiebrix.com",
  ])("returns true for %s", (url) => {
    expect(isPixieBrixDomain(url)).toBe(true);
  });

  it.each([
    "https://example.com",
    "https://www.example.com",
    "https://docs.example.com",
    "https://https://maliciousdomain.com/pixiebrix.com",
    "https://pixiebrix.com.maliciousdomain.com",
    "not a url",
    null,
  ])("returns false for %s", (url) => {
    expect(isPixieBrixDomain(url)).toBe(false);
  });
});
