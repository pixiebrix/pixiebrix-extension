/* eslint-disable max-nested-callbacks -- copied from RJSF test suite */
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
import validator from "./formValidator";
import {
  type ErrorSchema,
  ErrorSchemaBuilder,
  type FormValidation,
  type RJSFSchema,
  type RJSFValidationError,
  type UiSchema,
} from "@rjsf/utils";

describe("FormValidator", () => {
  describe("isValid", () => {
    it("should return true for valid form", () => {
      expect(validator.isValid({ type: "string" }, "test")).toBeTrue();
    });
  });

  describe("rawValidation", () => {
    it("should return no errors for valid value", () => {
      expect(validator.rawValidation({ type: "string" }, "test")).toStrictEqual(
        {
          errors: [],
        },
      );
    });

    it("should return errors for invalid value", () => {
      expect(validator.rawValidation({ type: "string" }, 42)).toStrictEqual({
        errors: [
          {
            error: 'Instance type "number" is invalid. Expected "string".',
            instanceLocation: "#",
            keyword: "type",
            keywordLocation: "#/type",
          },
        ],
      });
    });
  });
});

const illFormedKey = "bar.`'[]()=+*&^%$#@!";

// Copied from https://github.com/rjsf-team/react-jsonschema-form/blob/main/packages/validator-ajv6/test/validator.test.ts
describe("RJSF Tests", () => {
  let builder: ErrorSchemaBuilder;

  beforeAll(() => {
    builder = new ErrorSchemaBuilder();
  });

  afterEach(() => {
    builder.resetAllErrors();
  });

  describe("default options", () => {
    describe("validator.isValid()", () => {
      it("should return true if the data is valid against the schema", () => {
        const schema: RJSFSchema = {
          type: "object",
          properties: {
            foo: { type: "string" },
          },
        };

        expect(validator.isValid(schema, { foo: "bar" })).toBe(true);
      });

      it("should return false if the data is not valid against the schema", () => {
        const schema: RJSFSchema = {
          type: "object",
          properties: {
            foo: { type: "string" },
          },
        };

        expect(validator.isValid(schema, { foo: 12_345 })).toBe(false);
      });

      it("should return false if the schema is invalid", () => {
        const schema: RJSFSchema = "foobarbaz" as unknown as RJSFSchema;

        expect(validator.isValid(schema, { foo: "bar" })).toBe(false);
      });
    });

    describe("validator.toErrorList()", () => {
      it("should return empty list for unspecified errorSchema", () => {
        expect(validator.toErrorList()).toEqual([]);
      });

      it("should convert an errorSchema into a flat list", () => {
        const errorSchema = builder
          .addErrors(["err1", "err2"])
          .addErrors(["err3", "err4"], "a.b")
          .addErrors(["err5"], "c").ErrorSchema;
        expect(validator.toErrorList(errorSchema)).toEqual([
          { property: ".", message: "err1", stack: ". err1" },
          { property: ".", message: "err2", stack: ". err2" },
          { property: ".a.b", message: "err3", stack: ".a.b err3" },
          { property: ".a.b", message: "err4", stack: ".a.b err4" },
          { property: ".c", message: "err5", stack: ".c err5" },
        ]);
      });
    });

    describe("validator.validateFormData()", () => {
      describe("No custom validate function, single value", () => {
        let errors: RJSFValidationError[];
        let errorSchema: ErrorSchema;

        beforeAll(() => {
          const schema: RJSFSchema = {
            type: "object",
            properties: {
              foo: { type: "string" },
              [illFormedKey]: { type: "string" },
            },
          };
          const result = validator.validateFormData(
            { foo: 42, [illFormedKey]: 41 },
            schema,
          );
          errors = result.errors;
          errorSchema = result.errorSchema;
        });

        it("should return an error list", () => {
          expect(errors).toHaveLength(2);
          expect(errors[0]!.message).toBe(
            'Instance type "number" is invalid. Expected "string".',
          );
          expect(errors[1]!.message).toBe(
            'Instance type "number" is invalid. Expected "string".',
          );
        });

        it("should return an errorSchema", () => {
          expect(errorSchema.foo!.__errors).toHaveLength(1);
          expect(errorSchema.foo!.__errors![0]).toBe(
            'Instance type "number" is invalid. Expected "string".',
          );
        });
      });

      describe("Validating multipleOf with a float", () => {
        let errors: RJSFValidationError[];

        beforeAll(() => {
          const schema: RJSFSchema = {
            type: "object",
            properties: {
              price: {
                title: "Price per task ($)",
                type: "number",
                multipleOf: 0.01,
                minimum: 0,
              },
            },
          };
          const result = validator.validateFormData({ price: 0.14 }, schema);
          errors = result.errors;
        });

        it("should not return an error", () => {
          expect(errors).toHaveLength(0);
        });
      });

      describe("Validating multipleOf with a float, with multiple errors", () => {
        let errors: RJSFValidationError[];
        let errorSchema: ErrorSchema;

        beforeAll(() => {
          const schema: RJSFSchema = {
            type: "object",
            properties: {
              price: {
                title: "Price per task ($)",
                type: "number",
                multipleOf: 0.03,
                minimum: 1,
              },
            },
          };
          const result = validator.validateFormData({ price: 0.14 }, schema);
          errors = result.errors;
          errorSchema = result.errorSchema;
        });

        it("should have 2 errors", () => {
          expect(errors).toHaveLength(2);
        });

        it("first error is for minimum", () => {
          expect(errors[0]!.message).toBe("0.14 is less than 1.");
        });

        it("first error is for multipleOf", () => {
          expect(errors[1]!.message).toBe("0.14 is not a multiple of 0.03.");
        });

        it("should return an errorSchema", () => {
          expect(errorSchema.price!.__errors).toHaveLength(2);
          expect(errorSchema.price!.__errors).toEqual([
            "0.14 is less than 1.",
            "0.14 is not a multiple of 0.03.",
          ]);
        });
      });

      describe("Validating required fields", () => {
        let errors: RJSFValidationError[];
        let errorSchema: ErrorSchema;

        describe("formData is not provided at top level", () => {
          beforeAll(() => {
            const schema: RJSFSchema = {
              type: "object",
              required: ["pass1", "pass2"],
              properties: {
                pass1: { type: "string" },
                pass2: { type: "string" },
              },
            };

            const formData = { pass1: "a" };
            const result = validator.validateFormData(formData, schema);
            errors = result.errors;
            errorSchema = result.errorSchema;
          });

          it("should return an error list", () => {
            expect(errors).toHaveLength(1);
            expect(errors[0]!.stack).toBe(
              '#/required Instance does not have required property "pass2".',
            );
          });

          it("should return an errorSchema", () => {
            expect(errorSchema.pass2!.__errors).toHaveLength(1);
            expect(errorSchema.pass2!.__errors![0]).toBe(
              'Instance does not have required property "pass2".',
            );
          });
        });

        describe("formData is not provided for nested child", () => {
          beforeAll(() => {
            const schema: RJSFSchema = {
              type: "object",
              properties: {
                nested: {
                  type: "object",
                  required: ["pass1", "pass2"],
                  properties: {
                    pass1: { type: "string" },
                    pass2: { type: "string" },
                  },
                },
              },
            };

            const formData = { nested: { pass1: "a" } };
            const result = validator.validateFormData(formData, schema);
            errors = result.errors;
            errorSchema = result.errorSchema;
          });

          it("should return an error list", () => {
            expect(errors).toHaveLength(1);
            expect(errors[0]!.stack).toBe(
              '#/properties/nested/required Instance does not have required property "pass2".',
            );
          });

          it("should return an errorSchema", () => {
            expect(errorSchema.nested!.pass2!.__errors).toHaveLength(1);
            expect(errorSchema.nested!.pass2!.__errors![0]).toBe(
              'Instance does not have required property "pass2".',
            );
          });
        });
      });

      describe("No custom validate function, single additionalProperties value", () => {
        let errors: RJSFValidationError[];
        let errorSchema: ErrorSchema;

        beforeAll(() => {
          const schema: RJSFSchema = {
            type: "object",
            additionalProperties: {
              type: "string",
            },
          };
          const result = validator.validateFormData({ foo: 42 }, schema);
          errors = result.errors;
          errorSchema = result.errorSchema;
        });

        it("should return an error list", () => {
          expect(errors).toHaveLength(1);
          expect(errors[0]!.message).toBe(
            'Instance type "number" is invalid. Expected "string".',
          );
        });

        it("should return an errorSchema", () => {
          expect(errorSchema.foo!.__errors).toHaveLength(1);
          expect(errorSchema.foo!.__errors![0]).toBe(
            'Instance type "number" is invalid. Expected "string".',
          );
        });
      });

      describe("TransformErrors", () => {
        let errors: RJSFValidationError[];
        let newErrorMessage: string;
        let transformErrors: jest.Mock;
        let uiSchema: UiSchema;

        beforeAll(() => {
          const schema: RJSFSchema = {
            type: "object",
            properties: {
              foo: { type: "string" },
              [illFormedKey]: { type: "string" },
            },
          };

          uiSchema = {
            foo: { "ui:label": false },
          };

          newErrorMessage = "Better error message";

          transformErrors = jest.fn((errors: RJSFValidationError[]) => [
            { ...errors[0], message: newErrorMessage },
          ]);

          const result = validator.validateFormData(
            { foo: 42, [illFormedKey]: 41 },
            schema,
            undefined,
            transformErrors,
            uiSchema,
          );

          errors = result.errors;
        });

        it("should use transformErrors function", () => {
          expect(errors).not.toHaveLength(0);
          expect(errors[0]!.message).toEqual(newErrorMessage);
        });

        it("transformErrors function was called with uiSchema", () => {
          expect(transformErrors).toHaveBeenCalledWith(
            expect.any(Array),
            uiSchema,
          );
        });
      });

      describe("Custom validate function", () => {
        let errors: RJSFValidationError[];
        let errorSchema: ErrorSchema;
        let validate: jest.Mock;
        let uiSchema: UiSchema;

        beforeAll(() => {
          uiSchema = {
            foo: { "ui:label": false },
          };

          validate = jest.fn((formData: any, errors: FormValidation) => {
            if (formData.pass1 !== formData.pass2) {
              errors.pass2!.addError("passwords don`t match.");
            }

            return errors;
          });
        });

        describe("formData is provided", () => {
          beforeAll(() => {
            const schema: RJSFSchema = {
              type: "object",
              required: ["pass1", "pass2"],
              properties: {
                pass1: { type: "string" },
                pass2: { type: "string" },
                foo: { type: "array", items: { type: "string" } }, // Adding an array for test coverage
              },
            };

            const formData = { pass1: "a", pass2: "b", foo: ["a"] };
            const result = validator.validateFormData(
              formData,
              schema,
              validate,
              undefined,
              uiSchema,
            );
            errors = result.errors;
            errorSchema = result.errorSchema;
          });

          it("should return an error list", () => {
            expect(errors).toHaveLength(1);
            expect(errors[0]!.stack).toBe(".pass2 passwords don`t match.");
          });

          it("should return an errorSchema", () => {
            expect(errorSchema.pass2!.__errors).toHaveLength(1);
            expect(errorSchema.pass2!.__errors![0]).toBe(
              "passwords don`t match.",
            );
          });

          it("validate function was called with uiSchema", () => {
            expect(validate).toHaveBeenCalledWith(
              expect.any(Object),
              expect.any(Object),
              uiSchema,
            );
          });
        });

        describe("formData is missing data", () => {
          beforeAll(() => {
            const schema: RJSFSchema = {
              type: "object",
              properties: {
                pass1: { type: "string" },
                pass2: { type: "string" },
              },
            };
            const formData = { pass1: "a" };
            const result = validator.validateFormData(
              formData,
              schema,
              validate,
            );
            errors = result.errors;
            errorSchema = result.errorSchema;
          });

          it("should return an error list", () => {
            expect(errors).toHaveLength(1);
            expect(errors[0]!.stack).toBe(".pass2 passwords don`t match.");
          });

          it("should return an errorSchema", () => {
            expect(errorSchema.pass2!.__errors).toHaveLength(1);
            expect(errorSchema.pass2!.__errors![0]).toBe(
              "passwords don`t match.",
            );
          });

          it("validate function was called with undefined uiSchema", () => {
            expect(validate).toHaveBeenCalledWith(
              expect.any(Object),
              expect.any(Object),
              undefined,
            );
          });
        });
      });

      describe("Data-Url validation", () => {
        let schema: RJSFSchema;

        beforeAll(() => {
          schema = {
            type: "object",
            properties: {
              dataUrlWithName: { type: "string", format: "data-url" },
              dataUrlWithoutName: { type: "string", format: "data-url" },
            },
          };
        });

        it("Data-Url with name is accepted", () => {
          const formData = {
            dataUrlWithName: "data:text/plain;name=file1.txt;base64,x=",
          };
          const result = validator.validateFormData(formData, schema);
          expect(result.errors).toHaveLength(0);
        });

        it("Data-Url without name is accepted", () => {
          const formData = {
            dataUrlWithoutName: "data:text/plain;base64,x=",
          };
          const result = validator.validateFormData(formData, schema);
          expect(result.errors).toHaveLength(0);
        });
      });

      describe("Invalid schema", () => {
        /* NOTE: Our form builder should produce only valid JSON Schemas
         * We're still testing the behaviors, but @cfworker/json-schema behaves differently from
         * AJV6, so we've adjusted some of the tests to match the new behavior.
         */

        let errors: RJSFValidationError[];
        let errorSchema: ErrorSchema;

        beforeAll(() => {
          const schema: RJSFSchema = {
            type: "object",
            properties: {
              foo: {
                type: "string",
                required: "invalid_type_non_array" as unknown as string[],
              },
            },
          };
          const result = validator.validateFormData({ foo: 42 }, schema);
          errors = result.errors;
          errorSchema = result.errorSchema;
        });

        it("should return an error list", () => {
          expect(errors).toHaveLength(1);
          expect(errors[0]!.name).toBe("type");
          expect(errors[0]!.property).toBe("foo");
          expect(errors[0]!.schemaPath).toBe("#/foo");
          expect(errors[0]!.message).toBe(
            'Instance type "number" is invalid. Expected "string".',
          );
        });

        it("should return an errorSchema", () => {
          expect(errorSchema.foo!.__errors).toHaveLength(1);
          expect(errorSchema.foo!.__errors![0]).toBe(
            'Instance type "number" is invalid. Expected "string".',
          );
        });
      });
    });
  });
});
