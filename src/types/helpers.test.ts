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

import { testIsSemVerString, normalizeSemVerString } from "@/types/helpers";

describe("types/helpers.ts", () => {
  describe("testIsSemVerString", () => {
    it.each([
      {
        value: "1.2.3",
        allowLeadingV: false,
        coerce: false,
        expected: true,
      },
      {
        value: "1.2.3",
        allowLeadingV: true,
        coerce: true,
        expected: true,
      },
      { value: "v1.2.3", allowLeadingV: true, coerce: false, expected: true },
      { value: "v1.2.3", allowLeadingV: true, coerce: true, expected: true },
      { value: "v1.2.3", allowLeadingV: false, coerce: false, expected: false },
      {
        value: "1.2.3.4000",
        allowLeadingV: false,
        coerce: false,
        expected: false,
      },
      {
        value: "1.2.3.4000",
        allowLeadingV: false,
        coerce: true,
        expected: true,
      },
      {
        value: "v1.2.3.4000",
        allowLeadingV: true,
        coerce: true,
        expected: true,
      },
      {
        value: "lorem ipsum",
        allowLeadingV: false,
        coerce: false,
        expected: false,
      },
      {
        value: "lorem ipsum",
        allowLeadingV: false,
        coerce: true,
        expected: false,
      },
      {
        value: "",
        allowLeadingV: false,
        coerce: false,
        expected: false,
      },
      {
        value: "",
        allowLeadingV: false,
        coerce: true,
        expected: false,
      },
      {
        value: "vacant",
        allowLeadingV: true,
        coerce: false,
        expected: false,
      },
      {
        value: "vacant",
        allowLeadingV: true,
        coerce: true,
        expected: false,
      },
    ])(
      "$value with allowLeadingV: $allowLeadingV and coerce: $coerce returns $expected",
      ({ value, allowLeadingV, coerce, expected }) => {
        expect(testIsSemVerString(value, { allowLeadingV, coerce })).toBe(
          expected,
        );
      },
    );
  });

  describe("normalizeSemVerString", () => {
    it.each([
      {
        value: "1.2.3",
        allowLeadingV: false,
        coerce: false,
        expected: "1.2.3",
      },
      {
        value: "v1.2.3",
        allowLeadingV: true,
        coerce: false,
        expected: "v1.2.3",
      },
      {
        value: "1.2.3.4000",
        allowLeadingV: false,
        coerce: true,
        expected: "1.2.3",
      },
      {
        value: "v1.2.3.4000",
        allowLeadingV: true,
        coerce: true,
        expected: "v1.2.3",
      },
      {
        value: "0.0.0",
        allowLeadingV: false,
        coerce: false,
        expected: "0.0.0",
      },
    ])(
      "$value with allowLeadingV: $allowLeadingV and coerce: $coerce returns $expected",
      ({ value, allowLeadingV, coerce, expected }) => {
        expect(normalizeSemVerString(value, { allowLeadingV, coerce })).toBe(
          expected,
        );
      },
    );

    it.each([
      {
        value: "v1.2.3",
        allowLeadingV: false,
        coerce: false,
      },
      {
        value: "1.2.3.4000",
        allowLeadingV: false,
        coerce: false,
      },
      {
        value: "v1.2.3.4000",
        allowLeadingV: false,
        coerce: true,
      },
      {
        value: "v1.2.3.4000",
        allowLeadingV: true,
        coerce: false,
      },
      {
        value: "lorem ipsum",
        allowLeadingV: false,
        coerce: false,
      },
      {
        value: "lorem ipsum",
        allowLeadingV: false,
        coerce: true,
      },
      {
        value: "",
        allowLeadingV: false,
        coerce: false,
      },
      {
        value: "",
        allowLeadingV: false,
        coerce: true,
      },
      {
        value: "vacant",
        allowLeadingV: true,
        coerce: false,
      },
      {
        value: "vacant",
        allowLeadingV: true,
        coerce: true,
      },
    ])(
      "$value with allowLeadingV: $allowLeadingV and coerce: $coerce throws an error",
      ({ value, allowLeadingV, coerce }) => {
        expect(() =>
          normalizeSemVerString(value, { allowLeadingV, coerce }),
        ).toThrow();
      },
    );
  });
});
