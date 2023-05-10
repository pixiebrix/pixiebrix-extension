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
import { dereference } from "@/validators/generic";
import { cloneDeep, isEmpty, mapValues } from "lodash";
import { type Schema } from "@/types/schemaTypes";
import { buildYup } from "schema-to-yup";
import useAsyncState from "@/hooks/useAsyncState";
import { type FetchableAsyncState } from "@/types/sliceTypes";

function isEmptySchema(schema: Schema | undefined) {
  return (
    isEmpty(schema) ||
    (schema.type === "object" && isEmpty(schema.properties)) ||
    (schema.type === "array" && isEmpty(schema.items))
  );
}

const useAsyncRecipeOptionsValidationSchema = (
  optionsDefinitionSchema: Schema | undefined
): FetchableAsyncState<AnyObjectSchema> =>
  useAsyncState(async () => {
    if (isEmptySchema(optionsDefinitionSchema)) {
      return object().shape({});
    }

    // Sometimes this schema comes in as a non-extensible object for some
    // reason, so we need to clone it to make sure dereference() can add
    // fields to the object
    const dereferencedSchema = await dereference(
      cloneDeep(optionsDefinitionSchema)
    );
    const yupSchema = buildYup(dereferencedSchema);
    // Yup will produce an ugly "null is not type of x" validation error instead of an
    // "this field is required" error unless we allow null values for required fields
    // @see FieldTemplate.tsx for context as to why fields are null instead of undefined
    return yupSchema.shape(
      mapValues(yupSchema.fields, (value) => value.nullable())
    );
  }, [optionsDefinitionSchema]);

export default useAsyncRecipeOptionsValidationSchema;
