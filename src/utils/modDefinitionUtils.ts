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

import { type RegistryId } from "@/types/registryTypes";
import {
  type ModComponentDefinition,
  type ModDefinition,
} from "@/types/modDefinitionTypes";
import { isEmpty, pick, uniq } from "lodash";
import { PIXIEBRIX_INTEGRATION_ID } from "@/services/constants";
import { type Schema } from "@/types/schemaTypes";
import { extractServiceIds } from "@/services/serviceUtils";
import { type ModComponentBase } from "@/types/modComponentTypes";
import { type UnconfiguredIntegrationDependency } from "@/types/integrationTypes";
import { type OutputKey } from "@/types/runtimeTypes";
import { validateOutputKey } from "@/runtime/runtimeTypes";

function isSchemaServicesFormat(
  services: ModComponentDefinition["services"]
): services is Schema {
  return (
    Object.hasOwn(services, "properties") &&
    // @ts-expect-error -- type checking with hasOwn
    typeof services.properties === "object" &&
    Object.hasOwn(services, "required") &&
    // @ts-expect-error -- type checking with hasOwn
    Array.isArray(services.required)
  );
}

function getIntegrationsFromSchema(
  services: Schema
): UnconfiguredIntegrationDependency[] {
  return Object.entries(services.properties).flatMap(([key, schema]) => {
    if (typeof schema === "boolean") {
      return [];
    }

    const integrationIds = extractServiceIds(schema);
    return integrationIds.map((id) => ({
      id,
      outputKey: validateOutputKey(key),
      isOptional: services.required != null && !services.required.includes(key),
    }));
  });
}

function getIntegrationsFromRecord(
  services: Record<OutputKey, RegistryId>
): UnconfiguredIntegrationDependency[] {
  return Object.entries(services).map(([key, id]) => ({
    id,
    outputKey: validateOutputKey(key),
    isOptional: false,
  }));
}

/**
 * Return an array of unique integrations used by a given collection of mod components, without their config filled in
 * @param extensionPoints the mod component definitions from which to extract integrations
 */
export function getUnconfiguredComponentIntegrations({
  extensionPoints: modComponentDefinitions = [],
}: Pick<
  ModDefinition,
  "extensionPoints"
>): UnconfiguredIntegrationDependency[] {
  return modComponentDefinitions.flatMap(({ services }) => {
    if (isEmpty(services)) {
      return [];
    }

    return isSchemaServicesFormat(services)
      ? getIntegrationsFromSchema(services)
      : getIntegrationsFromRecord(services);
  });
}

/**
 * Return an array of unique integration ids used by a mod definition or another collection of mod components
 * @param extensionPoints mod component definitions from which to extract integration ids
 * @param excludePixieBrix whether to exclude the PixieBrix integration
 * @param requiredOnly whether to only include required integrations
 */
export function getIntegrationIds(
  {
    extensionPoints: modComponentDefinitions = [],
  }: Pick<ModDefinition, "extensionPoints">,
  { excludePixieBrix = false, requiredOnly = false } = {}
): RegistryId[] {
  const integrationIds = uniq(
    modComponentDefinitions.flatMap(({ services }) => {
      if (isEmpty(services)) {
        return [];
      }

      return isSchemaServicesFormat(services)
        ? Object.entries(services.properties)
            .filter(
              ([key]) => !requiredOnly || services.required?.includes(key)
            )
            .flatMap(([, schema]) => extractServiceIds(schema as Schema))
        : Object.values(services ?? {});
    })
  );

  if (excludePixieBrix) {
    return integrationIds.filter((id) => id !== PIXIEBRIX_INTEGRATION_ID);
  }

  return integrationIds;
}

/**
 * Select information about the ModDefinition used to install an ModComponentBase
 * @see ModComponentBase._recipe
 */
export function pickModDefinitionMetadata(
  modDefinition: ModDefinition
): ModComponentBase["_recipe"] {
  if (modDefinition.metadata?.id == null) {
    throw new TypeError("ModDefinition metadata id is required");
  }

  return {
    ...pick(modDefinition.metadata, ["id", "version", "name", "description"]),
    ...pick(modDefinition, ["sharing", "updated_at"]),
  };
}
