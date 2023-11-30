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
  assertNonNullish,
  isNonNullish,
  isNullish,
} from "@/utils/nullishUtils";

describe("nullishUtils", () => {
  describe("isNullish", () => {
    it("should return true for null", () => {
      expect(isNullish(null)).toBe(true);
    });

    it("should return true for undefined", () => {
      expect(isNullish(undefined)).toBe(true);
    });

    it("should return false for non-nullish values", () => {
      expect(isNullish(0)).toBe(false);
      expect(isNullish("")).toBe(false);
      expect(isNullish(false)).toBe(false);
      expect(isNullish([])).toBe(false);
      expect(isNullish({})).toBe(false);
    });
  });

  describe("isNonNullish", () => {
    it("should return false for null", () => {
      expect(isNonNullish(null)).toBe(false);
    });

    it("should return false for undefined", () => {
      expect(isNonNullish(undefined)).toBe(false);
    });

    it("should return true for non-nullish values", () => {
      expect(isNonNullish(0)).toBe(true);
      expect(isNonNullish("")).toBe(true);
      expect(isNonNullish(false)).toBe(true);
      expect(isNonNullish([])).toBe(true);
      expect(isNonNullish({})).toBe(true);
    });
  });

  describe("assertNonNullish", () => {
    const assertionMessage = "assertion message";

    it("should not throw an error for non-nullish values", () => {
      expect(() => {
        assertNonNullish(0, assertionMessage);
      }).not.toThrow();
      expect(() => {
        assertNonNullish("", assertionMessage);
      }).not.toThrow();
      expect(() => {
        assertNonNullish(false, assertionMessage);
      }).not.toThrow();
      expect(() => {
        assertNonNullish([], assertionMessage);
      }).not.toThrow();
      expect(() => {
        assertNonNullish({}, assertionMessage);
      }).not.toThrow();
    });

    it("should throw an error for null", () => {
      expect(() => {
        assertNonNullish(null, assertionMessage);
      }).toThrow(assertionMessage);
    });

    it("should throw an error for undefined", () => {
      expect(() => {
        assertNonNullish(undefined, assertionMessage);
      }).toThrow(assertionMessage);
    });
  });
});
