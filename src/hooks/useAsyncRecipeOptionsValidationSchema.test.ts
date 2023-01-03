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

import { type Schema } from "@/core";
import { renderHook } from "@testing-library/react-hooks";
import useAsyncRecipeOptionsValidationSchema from "@/hooks/useAsyncRecipeOptionsValidationSchema";
import { waitForEffect } from "@/testUtils/testHelpers";
import { number, object, string } from "yup";

describe("useAsyncRecipeOptionsValidationSchema", () => {
  test("converts a standard schema", async () => {
    const schema = Object.freeze({
      type: "object",
      properties: {
        myString: {
          type: "string",
          title: "Enter text",
          default: "abc",
        },
        myDatabaseField: {
          $ref: "https://app.pixiebrix.com/schemas/database#",
          title: "Pick a database",
        },
        mySelectField: {
          type: "string",
          title: "What's your favorite color?",
          enum: ["red", "blue", "green"],
        },
        myNumberField: {
          type: "number",
        },
      },
    } as Schema);
    const { result } = renderHook(() =>
      useAsyncRecipeOptionsValidationSchema(schema)
    );

    await waitForEffect();

    const [validationSchema] = result.current;

    const expected = object().shape({
      // Even the required field should be converted to nullable(), see comment in useAsyncRecipeOptionsValidationSchema.ts
      myString: string()
        .nullable()
        .required()
        .default("abc")
        .label("Enter text"),
      myDatabaseField: string().nullable().label("Pick a database"),
      mySelectField: string()
        .nullable()
        .label("What's your favorite color?")
        .oneOf(["red", "blue", "green"]),
      myNumberField: number().nullable(),
    });

    expect(validationSchema).toEqual(expected);
  });
});
