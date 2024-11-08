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

import { type OutputUnit, type Schema, Validator } from "@cfworker/json-schema";
import draft07 from "../../schemas/draft-07.json";

import {
  createErrorHandler,
  type CustomValidator,
  type ErrorSchema,
  type ErrorTransformer,
  type FormContextType,
  getDefaultFormState,
  type RJSFSchema,
  type RJSFValidationError,
  type StrictRJSFSchema,
  toErrorList,
  toErrorSchema,
  type UiSchema,
  unwrapErrorHandler,
  type ValidationData,
  validationDataMerge,
  type ValidatorType,
  withIdRefPrefix,
  type GenericObjectType,
} from "@rjsf/utils";
import { getErrorMessage } from "../errors/errorHelpers";
import { assertNotNullish } from "../utils/nullishUtils";

/**
 * A RJSF FormValidator that uses @cfworker/json-schema for validation that works in contexts that disallow
 * eval and new Function.
 *
 * https://rjsf-team.github.io/react-jsonschema-form/docs/usage/validation
 * https://github.com/rjsf-team/react-jsonschema-form/blob/main/packages/utils/src/types.ts#L939
 */

const REQUIRED_PROPERTY_NAME_REGEX =
  /Instance does not have required property "(.*?)"/;
const HASH_OR_HASH_SLASH_REGEX = /^#\/?/;

class FormValidator<
  T,
  S extends StrictRJSFSchema,
  F extends FormContextType = GenericObjectType,
> implements ValidatorType<T, S, F>
{
  // eslint-disable-next-line max-params -- matching interface
  validateFormData(
    formData: T | undefined,
    schema: S,
    customValidate?: CustomValidator<T, S, F>,
    transformErrors?: ErrorTransformer<T, S, F>,
    uiSchema?: UiSchema<T, S, F>,
  ): ValidationData<unknown> {
    const rootSchema = schema;

    const rawErrors = this.rawValidation<OutputUnit>(schema, formData);

    const { validationError } = rawErrors;
    let errors = this.transformRJSFValidationErrors(rawErrors.errors);

    // Remaining logic is copied from AJV6 validator and adapted to our code style
    // https://github.com/rjsf-team/react-jsonschema-form/blob/main/packages/validator-ajv6/src/validator.ts#L126

    const noProperMetaSchema = validationError?.message?.includes(
      "no schema with key or ref ",
    );

    if (noProperMetaSchema) {
      assertNotNullish(validationError, "logic error");
      errors = [...errors, { stack: validationError.message }];
    }

    if (typeof transformErrors === "function") {
      errors = transformErrors(errors, uiSchema);
    }

    let errorSchema = toErrorSchema<T>(errors);

    if (noProperMetaSchema) {
      assertNotNullish(validationError, "logic error");

      errorSchema = {
        ...errorSchema,
        $schema: {
          __errors: [validationError.message],
        },
      };
    }

    if (typeof customValidate !== "function") {
      return { errors, errorSchema };
    }

    // Include form data with undefined values, which is required for custom validation.
    const newFormData = getDefaultFormState<T, S, F>(
      this,
      schema,
      formData,
      rootSchema,
      true,
    ) as T;

    const errorHandler = customValidate(
      newFormData,
      createErrorHandler<T>(newFormData),
      uiSchema,
    );
    const userErrorSchema = unwrapErrorHandler<T>(errorHandler);
    return validationDataMerge<T>({ errors, errorSchema }, userErrorSchema);
  }

  private transformRJSFValidationErrors(
    errors: OutputUnit[] = [],
  ): RJSFValidationError[] {
    return errors
      .filter(
        (error) =>
          error.instanceLocation !== "#" || error.keyword === "required",
      )
      .map((outputUnit) => {
        const { keyword, keywordLocation, instanceLocation, error } =
          outputUnit;

        let property = "";

        switch (keyword) {
          case "required": {
            const matches = REQUIRED_PROPERTY_NAME_REGEX.exec(error);

            property = `${instanceLocation.replace(
              HASH_OR_HASH_SLASH_REGEX,
              "",
            )}.${matches?.[1] ?? ""}`;
            break;
          }

          case "type": {
            property = instanceLocation.replace(HASH_OR_HASH_SLASH_REGEX, "");
            break;
          }

          default: {
            property = keywordLocation
              .replace("#/properties/", "")
              .replace(`/${keyword}`, "");
          }
        }

        // Put data in expected format
        return {
          name: keyword,
          property,
          message: error,
          stack: `${keywordLocation} ${error}`.trim(),
          schemaPath: instanceLocation,
        };
      });
  }

  private isValidSchema(schema: unknown): schema is RJSFSchema {
    const validator = new Validator(draft07 as Schema);

    try {
      const result = validator.validate(schema);
      return result.valid;
    } catch {
      return false;
    }
  }

  isValid(schema: S, formData: T | undefined): boolean {
    if (!this.isValidSchema(schema)) {
      return false;
    }

    const validator = new Validator(
      withIdRefPrefix(schema) as Schema,
      // The default used by RJSF: https://rjsf-team.github.io/react-jsonschema-form/docs/usage/validation/#custom-meta-schema-validation
      "7",
      true,
    );

    const result = validator.validate(formData);
    return result.valid;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- match signature of interface
  rawValidation<Result = any>(
    schema: S,
    formData?: T,
  ): { errors?: Result[]; validationError?: Error } {
    try {
      // Return all errors so they can be displayed in the form
      const validator = new Validator(schema as Schema, "7", false);
      const result = validator.validate(formData);

      return {
        // Match casting behavior of AJV6 validator
        // https://github.com/rjsf-team/react-jsonschema-form/blob/main/packages/validator-ajv6/src/validator.ts#L99
        errors: result.errors as unknown as Result[],
      };
    } catch (error) {
      if (error instanceof Error) {
        return { validationError: error };
      }

      return { validationError: new Error(getErrorMessage(error)) };
    }
  }

  toErrorList(errorSchema?: ErrorSchema<T>, fieldPath: string[] = []) {
    return toErrorList<T>(errorSchema, fieldPath);
  }
}

// eslint-disable-next-line local-rules/persistBackgroundData -- OK to reinit on load
const validator = new FormValidator();

export default validator;
