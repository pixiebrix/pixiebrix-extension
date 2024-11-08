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

import { assertNotNullish } from "@/utils/nullishUtils";

describe("nullishUtils", () => {
  describe("assertNotNullish", () => {
    const assertionMessage = "assertion message";

    it("should not throw an error for non-nullish values", () => {
      expect(() => {
        assertNotNullish(0, assertionMessage);
      }).not.toThrow();
      expect(() => {
        assertNotNullish("", assertionMessage);
      }).not.toThrow();
      expect(() => {
        assertNotNullish(false, assertionMessage);
      }).not.toThrow();
      expect(() => {
        assertNotNullish([], assertionMessage);
      }).not.toThrow();
      expect(() => {
        assertNotNullish({}, assertionMessage);
      }).not.toThrow();
    });

    it("should throw an error for null", () => {
      expect(() => {
        assertNotNullish(null, assertionMessage);
      }).toThrow(assertionMessage);
    });

    it("should throw an error for undefined", () => {
      expect(() => {
        assertNotNullish(undefined, assertionMessage);
      }).toThrow(assertionMessage);
    });
  });
});
