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

import { services } from "@/background/messenger/api";
import { pickBy } from "lodash";
import { isSpecificError } from "@/errors/errorHelpers";
import { MissingConfigurationError } from "@/errors/businessErrors";
import { type Schema } from "@/types/schemaTypes";
import { type RegistryId } from "@/types/registryTypes";
import {
  type SanitizedIntegrationConfig,
  type IntegrationDependency,
} from "@/types/integrationTypes";
import { type UUID } from "@/types/stringTypes";
import { type ServiceContext } from "@/types/runtimeTypes";
import { memoizeUntilSettled, resolveObj } from "@/utils/promiseUtils";

export const INTEGRATION_DEPENDENCY_FIELD_REFS = [
  "https://app.pixiebrix.com/schemas/service#/definitions/configuredServiceOrVar",
  "https://app.pixiebrix.com/schemas/service#/definitions/configuredService",
];

export const SERVICES_BASE_SCHEMA_URL =
  "https://app.pixiebrix.com/schemas/services/";

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
export function extractIntegrationIds(
  schema: Schema,
  options?: {
    suppressNotFoundError?: boolean;
  }
): RegistryId[] {
  if ("$ref" in schema) {
    const match = INTEGRATION_ID_URL_REGEX.exec(schema.$ref ?? "");
    return match ? [match.groups.id as RegistryId] : [];
  }

  if ("anyOf" in schema) {
    return schema.anyOf
      .filter((x) => x !== false)
      .flatMap((x) =>
        extractIntegrationIds(x as Schema, { suppressNotFoundError: true })
      );
  }

  if ("oneOf" in schema) {
    return schema.oneOf
      .filter((x) => x !== false)
      .flatMap((x) =>
        extractIntegrationIds(x as Schema, { suppressNotFoundError: true })
      );
  }

  if (options.suppressNotFoundError) {
    return [];
  }

  throw new Error("Expected $ref, anyOf, or oneOf in schema for integration");
}

async function _locateWithRetry(
  integrationId: RegistryId,
  authId: UUID,
  { retry = true }: { retry: boolean }
): Promise<SanitizedIntegrationConfig> {
  try {
    return await services.locate(integrationId, authId);
  } catch (error) {
    if (retry && isSpecificError(error, MissingConfigurationError)) {
      // Retry
    } else {
      throw error;
    }
  }

  // Ensure the locator has the latest configurations (remote and local)
  await services.refresh();

  return services.locate(integrationId, authId);
}

/**
 * Locate an integration config by id and configuration. If it's not found,
 * fetch the latest configurations from local storage and remote, and then
 * try again.
 */
// Memoize until settled, because multiple elements on the screen may be
// trying to locate the same integration. Might also consider full
// memoization/caching, but would have to be careful about invalidating the
// cache on integration configuration changes
export const locateWithRetry = memoizeUntilSettled(_locateWithRetry, {
  cacheKey: JSON.stringify,
});

/** Build the service context by locating the dependencies */
export async function makeServiceContext(
  // `ModComponentBase.services` is an optional field. Since we don't have strict-nullness checking on, calls to this method
  // are error-prone. So just be defensive in the signature
  // https://github.com/pixiebrix/pixiebrix-extension/issues/3262
  dependencies: IntegrationDependency[] | null = []
): Promise<ServiceContext> {
  const dependencyContext = async ({
    integrationId,
    configId,
  }: IntegrationDependency) => {
    // Should be safe to call locateWithRetry in parallel b/c the locator.refresh() method debounces/coalesces
    // the promise
    const integrationConfig = await locateWithRetry(integrationId, configId, {
      retry: true,
    });
    return {
      // Our JSON validator gets mad at undefined values
      ...pickBy(integrationConfig.config, (x) => x !== undefined),
      __service: integrationConfig,
    };
  };

  return resolveObj(
    Object.fromEntries(
      dependencies.map((dependency) => [
        `@${dependency.outputKey}`,
        dependencyContext(dependency),
      ])
    )
  );
}
