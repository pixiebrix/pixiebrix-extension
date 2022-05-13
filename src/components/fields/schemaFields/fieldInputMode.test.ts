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

import { inferInputMode } from "@/components/fields/schemaFields/fieldInputMode";

describe("test input mode", () => {
  test("variable expression", () => {
    expect(
      inferInputMode(
        { field: { __type__: "var", __value__: "@foo" } },
        "field",
        {
          type: "string",
        }
      )
    ).toBe("var");
  });

  test("nunjucks expression", () => {
    expect(
      inferInputMode(
        { field: { __type__: "nunjucks", __value__: "{{ foo }}" } },
        "field",
        {
          type: "string",
        }
      )
    ).toBe("string");
  });

  test("number literal", () => {
    expect(
      inferInputMode({ field: 42 }, "field", {
        type: "number",
      })
    ).toBe("number");
  });

  test("string enum", () => {
    expect(
      inferInputMode({ field: "apple" }, "field", {
        type: "string",
        enum: ["apple", "banana"],
      })
    ).toBe("select");
  });
});
