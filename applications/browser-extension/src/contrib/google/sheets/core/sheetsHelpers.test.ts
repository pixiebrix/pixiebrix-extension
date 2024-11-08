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

import {
  columnToLetter,
  normalizeHeader,
} from "./sheetsHelpers";

describe("normalizeHeader", () => {
  it("trims whitespace", () => {
    expect(normalizeHeader("  hello  ")).toBe("hello");
  });

  it("lower cases text", () => {
    expect(normalizeHeader("HelLo")).toBe("hello");
  });
});

describe("columnToLetter", () => {
  it("handles single letter", () => {
    expect(columnToLetter(1)).toBe("A");
  });

  it("lower cases text", () => {
    expect(columnToLetter(28)).toBe("AB");
  });
});
