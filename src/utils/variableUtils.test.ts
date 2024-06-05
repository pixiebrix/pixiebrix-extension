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

import { type SafeString } from "@/types/stringTypes";
import { freshIdentifier, stripOptionalChaining } from "@/utils/variableUtils";
import { isPixieBrixDomain, isValidUrl } from "@/utils/urlUtils";

test("can generate fresh identifier", () => {
  const root = "field" as SafeString;
  expect(freshIdentifier(root, [])).toBe("field");
  expect(freshIdentifier(root, [], { includeFirstNumber: true })).toBe(
    "field1",
  );
  expect(
    freshIdentifier(root, [], { includeFirstNumber: true, startNumber: 0 }),
  ).toBe("field0");
  expect(freshIdentifier(root, ["field"])).toBe("field2");
  expect(freshIdentifier(root, ["foo", "bar"])).toBe("field");
});

describe("stripOptionalChaining", () => {
  it("strips optional chaining operator", () => {
    expect(stripOptionalChaining("foo?")).toBe("foo");
    // Shouldn't happen in practice because it's not a valid expression, but capturing it anyway
    expect(stripOptionalChaining("f?oo??")).toBe("f?oo");
  });

  it("preserves original values", () => {
    expect(stripOptionalChaining("foo")).toBe("foo");
  });
});

describe("isValidUrl", () => {
  it.each([
    "https://example.com",
    "http://example.com",
    "https://example.com/path",
    "http://example.com/path",
    "https://example.com/path?query=param",
    "http://example.com/path?query=param",
    "https://example.com/path#hash",
    "http://example.com/path#hash",
    "https://example.com/path?query=param#hash",
    "http://example.com/path?query=param#hash",
  ])("returns true for %s", (url) => {
    expect(isValidUrl(url)).toBe(true);
  });

  it.each(["example.com", "www.example.com", "not a url", null])(
    "returns false for %s",
    (url) => {
      expect(isValidUrl(url)).toBe(false);
    },
  );
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
