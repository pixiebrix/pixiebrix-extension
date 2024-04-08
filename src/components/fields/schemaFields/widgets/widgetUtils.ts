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

import { type Schema } from "@/types/schemaTypes";
import { isEmpty } from "lodash";

/**
 * Return true if the schema allows user to provide custom properties.
 */
export function isCustomizableObjectSchema(objectSchema: Schema): boolean {
  // Allow additional properties for empty schema (empty schema allows shape)
  if (isEmpty(objectSchema)) {
    return true;
  }

  return (
    "additionalProperties" in objectSchema &&
    objectSchema.additionalProperties !== false
  );
}
