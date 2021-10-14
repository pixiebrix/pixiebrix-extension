import {
  MINIMAL_SCHEMA,
  MINIMAL_UI_SCHEMA,
  replaceStringInArray,
  updateRjsfSchemaWithDefaultsIfNeeded,
} from "./formBuilderHelpers";
import { RJSFSchema } from "./formBuilderTypes";
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
