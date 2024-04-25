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

import { testIsSemVerString, validateSemVerString } from "@/types/helpers";

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
        value: "1.2.3.4",
        allowLeadingV: false,
        coerce: false,
        expected: false,
      },
      {
        value: "1.2.3.4",
        allowLeadingV: false,
        coerce: true,
        expected: true,
      },
      {
        value: "v1.2.3.4",
        allowLeadingV: true,
        coerce: true,
        expected: true,
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

  describe("validateSemVerString", () => {
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
        value: "1.2.3.4",
        allowLeadingV: false,
        coerce: true,
        expected: "1.2.3",
      },
      {
        value: "v1.2.3.4",
        allowLeadingV: true,
        coerce: true,
        expected: "v1.2.3",
      },
    ])(
      "$value with allowLeadingV: $allowLeadingV and coerce: $coerce returns $expected",
      ({ value, allowLeadingV, coerce, expected }) => {
        expect(validateSemVerString(value, { allowLeadingV, coerce })).toBe(
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
        value: "1.2.3.4",
        allowLeadingV: false,
        coerce: false,
      },
      {
        value: "v1.2.3.4",
        allowLeadingV: false,
        coerce: true,
      },
      {
        value: "v1.2.3.4",
        allowLeadingV: true,
        coerce: false,
      },
    ])(
      "$value with allowLeadingV: $allowLeadingV and coerce: $coerce throws an error",
      ({ value, allowLeadingV, coerce }) => {
        expect(() =>
          validateSemVerString(value, { allowLeadingV, coerce }),
        ).toThrow();
      },
    );
  });
});
