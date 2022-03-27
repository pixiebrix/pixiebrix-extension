/*
 * Copyright (C) 2022 PixieBrix, Inc.
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

import { detectShape, normalizeShape } from "@/contrib/google/sheets/append";

describe("Infer shape", () => {
  it("Infer entries shape", () => {
    expect(detectShape([{ header: "Foo", value: "bar" }])).toEqual("entries");
  });

  it("Infer multi shape for additional properties", () => {
    expect(detectShape([{ header: "Foo", value: "bar", other: "42" }])).toEqual(
      "multi"
    );
  });

  it("Infer multi shape", () => {
    expect(detectShape([{ "column A": "Foo" }, { "column A": "Foo" }])).toEqual(
      "multi"
    );
  });

  it("Infer single shape", () => {
    expect(detectShape({ "column A": "Foo", "column B": "Bar" })).toEqual(
      "single"
    );
  });
});

describe("Normalize shape", () => {
  it("Normalize single shape", () => {
    expect(
      normalizeShape("infer", { "column A": "Foo", "column B": "Bar" })
    ).toStrictEqual([
      [
        { header: "column A", value: "Foo" },
        { header: "column B", value: "Bar" },
      ],
    ]);
  });

  it("Normalize entries shape", () => {
    expect(
      normalizeShape("infer", [{ header: "Foo", value: "bar" }])
    ).toStrictEqual([[{ header: "Foo", value: "bar" }]]);
  });

  it("Normalize multi shape", () => {
    expect(
      normalizeShape("infer", [{ "column A": "Foo", "column B": "Bar" }])
    ).toStrictEqual([
      [
        { header: "column A", value: "Foo" },
        { header: "column B", value: "Bar" },
      ],
    ]);
  });
});
