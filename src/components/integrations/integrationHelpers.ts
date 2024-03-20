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
import { isRequired } from "@/utils/schemaUtils";

export function convertSchemaToConfigState(inputSchema: Schema): UnknownObject {
  const result: UnknownObject = {};
  for (const [key, value] of Object.entries(inputSchema.properties)) {
    if (
      typeof value === "boolean" ||
      value.type === "null" ||
      !isRequired(inputSchema, key)
    ) {
      continue;
    }

    if (value.type === "object") {
      // eslint-disable-next-line security/detect-object-injection -- Schema property keys
      result[key] = convertSchemaToConfigState(value);
    } else {
      if (value.default !== undefined) {
        // eslint-disable-next-line security/detect-object-injection -- Schema property keys
        result[key] = value.default;
        continue;
      }

      switch (value.type) {
        case "boolean": {
          // eslint-disable-next-line security/detect-object-injection -- Schema property keys
          result[key] = false;
          break;
        }

        case "number":
        case "integer": {
          // eslint-disable-next-line security/detect-object-injection -- Schema property keys
          result[key] = 0;
          break;
        }

        case "array": {
          // eslint-disable-next-line security/detect-object-injection -- Schema property keys
          result[key] = [];
          break;
        }

        default: {
          // eslint-disable-next-line security/detect-object-injection -- Schema property keys
          result[key] = "";
          break;
        }
      }
    }
  }

  return result;
}
