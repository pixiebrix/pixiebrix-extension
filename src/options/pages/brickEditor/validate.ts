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

import { KIND_SCHEMAS, validateKind } from "@/validators/generic";
import { ValidationResult } from "@cfworker/json-schema";
import { getErrorMessage } from "@/errors/errorHelpers";
import { loadBrickYaml } from "@/runtime/brickYaml";

type PartialSchema = {
  kind?: string;
};

export type BrickValidationResult =
  | { config: string }
  | { config: string[] }
  | Record<never, unknown>;

export async function validateSchema(
  value: string
): Promise<BrickValidationResult> {
  if (!value) {
    return {
      config: "A definition is required",
    };
  }

  if (typeof value !== "string") {
    throw new TypeError("Expected string value");
  }

  let json: PartialSchema;

  try {
    json = loadBrickYaml(value) as PartialSchema;
  } catch (error) {
    return {
      config: [`Invalid YAML: ${getErrorMessage(error)}`],
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
      json as Record<string, unknown>,
      json.kind as keyof typeof KIND_SCHEMAS
    );
  } catch (error) {
    console.error("An error occurred when validating the schema", error);
    return { config: ["An error occurred when validating the schema"] };
  }

  if (!validation.valid) {
    console.debug("Validation results", validation.errors);
    return {
      config: validation.errors.map((x) => `${x.instanceLocation}: ${x.error}`),
    };
  }

  return {};
}
