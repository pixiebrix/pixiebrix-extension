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

import { KEYS_OF_UI_SCHEMA, Schema } from "@/core";
import { produce } from "immer";
import {
  DEFAULT_FIELD_TYPE,
  getMinimalSchema,
  getMinimalUiSchema,
  normalizeSchema,
  getNormalizedUiOrder,
  produceSchemaOnPropertyNameChange,
  produceSchemaOnUiTypeChange,
  replaceStringInArray,
  stringifyUiType,
  validateNextPropertyName,
} from "./formBuilderHelpers";
import { RJSFSchema } from "./formBuilderTypes";
import { initRenamingCases } from "./formEditor.testCases";
import { UI_WIDGET } from "./schemaFieldNames";

describe("replaceStringInArray", () => {
  let array: string[];
  beforeEach(() => {
    array = ["word1", "word2", "word3"];
  });

  test("does not mutate the source array", () => {
    const refToTheInitialArray = array;
    const copyOfInitialArray = [...array];
    replaceStringInArray(array, array[1]);
    expect(array).toBe(refToTheInitialArray);
    expect(array).toEqual(copyOfInitialArray);
  });

  test("can delete a string", () => {
    const expected = [array[0], array[2]];
    expect(replaceStringInArray(array, array[1])).toEqual(expected);
  });

  test("can replace a string", () => {
    const stringToInsert = "insert";
    const expected = [array[0], stringToInsert, array[2]];
    expect(replaceStringInArray(array, array[1], stringToInsert)).toEqual(
      expected
    );
  });

  test("returns the same array when string is not found", () => {
    expect(replaceStringInArray(array, "anotherWord1", "anotherWord2")).toEqual(
      array
    );
  });
});

describe("produceSchemaOnPropertyNameChange", () => {
  test.each(initRenamingCases())(
    "renaming a field",
    (initialSchema, expectedSchema) => {
      const fieldName = "fieldToBeRenamed";
      const newFieldName = "newFieldName";

      const actualSchema = produceSchemaOnPropertyNameChange(
        initialSchema,
        fieldName,
        newFieldName
      );

      expect(actualSchema).toEqual(expectedSchema);
    }
  );
});

describe("validateNextPropertyName", () => {
  const schema: Schema = {
    ...getMinimalSchema(),
    properties: {
      field1: {
        title: "Field 1",
        type: DEFAULT_FIELD_TYPE,
      },
      field2: {
        title: "Field 2",
        type: DEFAULT_FIELD_TYPE,
      },
    },
  };

  test("Accept same name.", () => {
    const name = "field1";
    const actual = validateNextPropertyName(schema, name, name);
    expect(actual).toBeNull();
  });

  test("Don't accept empty name.", () => {
    const actual = validateNextPropertyName(schema, "field1", "");
    expect(actual).toBe("Name cannot be empty.");
  });

  test("Don't accept periods.", () => {
    const actual = validateNextPropertyName(schema, "field1", "field.1");
    expect(actual).toBe("Name must not contain periods.");
  });

  test("Don't accept duplicates.", () => {
    const actual = validateNextPropertyName(schema, "field1", "field2");
    expect(actual).toBe(
      'Name must be unique. Another property "Field 2" already has the name "field2".'
    );
  });

  test.each([
    "constructor",
    "__proto__",
    "__defineGetter__",
    ...KEYS_OF_UI_SCHEMA,
  ])("Don't allow special names [%s]", (nextPropertyName) => {
    const actual = validateNextPropertyName(schema, "field1", nextPropertyName);
    expect(actual).toBe("Such property name is forbidden.");
  });
});

