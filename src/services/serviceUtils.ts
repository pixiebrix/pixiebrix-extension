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

import {
  RegistryId,
  SanitizedServiceConfiguration,
  Schema,
  ServiceContext,
  ServiceDependency,
  UUID,
} from "@/core";
import { services } from "@/background/messenger/api";
import { pickBy } from "lodash";
import { resolveObj } from "@/utils";
import { isErrorLike } from "serialize-error";

export const SERVICE_FIELD_REFS = [
  "https://app.pixiebrix.com/schemas/service#/definitions/configuredServiceOrVar",
  "https://app.pixiebrix.com/schemas/service#/definitions/configuredService",
];

export const SERVICE_BASE_SCHEMA =
  "https://app.pixiebrix.com/schemas/services/";

const SERVICE_ID_REGEX =
  /^https:\/\/app\.pixiebrix\.com\/schemas\/services\/(?<id>\S+)$/;

/**
 * Return the registry ids of services supported by a JSON Schema field definition
 * @param schema
 */
export function extractServiceIds(schema: Schema): RegistryId[] {
  if ("$ref" in schema) {
    const match = SERVICE_ID_REGEX.exec(schema.$ref ?? "");
    return match ? [match.groups.id as RegistryId] : [];
  }

  if ("anyOf" in schema) {
    return schema.anyOf
      .filter((x) => x !== false)
      .flatMap((x) => extractServiceIds(x as Schema));
  }

  throw new Error("Expected $ref or anyOf in schema for service");
}

async function locateWithRetry(
  serviceId: RegistryId,
  authId: UUID,
  { retry = true }: { retry: boolean }
): Promise<SanitizedServiceConfiguration> {
  try {
    return await services.locate(serviceId, authId);
  } catch (error) {
    if (
      retry &&
      isErrorLike(error) &&
      error.name === "MissingConfigurationError"
    ) {
      // Retry
    } else {
      throw error;
    }
  }

  // Ensure the locator has the latest configurations (remote and local)
  await services.refresh();

  return services.locate(serviceId, authId);
}

/** Build the service context by locating the dependencies */
export async function makeServiceContext(
  // `IExtension.services` is an optional field. Since we don't have strict-nullness checking on, calls to this method
  // are error-prone. So just be defensive in the signature
  // https://github.com/pixiebrix/pixiebrix-extension/issues/3262
  dependencies: ServiceDependency[] | null = []
): Promise<ServiceContext> {
  const dependencyContext = async ({ id, config }: ServiceDependency) => {
    // Should be safe to call locateWithRetry in parallel b/c the locator.refresh() method debounces/coalesces
    // the promise
    const configuredService = await locateWithRetry(id, config, {
      retry: true,
    });
    return {
      // Our JSON validator gets mad at undefined values
      ...pickBy(configuredService.config, (x) => x !== undefined),
      __service: configuredService,
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
