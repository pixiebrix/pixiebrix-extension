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

import { joinName } from "./formUtils";

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

  test("accepts null base path part", () => {
    expect(joinName(null, "foo")).toBe("foo");
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
