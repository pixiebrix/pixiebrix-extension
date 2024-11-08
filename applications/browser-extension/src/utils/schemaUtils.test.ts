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
  inputProperties,
  propertiesToSchema,
  unionSchemaDefinitionTypes,
} from "./schemaUtils";
import type { Schema, SchemaProperties } from "@/types/schemaTypes";

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
      unionSchemaDefinitionTypes(fooObjectSchema, barObjectSchema),
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
        barObjectSchema,
      ),
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
        { ...fooObjectSchema, required: ["foo"] },
      ),
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
        { ...fooObjectSchema, required: ["foo"] },
      ),
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
      unionSchemaDefinitionTypes({ type: "string" }, { type: "number" }),
    ).toEqual({
      type: ["string", "number"],
    });
  });

  it("unions type array and string", () => {
    expect(
      unionSchemaDefinitionTypes(
        { type: ["string", "number"] },
        { type: "number" },
      ),
    ).toEqual({
      type: ["string", "number"],
    });
  });

  it("handles boolean definition", () => {
    expect(
      unionSchemaDefinitionTypes(fooObjectSchema, {
        type: "object",
        properties: { foo: true },
      }),
    ).toEqual({
      type: "object",
      properties: { foo: true },
      additionalProperties: false,
      required: [],
    });
  });

  it("handles object and primitive", () => {
    expect(
      unionSchemaDefinitionTypes(fooObjectSchema, {
        type: "number",
      }),
    ).toEqual({
      anyOf: [fooObjectSchema, { type: "number" }],
    });
  });
});

describe("inputProperties", () => {
  it("returns empty object for null", () => {
    expect(inputProperties(null as any)).toStrictEqual({});
  });

  it("returns properties if present", () => {
    expect(inputProperties(fooObjectSchema)).toStrictEqual(
      fooObjectSchema.properties,
    );
  });

  it("returns properties if type: object", () => {
    expect(inputProperties({ type: "object" })).toStrictEqual({});
  });

  it("returns argument if no properties", () => {
    // Legacy behavior handling brick
    expect(inputProperties({ foo: 42 } as any)).toStrictEqual({ foo: 42 });
  });

  it("round trips with propertiesToSchema", () => {
    const original: SchemaProperties = { foo: { type: "string" } };
    expect(inputProperties(propertiesToSchema(original, []))).toStrictEqual(
      original,
    );
  });
});

describe("propertiesToSchema", () => {
  it("passes through required fields", () => {
    // No additionalProperties property is added
    expect(propertiesToSchema({ foo: { type: "string" } }, ["foo"])).toEqual({
      type: "object",
      $schema: "https://json-schema.org/draft/2019-09/schema#",
      properties: { foo: { type: "string" } },
      required: ["foo"],
    });
  });
});
