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

import { inferInputMode } from "./fieldInputMode";
import googleSheetIdSchema from "../../../../schemas/googleSheetId.json";
import { toExpression } from "../../../utils/expressionUtils";

describe("test input mode", () => {
  test("variable expression", () => {
    expect(
      inferInputMode({ field: toExpression("var", "@foo") }, "field", {
        type: "string",
      }),
    ).toBe("var");
  });

  test("nunjucks expression", () => {
    expect(
      inferInputMode(
        { field: toExpression("nunjucks", "{{ foo }}") },
        "field",
        {
          type: "string",
        },
      ),
    ).toBe("string");
  });

  test("number literal", () => {
    expect(
      inferInputMode({ field: 42 }, "field", {
        type: "number",
      }),
    ).toBe("number");
  });

  test("string enum", () => {
    expect(
      inferInputMode({ field: "apple" }, "field", {
        type: "string",
        enum: ["apple", "banana"],
      }),
    ).toBe("select");
  });

  test("labelled enum", () => {
    expect(
      inferInputMode({ field: "apple" }, "field", {
        type: "string",
        oneOf: [
          { const: "apple", title: "Apple" },
          { const: "banana", title: "Banana" },
        ],
      }),
    ).toBe("select");
  });

  test("not-required, undefined value, infers omit", () => {
    expect(
      inferInputMode(
        { field: undefined },
        "field",
        {
          $ref: googleSheetIdSchema.$id,
        },
        { isRequired: false },
      ),
    ).toBe("omit");
  });

  test("not-required, null ref value, infers string", () => {
    expect(
      inferInputMode(
        { field: null },
        "field",
        {
          $ref: googleSheetIdSchema.$id,
        },
        { isRequired: false },
      ),
    ).toBe("string");
  });
});
