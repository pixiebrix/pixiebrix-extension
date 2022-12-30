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

import { object } from "yup";
import { dereference } from "@/validators/generic";
import { cloneDeep, mapValues } from "lodash";
import { type Schema } from "@/core";
import { buildYup } from "schema-to-yup";
import { useAsyncState } from "@/hooks/common";

const useAsyncRecipeOptionsValidationSchema = (
  optionsDefinitionSchema: Schema | undefined
) =>
  useAsyncState(async () => {
    if (!optionsDefinitionSchema) {
      return object().shape({});
    }

    // Clone the schema here to make sure it's extensible so properties can be added
    const dereferenced = await dereference(cloneDeep(optionsDefinitionSchema));
    const schemaWithNullableRequiredFields = {
      ...dereferenced,
      properties: mapValues(
        dereferenced.properties,
        (schema: Schema, name: string) =>
          optionsDefinitionSchema.required?.includes(name)
            ? {
                ...schema,
                // Yup will produce an ugly "null is not type of x" validation error instead of a
                // "this field is required" error unless we allow null values for required fields
                // @see FieldTemplate.tsx for context as to why fields are null instead of undefined
                nullable: true,
              }
            : schema
      ),
    };

    return buildYup(schemaWithNullableRequiredFields, {});
  }, [optionsDefinitionSchema]);

export default useAsyncRecipeOptionsValidationSchema;
