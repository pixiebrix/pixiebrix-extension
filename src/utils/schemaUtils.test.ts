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

import { unionSchemaDefinitionTypes } from "@/utils/schemaUtils";
import { type Schema } from "@/types/schemaTypes";

const fooObjectSchema: Schema = {
  type: "object",
  properties: { foo: { type: "string" } },
};
const barObjectSchema: Schema = {
  type: "object",
  properties: { bar: { type: "string" } },
};

describe("unionSchemaDefinitionTypes", () => {
  it("merges object properties", () => {
    expect(
      unionSchemaDefinitionTypes(fooObjectSchema, barObjectSchema)
    ).toEqual({
      type: "object",
      properties: {
        foo: { type: "string" },
        bar: { type: "string" },
      },
      additionalProperties: false,
      required: [],
    });
  });

  it("handles additionalProperties", () => {
    expect(
      unionSchemaDefinitionTypes(
        { ...fooObjectSchema, additionalProperties: true },
        barObjectSchema
      )
    ).toEqual({
      type: "object",
      properties: {
        foo: { type: "string" },
        bar: { type: "string" },
      },
      additionalProperties: true,
      required: [],
    });
  });

  it("intersects required properties", () => {
    expect(
      unionSchemaDefinitionTypes(
        { ...fooObjectSchema, required: ["foo"] },
        { ...fooObjectSchema, required: ["foo"] }
      )
    ).toEqual({
      type: "object",
      properties: {
        foo: { type: "string" },
      },
      additionalProperties: false,
      required: ["foo"],
    });
  });

  it("intersects required properties excludes mismatch", () => {
    expect(
      unionSchemaDefinitionTypes(
        { ...barObjectSchema, required: ["bar"] },
        { ...fooObjectSchema, required: ["foo"] }
      )
    ).toEqual({
      type: "object",
      properties: {
        foo: { type: "string" },
        bar: { type: "string" },
      },
      additionalProperties: false,
      required: [],
    });
  });

  it("unions types", () => {
    expect(
      unionSchemaDefinitionTypes({ type: "string" }, { type: "number" })
    ).toEqual({
      type: ["string", "number"],
    });
  });

  it("unions type array and string", () => {
    expect(
      unionSchemaDefinitionTypes(
        { type: ["string", "number"] },
        { type: "number" }
      )
    ).toEqual({
      type: ["string", "number"],
    });
  });

  it("handles boolean definition", () => {
    expect(
      unionSchemaDefinitionTypes(fooObjectSchema, {
        type: "object",
        properties: { foo: true },
      })
    ).toEqual({
      type: "object",
      properties: { foo: true },
      additionalProperties: false,
      required: [],
    });
  });
});
