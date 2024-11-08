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
