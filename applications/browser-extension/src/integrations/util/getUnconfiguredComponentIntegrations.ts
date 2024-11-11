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

import { type ModDefinition } from "@/types/modDefinitionTypes";
import { type IntegrationDependency } from "@/integrations/integrationTypes";
import { groupBy, isEmpty } from "lodash";
import { isSchemaServicesFormat } from "@/modDefinitions/util/isSchemaServicesFormat";
import { type Schema } from "@/types/schemaTypes";
import extractIntegrationIdsFromSchema from "@/integrations/util/extractIntegrationIdsFromSchema";
import { validateOutputKey } from "@/runtime/runtimeTypes";
import { type OutputKey } from "@/types/runtimeTypes";
import { type RegistryId } from "@/types/registryTypes";

function getIntegrationsFromSchema(services: Schema): IntegrationDependency[] {
  return Object.entries(services.properties ?? {}).flatMap(([key, schema]) => {
    if (typeof schema === "boolean") {
      return [];
    }

    const integrationIds = extractIntegrationIdsFromSchema(schema);
    return integrationIds.map((integrationId) => ({
      integrationId,
      outputKey: validateOutputKey(key),
      isOptional: services.required != null && !services.required.includes(key),
      apiVersion: "v2",
    }));
  });
}

function getIntegrationsFromRecord(
  services: Record<OutputKey, RegistryId>,
): IntegrationDependency[] {
  return Object.entries(services).map(([key, integrationId]) => ({
    integrationId,
    outputKey: validateOutputKey(key),
    isOptional: false,
    apiVersion: "v1",
  }));
}

/**
 * Return an array of unique integrations used by a given collection of mod components, without their config filled in
 * @param extensionPoints the mod component definitions from which to extract integrations
 * @see selectExtensionPointConfig in saveHelpers.ts for the reverse logic
 */
export default function getUnconfiguredComponentIntegrations({
  extensionPoints: modComponentDefinitions = [],
}: Pick<ModDefinition, "extensionPoints">): IntegrationDependency[] {
  const integrationDependencies = modComponentDefinitions.flatMap(
    ({ services }) => {
      if (isEmpty(services)) {
        return [];
      }

      return isSchemaServicesFormat(services)
        ? getIntegrationsFromSchema(services)
        : getIntegrationsFromRecord(services);
    },
  );

  const dedupedIntegrationDependencies: IntegrationDependency[] = [];
  for (const group of Object.values(
    groupBy(
      integrationDependencies,
      ({ integrationId, outputKey }) => `${integrationId}:${outputKey}`,
    ),
  )) {
    const notOptional = group.find(({ isOptional }) => !isOptional);
    if (notOptional) {
      dedupedIntegrationDependencies.push(notOptional);
    } else {
      /* eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      -- Groups can't be empty, they've just been created by groupBy */
      dedupedIntegrationDependencies.push(group[0]!);
    }
  }

  return dedupedIntegrationDependencies;
}
