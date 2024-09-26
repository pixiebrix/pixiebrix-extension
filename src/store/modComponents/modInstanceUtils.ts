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

import type { ModInstance, ModInstanceId } from "@/types/modInstanceTypes";
import type {
  ActivatedModComponent,
  ModComponentBase,
} from "@/types/modComponentTypes";
import { omit, pick } from "lodash";
import { assertNotNullish } from "@/utils/nullishUtils";
import { uuidv4 } from "@/types/helpers";
import {
  collectIntegrationDependencies,
  collectModOptions,
  selectModComponentIntegrations,
} from "@/store/modComponents/modComponentUtils";
import { createPrivateSharing } from "@/utils/registryUtils";
import { emptyModOptionsDefinitionFactory } from "@/utils/modUtils";
import { assertModComponentNotHydrated } from "@/runtime/runtimeUtils";
import type { ModComponentDefinition } from "@/types/modDefinitionTypes";

function generateModInstanceId(): ModInstanceId {
  return uuidv4() as ModInstanceId;
}

/**
 * Returns true if mod instance is defined and is associated with a personal deployment.
 */
export function getIsPersonalDeployment(
  modInstance: ModInstance | undefined,
): boolean {
  return Boolean(modInstance?.deploymentMetadata?.isPersonalDeployment);
}

export function mapModComponentBaseToModComponentDefinition(
  modComponent: ModComponentBase,
): ModComponentDefinition {
  return {
    ...pick(modComponent, ["label", "config", "permissions", "templateEngine"]),
    id: modComponent.extensionPointId,
    services: selectModComponentIntegrations(modComponent),
  };
}

/**
 * Maps activated mod components to a mod instance.
 * @param modComponents mod components from the mod
 */
export function mapActivatedModComponentsToModInstance(
  modComponents: ActivatedModComponent[],
): ModInstance {
  const firstComponent = modComponents[0];
  assertNotNullish(firstComponent, "activatedModComponents is empty");

  // Mod registry id consistency is checked when mapping over the components
  const modMetadata = firstComponent._recipe;
  assertNotNullish(modMetadata, "Mod metadata is required");

  return {
    id: generateModInstanceId(),
    modComponentIds: modComponents.map(({ id }) => id),
    deploymentMetadata: firstComponent._deployment,
    optionsArgs: collectModOptions(modComponents),
    integrationsArgs: collectIntegrationDependencies(modComponents),
    updatedAt: firstComponent.updateTimestamp,
    definition: {
      kind: "recipe",
      apiVersion: firstComponent.apiVersion,
      definitions: firstComponent.definitions,
      metadata: omit(modMetadata, ["sharing", "updated_at"]),
      // Don't bother inferring mod options schema from the components. It's not necessary because activation screens
      // always use the definition from the server. It's also not possible to reliably infer the schema because multiple
      // types can have the same value. E.g., a UUID might be a PixieBrix database ID or just a UUID.
      // XXX: we might need to revisit the defaulting behavior for the Page Editor if we want to use the activation-time
      // definition vs. looking up the definition
      options: emptyModOptionsDefinitionFactory(),
      sharing: modMetadata.sharing ?? createPrivateSharing(),
      updated_at: modMetadata.updated_at ?? firstComponent.updateTimestamp,
      extensionPoints: modComponents.map((modComponent) => {
        assertModComponentNotHydrated(modComponent);

        if (modComponent._recipe?.id !== modMetadata.id) {
          throw new Error("Mod component does not match mod metadata");
        }

        return mapModComponentBaseToModComponentDefinition(modComponent);
      }),
    },
  };
}
