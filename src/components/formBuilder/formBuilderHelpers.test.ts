/*
 * Copyright (C) 2021 PixieBrix, Inc.
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
  MINIMAL_SCHEMA,
  MINIMAL_UI_SCHEMA,
  produceSchemaOnPropertyNameChange,
  replaceStringInArray,
  updateRjsfSchemaWithDefaultsIfNeeded,
} from "./formBuilderHelpers";
import { RJSFSchema } from "./formBuilderTypes";
import { initRenamingCases } from "./formEditor.testCases";
import { UI_ORDER } from "./schemaFieldNames";

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

describe("updateRjsfSchemaWithDefaultsIfNeeded", () => {
  test("accepts the minimal schema", () => {
    const rjsfSchema: RJSFSchema = {
      schema: MINIMAL_SCHEMA,
      uiSchema: MINIMAL_UI_SCHEMA,
    };

    const nextRjsfSchema = updateRjsfSchemaWithDefaultsIfNeeded(rjsfSchema);
    expect(nextRjsfSchema).toBeNull();
  });

  test("init schema and ui schema", () => {
    const nextRjsfSchema = updateRjsfSchemaWithDefaultsIfNeeded(
      {} as RJSFSchema
    );
    expect(nextRjsfSchema.schema).toEqual(MINIMAL_SCHEMA);
    expect(nextRjsfSchema.uiSchema).toEqual(MINIMAL_UI_SCHEMA);
  });

  test("accepts the schema it created", () => {
    const rjsfSchema = updateRjsfSchemaWithDefaultsIfNeeded({} as RJSFSchema);
    const nextRjsfSchema = updateRjsfSchemaWithDefaultsIfNeeded(rjsfSchema);
    expect(nextRjsfSchema).toBeNull();
  });

  test("init ui order", () => {
    const rjsfSchema: RJSFSchema = {
      schema: MINIMAL_SCHEMA,
      uiSchema: {},
    };

    const nextRjsfSchema = updateRjsfSchemaWithDefaultsIfNeeded(rjsfSchema);
    // eslint-disable-next-line security/detect-object-injection
    expect(nextRjsfSchema.uiSchema[UI_ORDER]).toEqual(["*"]);
  });

  test.each([null, false, true, "firstName"])(
    "fixes required field when it's %s",
    (requiredFieldValue: any) => {
      const rjsfSchema: RJSFSchema = {
        schema: {
          ...MINIMAL_SCHEMA,
          required: requiredFieldValue,
        },
        uiSchema: MINIMAL_UI_SCHEMA,
      };

      const nextRjsfSchema = updateRjsfSchemaWithDefaultsIfNeeded(rjsfSchema);
      expect(nextRjsfSchema.schema.required).toEqual([]);
    }
  );
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
