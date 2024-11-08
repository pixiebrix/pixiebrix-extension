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

import { type AnyObjectSchema, object } from "yup";
import { dereferenceForYup } from "../validators/schemaValidator";
import { isEmpty, mapValues } from "lodash";
import { type Schema } from "@/types/schemaTypes";
import { buildYup } from "schema-to-yup";
import useAsyncState from "./useAsyncState";
import { type FetchableAsyncState } from "@/types/sliceTypes";

function isEmptySchema(schema: Schema | undefined): boolean {
  return (
    isEmpty(schema) ||
    (schema.type === "object" && isEmpty(schema.properties)) ||
    (schema.type === "array" && isEmpty(schema.items))
  );
}

export async function getOptionsValidationSchema(
  optionsDefinitionSchema: Schema | undefined,
): Promise<AnyObjectSchema> {
  if (
    optionsDefinitionSchema == null ||
    isEmptySchema(optionsDefinitionSchema)
  ) {
    return object().shape({});
  }

  // Dereference because buildYup doesn't support $ref:
  // https://github.com/kristianmandrup/schema-to-yup?tab=readme-ov-file#refs
  // NOTE: sometimes this schema comes in as a non-extensible object. Dereference clones the object for us.
  const dereferencedSchema = await dereferenceForYup(optionsDefinitionSchema, {
    // Include secrets (if any), so they can be validated. As of 1.8.10, there's no "secret" mod input type
    // exposed via the Page Editor, though.
    sanitizeIntegrationDefinitions: false,
  });

  const yupSchema = buildYup(dereferencedSchema);
  // Yup will produce an ugly "null is not type of x" validation error instead of an
  // "this field is required" error unless we allow null values for required fields
  // @see FieldTemplate.tsx for context as to why fields are null instead of undefined
  return yupSchema.shape(
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access -- TODO
    mapValues(yupSchema.fields, (value) => value.nullable()),
  );
}

const useAsyncModOptionsValidationSchema = (
  optionsDefinitionSchema: Schema | undefined,
): FetchableAsyncState<AnyObjectSchema> =>
  useAsyncState(
    async () => getOptionsValidationSchema(optionsDefinitionSchema),
    [optionsDefinitionSchema],
  );

export default useAsyncModOptionsValidationSchema;
