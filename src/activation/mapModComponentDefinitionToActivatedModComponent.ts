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

import type { ActivatedModComponent } from "@/types/modComponentTypes";
import { uuidv4 } from "@/types/helpers";
import { pickModDefinitionMetadata } from "@/modDefinitions/util/pickModDefinitionMetadata";
import getModDefinitionIntegrationIds from "@/integrations/util/getModDefinitionIntegrationIds";
import type {
  ModComponentDefinition,
  ModDefinition,
} from "@/types/modDefinitionTypes";
import type { Deployment } from "@/types/contract";
import type { OptionsArgs } from "@/types/runtimeTypes";
import type { IntegrationDependency } from "@/integrations/integrationTypes";
import { nowTimestamp } from "@/utils/timeUtils";

export type ActivateModComponentParam = {
  /**
   * The component definition to activate
   */
  modComponentDefinition: ModComponentDefinition;
  /**
   * The mod definition this component belongs to
   */
  modDefinition: ModDefinition;
  /**
   * The deployment for this component, if it belongs to one
   */
  deployment?: Deployment;
  /**
   * Mod option inputs for the mod this component belongs to
   */
  optionsArgs?: OptionsArgs;
  /**
   * The configured dependencies for the mod this component belongs to
   */
  integrationDependencies: IntegrationDependency[];
};

/**
 * Transform a given ModComponentDefinition into an ActivatedModComponent.
 * Note: This function has no side effects, it's just a type-transformer. It does
 * NOT save the activated mod component anywhere.
 */
export function mapModComponentDefinitionToActivatedModComponent<
  Config extends UnknownObject = UnknownObject,
>({
  modComponentDefinition,
  modDefinition,
  deployment,
  optionsArgs,
  integrationDependencies,
}: ActivateModComponentParam): ActivatedModComponent<Config> {
  const timestamp = nowTimestamp();

  const activatedModComponent = {
    id: uuidv4(),
    // Default to `v1` for backward compatability
    apiVersion: modDefinition.apiVersion ?? "v1",
    _recipe: pickModDefinitionMetadata(modDefinition),
    // Definitions are pushed down into the mod components. That's OK because `resolveDefinitions` determines
    // uniqueness based on the content of the definition. Therefore, bricks will be re-used as necessary
    definitions: modDefinition.definitions ?? {},
    optionsArgs,
    label: modComponentDefinition.label,
    extensionPointId: modComponentDefinition.id,
    config: modComponentDefinition.config as Config,
    active: true,
    createTimestamp: timestamp,
    updateTimestamp: timestamp,
  } as ActivatedModComponent<Config>;

  // Set optional fields only if the source mod component has a value. Normalizing the values
  // here makes testing harder because we then have to account for the normalized value in assertions.

  if (deployment) {
    activatedModComponent._deployment = {
      id: deployment.id,
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- This should be defined in practice
      timestamp: deployment.updated_at!,
      active: deployment.active,
    };
  }

  if (modComponentDefinition.services) {
    const modIntegrationIds = getModDefinitionIntegrationIds({
      extensionPoints: [modComponentDefinition],
    });
    activatedModComponent.integrationDependencies =
      integrationDependencies.filter(({ integrationId }) =>
        modIntegrationIds.includes(integrationId),
      );
  }

  if (modComponentDefinition.permissions) {
    activatedModComponent.permissions = modComponentDefinition.permissions;
  }

  if (modComponentDefinition.templateEngine) {
    activatedModComponent.templateEngine =
      modComponentDefinition.templateEngine;
  }

  return activatedModComponent;
}
