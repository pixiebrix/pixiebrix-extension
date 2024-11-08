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

import { compact, uniqBy } from "lodash";
import { type ModComponentBase } from "../../types/modComponentTypes";
import { type OptionsArgs } from "../../types/runtimeTypes";
import {
  type IntegrationDependency,
  type ModDependencyAPIVersion,
} from "../../integrations/integrationTypes";
import {
  INTEGRATIONS_BASE_SCHEMA_URL,
  PIXIEBRIX_INTEGRATION_ID,
} from "../../integrations/constants";
import type {
  ModComponentDefinition,
  ModVariablesDefinition,
} from "../../types/modDefinitionTypes";
import type { Schema } from "../../types/schemaTypes";
import { emptyModVariablesDefinitionFactory } from "../../utils/modUtils";

/**
 * Infer options from existing mod-component-like instances for reactivating a mod
 * @see activateMod
 */
export function collectModOptionsArgs(
  modComponents: Array<Pick<ModComponentBase, "optionsArgs">>,
): OptionsArgs {
  // For a given mod, all the components receive the same options during the
  // activation process (even if they don't use the options), so we can take
  // the optionsArgs for any of the extensions
  return modComponents[0]?.optionsArgs ?? {};
}

/**
 * Infer options from existing mod-component-like instances for reactivating a mod
 * @see activateMod
 */
export function collectModVariablesDefinition(
  modComponents: Array<Pick<ModComponentBase, "variablesDefinition">>,
): ModVariablesDefinition {
  // `variablesDefinition` is defined at the mod-level, so will be the same on each mod component
  return (
    modComponents[0]?.variablesDefinition ??
    emptyModVariablesDefinitionFactory()
  );
}

/**
 * Collect integration dependencies from existing mod-component-like instances.
 *
 * Includes unconfigured integrations and the PixieBrix integration.
 *
 * @see collectConfiguredIntegrationDependencies
 */
export function collectIntegrationDependencies(
  modComponents: Array<Pick<ModComponentBase, "integrationDependencies">>,
): IntegrationDependency[] {
  return uniqBy(
    modComponents.flatMap(
      ({ integrationDependencies }) => integrationDependencies ?? [],
    ),
    ({ integrationId }) => integrationId,
  );
}

/**
 * Collect configured integration dependencies from existing mod-component-like
 * instances for re-activating a mod. Filters out any optional integrations that
 * don't have a config set.
 * @param modComponents mod components from which to extract integration dependencies
 * @returns IntegrationDependency[] the configured integration dependencies for the mod components
 * @see activateMod
 */
export function collectConfiguredIntegrationDependencies(
  modComponents: Array<Pick<ModComponentBase, "integrationDependencies">>,
): IntegrationDependency[] {
  return uniqBy(
    modComponents
      .flatMap(({ integrationDependencies }) => integrationDependencies ?? [])
      .filter(
        ({ integrationId, configId }) =>
          configId != null || integrationId === PIXIEBRIX_INTEGRATION_ID,
      ),
    ({ integrationId }) => integrationId,
  );
}

/**
 * Return the highest API Version used by any of the integrations in the mod. Only exported for testing.
 * @param integrationDependencies mod integration dependencies
 * @since 1.7.37
 * @note This function is just for safety, there's currently no way for a mod to end up with "mixed" integration api versions.
 * @internal
 */
export function findMaxIntegrationDependencyApiVersion(
  integrationDependencies: Array<Pick<IntegrationDependency, "apiVersion">>,
): ModDependencyAPIVersion {
  let maxApiVersion: ModDependencyAPIVersion = "v1";
  for (const integrationDependency of integrationDependencies) {
    const { apiVersion } = integrationDependency;
    if (apiVersion && apiVersion > maxApiVersion) {
      maxApiVersion = apiVersion;
    }
  }

  return maxApiVersion;
}

export function selectModComponentIntegrations({
  integrationDependencies,
}: Pick<
  ModComponentBase,
  "integrationDependencies"
>): ModComponentDefinition["services"] {
  const _integrationDependencies = compact(integrationDependencies);
  const apiVersion = findMaxIntegrationDependencyApiVersion(
    _integrationDependencies,
  );
  if (apiVersion === "v1") {
    return Object.fromEntries(
      _integrationDependencies.map((x) => [x.outputKey, x.integrationId]),
    );
  }

  if (apiVersion === "v2") {
    const properties: Record<string, Schema> = {};
    const required: string[] = [];
    for (const {
      outputKey,
      integrationId,
      isOptional,
    } of _integrationDependencies) {
      properties[outputKey] = {
        $ref: `${INTEGRATIONS_BASE_SCHEMA_URL}${integrationId}`,
      };
      if (!isOptional) {
        required.push(outputKey);
      }
    }

    return {
      properties,
      required,
    } as Schema;
  }

  const exhaustiveCheck: never = apiVersion;
  throw new Error(`Unknown ModDependencyApiVersion: ${exhaustiveCheck}`);
}
