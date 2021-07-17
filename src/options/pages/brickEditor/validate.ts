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

import yaml from "js-yaml";
import { KIND_SCHEMAS, validateKind } from "@/validators/generic";
import { ValidationResult } from "@cfworker/json-schema";

interface PartialSchema {
  kind?: string;
}

export async function validateSchema(value: string): Promise<any> {
  if (!value) {
    return {
      config: "A definition is required",
    };
  }

  let json: PartialSchema;

  try {
    json = yaml.load(value) as PartialSchema;
  } catch (error: unknown) {
    return {
      config: [`Invalid YAML: ${error}`],
    };
  }

  if (!Object.prototype.hasOwnProperty.call(KIND_SCHEMAS, json.kind)) {
    return {
      config: [
        `Expected a value for "kind": ${Object.keys(KIND_SCHEMAS).join(", ")}`,
      ],
    };
  }

  let validation: ValidationResult;

  try {
    validation = await validateKind(
      json,
      json.kind as keyof typeof KIND_SCHEMAS
    );
  } catch (error: unknown) {
    console.error("An error occurred when validating the schema", error);
    return { config: ["An error occurred when validating the schema"] };
  }

  if (!validation.valid) {
    console.log("Validation results", validation.errors);
    return {
      config: validation.errors.map((x) => `${x.instanceLocation}: ${x.error}`),
    };
  }

  return {};
}
