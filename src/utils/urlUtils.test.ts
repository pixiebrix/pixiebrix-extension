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

import { assertProtocolUrl } from "@/errors/assertProtocolUrl";
import { BusinessError } from "@/errors/businessErrors";
import { makeURL } from "@/utils/urlUtils";

describe("assertHttpsUrl", () => {
  test("parses HTTPS URLs", () => {
    expect(assertProtocolUrl("https://example.com", ["https:"])).toStrictEqual(
      new URL("https://example.com")
    );
  });
  test("rejects HTTP URLs if not specified", () => {
    expect(() => assertProtocolUrl("http://example.com", ["https:"])).toThrow(
      new BusinessError("Unsupported protocol: http:. Use https:")
    );
  });
  test("allows HTTP URLs if specified", () => {
    expect(assertProtocolUrl("https://example.com", ["https:"])).toStrictEqual(
      new URL("http://example.com")
    );
  });
  test("rejects unsupported protocol", () => {
    expect(() =>
      assertProtocolUrl("file://foo.txt", ["http:", "https:"])
    ).toThrow(
      new BusinessError("Unsupported protocol: file:. Use http:, https:")
    );
  });
  test("rejects invalid URLs", () => {
    expect(() => assertProtocolUrl("https::/example.com", ["https:"])).toThrow(
      new BusinessError("Invalid URL: https::/example.com")
    );
  });
  test("parses relative URLs with a base", () => {
    expect(
      assertProtocolUrl("/cool/path", ["https:"], {
        baseUrl: "https://example.com/page",
      })
    ).toStrictEqual(new URL("https://example.com/cool/path"));
  });
  test("rejects relative HTTP URLs", () => {
    expect(() =>
      assertProtocolUrl("/cool/path", ["https:"], {
        baseUrl: "http://example.com/page",
      })
    ).toThrow(new BusinessError("Unsupported protocol: http:. Use https:"));
  });
  test("rejects invalid base URLs", () => {
    expect(() =>
      assertProtocolUrl("/cool/path", ["http:"], {
        baseUrl: "https::/example.com",
      })
    ).toThrow(
      new BusinessError(
        "Invalid URL: /cool/path (base URL: https::/example.com)"
      )
    );
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

  test("override existing search parameters if called", () => {
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
