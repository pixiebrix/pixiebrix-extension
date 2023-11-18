/*
 * Copyright (C) 2023 PixieBrix, Inc.
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
import { type RegistryId } from "@/types/registryTypes";

const INTEGRATION_ID_URL_REGEX =
  /^https:\/\/app\.pixiebrix\.com\/schemas\/services\/(?<id>\S+)$/;

/**
 * Return the registry ids of integrations supported by a JSON Schema field definition.
 *
 * Returns empty for $ref that is not a service schema, e.g.:
 * - https://app.pixiebrix.com/schemas/service#/definitions/configuredService
 *
 * @param schema The schema to extract integration from
 * @param options Extra execution options
 * @param options.suppressError Suppress the "not found" error if no matches are found. Useful when aggregating results of this function or calling it recursively.
 */
export default function extractIntegrationIdsFromSchema(
  schema: Schema,
  options?: {
    suppressNotFoundError?: boolean;
  }
): RegistryId[] {
  if (schema.$ref) {
    const match = INTEGRATION_ID_URL_REGEX.exec(schema.$ref);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-unnecessary-type-assertion -- Guaranteed by regex
    return match ? [match.groups!.id as RegistryId] : [];
  }

  if (schema.anyOf) {
    return schema.anyOf
      .filter((x) => x !== false)
      .flatMap((x) =>
        extractIntegrationIdsFromSchema(x as Schema, {
          suppressNotFoundError: true,
        })
      );
  }

  if (schema.oneOf) {
    return schema.oneOf
      .filter((x) => x !== false)
      .flatMap((x) =>
        extractIntegrationIdsFromSchema(x as Schema, {
          suppressNotFoundError: true,
        })
      );
  }

  if (options?.suppressNotFoundError) {
    return [];
  }

  throw new Error("Expected $ref, anyOf, or oneOf in schema for integration");
}