describe("normalizeSchema", () => {
  test("init schema", () => {
    const schema: Schema = undefined;

    const actual = produce(
      {
        schema,
        uiSchema: getMinimalUiSchema(),
      } as RJSFSchema,
      (draft) => {
        normalizeSchema(draft);
      }
    );

    expect(actual.schema).toStrictEqual({
      type: "object",
      properties: {},
    });
  });

  test("add properties", () => {
    const schema: Schema = {
      type: "object",
    };

    const actual = produce(
      {
        schema,
        uiSchema: getMinimalUiSchema(),
      } as RJSFSchema,
      (draft) => {
        normalizeSchema(draft);
      }
    );

    expect(actual.schema).toStrictEqual({
      type: "object",
      properties: {},
    });
  });

  test("fix required", () => {
    const schema: Schema = {
      type: "object",
      properties: {
        foo: {
          type: "string",
        },
      },
      required: null,
    };

    const actual = produce(
      {
        schema,
        uiSchema: getMinimalUiSchema(),
      } as RJSFSchema,
      (draft) => {
        normalizeSchema(draft);
      }
    );

    expect(actual.schema).toStrictEqual({
      type: "object",
      properties: {
        foo: {
          type: "string",
        },
      },
      required: [],
    });
  });
});

describe("normalizeUiOrder", () => {
  test("init uiOrder", () => {
    const actual = getNormalizedUiOrder(["propA", "propB"], []);
    expect(actual).toEqual(["propA", "propB", "*"]);
  });

  test("adds * at the end", () => {
    const actual = getNormalizedUiOrder(["propA", "propB"], ["propA", "propB"]);
    expect(actual).toEqual(["propA", "propB", "*"]);
  });

  test("adds a missing property", () => {
    const actual = getNormalizedUiOrder(["propA", "propB"], ["propB", "*"]);
    expect(actual).toEqual(["propB", "propA", "*"]);
  });

  test("normalize the position of *", () => {
    const actual = getNormalizedUiOrder(
      ["propA", "propB"],
      ["propA", "*", "propB"]
    );
    expect(actual).toEqual(["propA", "propB", "*"]);
  });

  test("removes missing props", () => {
    const actual = getNormalizedUiOrder(
      ["propA", "propC"],
      ["propA", "propB", "propC", "*"]
    );
    expect(actual).toEqual(["propA", "propC", "*"]);
  });
});

describe("produceSchemaOnUiTypeChange", () => {
  test("converts Dropdown to Dropdown with labels", () => {
    const schema: RJSFSchema = {
      schema: {
        ...getMinimalSchema(),
        properties: {
          field1: {
            title: "Field 1",
            type: "string",
            enum: ["foo", "bar", "baz"],
          },
        },
      },
      uiSchema: {
        ...getMinimalUiSchema(),
        field1: {
          [UI_WIDGET]: "select",
        },
      },
    };

    const nextSchema = produceSchemaOnUiTypeChange(
      schema,
      "field1",
      stringifyUiType({
        propertyType: "string",
        uiWidget: "select",
        extra: "selectWithLabels",
      })
    );

    expect(
      (nextSchema.schema.properties.field1 as Schema).enum
    ).toBeUndefined();
    expect((nextSchema.schema.properties.field1 as Schema).oneOf).toEqual([
      {
        const: "foo",
      },
      {
        const: "bar",
      },
      {
        const: "baz",
      },
    ]);
  });

  test("converts Dropdown with labels to Dropdown", () => {
    const schema: RJSFSchema = {
      schema: {
        ...getMinimalSchema(),
        properties: {
          field1: {
            title: "Field 1",
            type: "string",
            oneOf: [
              {
                const: "foo",
                title: "Foo",
              },
              {
                const: "bar",
                title: "Bar",
              },
              {
                const: "baz",
                title: "Baz",
              },
            ],
          },
        },
      },
      uiSchema: {
        ...getMinimalUiSchema(),
        field1: {
          [UI_WIDGET]: "select",
        },
      },
    };

    const nextSchema = produceSchemaOnUiTypeChange(
      schema,
      "field1",
      stringifyUiType({
        propertyType: "string",
        uiWidget: "select",
      })
    );

    expect(
      (nextSchema.schema.properties.field1 as Schema).oneOf
    ).toBeUndefined();
    expect((nextSchema.schema.properties.field1 as Schema).enum).toEqual([
      "foo",
      "bar",
      "baz",
    ]);
  });
});
