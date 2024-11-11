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
  calculateNextSpacing,
  calculateNextValue,
  extractSpacing,
} from "@/components/fields/schemaFields/widgets/cssClassWidgets/utils";
import { optionsGroups } from "@/components/fields/schemaFields/widgets/cssClassWidgets/CssClassWidget";

describe("calculateNextValue", () => {
  it("should toggle independent flag", () => {
    expect(calculateNextValue("", "font-weight-bold", true)).toBe(
      "font-weight-bold",
    );
    expect(
      calculateNextValue(
        "font-weight-bold font-italic",
        "font-weight-bold",
        false,
      ),
    ).toBe("font-italic");
  });

  it("should toggle flag group", () => {
    expect(
      calculateNextValue(
        "text-left",
        "text-right",
        true,
        optionsGroups.textAlign,
      ),
    ).toBe("text-right");
  });
});

it("should toggle border group", () => {
  expect(
    calculateNextValue("border-left", "border", true, optionsGroups.borders),
  ).toBe("border");
  expect(
    calculateNextValue("border", "border-left", true, optionsGroups.borders),
  ).toBe("border border-left");
  expect(
    calculateNextValue(
      "border border-left",
      "border",
      false,
      optionsGroups.borders,
    ),
  ).toBe("border-left");
});

describe("calculateNextSpacing", () => {
  it("should update size in place", () => {
    expect(calculateNextSpacing("p-n5", "p", { side: null, size: 1 })).toBe(
      "p-1",
    );
  });

  it("should update negative size in place", () => {
    expect(calculateNextSpacing("p-4", "p", { side: null, size: -1 })).toBe(
      "p-n1",
    );
  });

  it("should ignore other classes", () => {
    expect(
      calculateNextSpacing("p-0 text-italic", "p", { side: null, size: 1 }),
    ).toBe("text-italic p-1");
  });

  it("should remove general padding when direction padding is added", () => {
    expect(calculateNextSpacing("p-0", "p", { side: "b", size: 2 })).toBe(
      "pb-2",
    );
  });

  it("should keep direction padding when another direction padding is added", () => {
    expect(calculateNextSpacing("pt-0", "p", { side: "b", size: 2 })).toBe(
      "pt-0 pb-2",
    );
  });

  it("should remove direction padding general padding is added", () => {
    expect(calculateNextSpacing("pt-0", "p", { side: null, size: 2 })).toBe(
      "p-2",
    );
  });

  it("should handle negative values correctly", () => {
    expect(calculateNextSpacing("pt-0", "p", { side: null, size: -2 })).toBe(
      "p-n2",
    );
  });
});

describe("extractSpacing", () => {
  it("should extract spacing", () => {
    expect(
      extractSpacing("p", ["p-1", "z-1", "pq-1", "px-2", "pt-n4"]),
    ).toStrictEqual([
      { side: null, size: 1 },
      { side: "t", size: -4 },
    ]);
  });
});
