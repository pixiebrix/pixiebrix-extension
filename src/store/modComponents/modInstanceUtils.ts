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
import { omit, pick, zip } from "lodash";
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
import type { SetRequired } from "type-fest";
import { pickModDefinitionMetadata } from "@/modDefinitions/util/pickModDefinitionMetadata";
import getModDefinitionIntegrationIds from "@/integrations/util/getModDefinitionIntegrationIds";
import { emptyPermissionsFactory } from "@/permissions/permissionsUtils";
import { type DeploymentMetadata } from "@/types/deploymentTypes";

/**
 * A version of ActivatedModComponent with stronger nullness guarantees to support type evolution in the future.
 */
type ModInstanceActivatedModComponent = SetRequired<
  ActivatedModComponent,
  "_recipe" | "definitions" | "integrationDependencies" | "permissions"
>;

/**
 * Generate a tagged UUID for a mod instance.
 */
export function generateModInstanceId(): ModInstanceId {
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
 * Returns the activated mod component for a given mod instance. Is side effect free -- only maps the shape, does
 * not persist the mod components or modify the UI.
 *
 * @see mapModComponentDefinitionToActivatedModComponent
 */
export function mapModInstanceToActivatedModComponents(
  modInstance: ModInstance,
): ModInstanceActivatedModComponent[] {
  const { deploymentMetadata, integrationsArgs, updatedAt, definition } =
    modInstance;

  const modMetadata = pickModDefinitionMetadata(definition);

  return zip(definition.extensionPoints, modInstance.modComponentIds).map(
    ([modComponentDefinition, modComponentId]) => {
      assertNotNullish(
        modComponentDefinition,
        "extensionPoints mismatch with modComponentIds",
      );
      assertNotNullish(
        modComponentId,
        "extensionPoints mismatch with modComponentIds",
      );

      const componentIntegrationIds = getModDefinitionIntegrationIds({
        extensionPoints: [modComponentDefinition],
      });

      const base = {
        id: modComponentId,
        active: true,
        label: modComponentDefinition.label,
        config: modComponentDefinition.config,
        permissions:
          modComponentDefinition.permissions ?? emptyPermissionsFactory(),
        // Default to `v1` for backward compatability
        apiVersion: definition.apiVersion ?? "v1",
        _recipe: modMetadata,
        // All definitions are pushed down into the mod components. That's OK because `resolveDefinitions` determines
        // uniqueness based on the content of the definition. Therefore, bricks will be re-used as necessary
        definitions: definition.definitions ?? {},
        optionsArgs: modInstance.optionsArgs,
        extensionPointId: modComponentDefinition.id,
        createTimestamp: updatedAt,
        updateTimestamp: updatedAt,
        // XXX: do we have to filter to only the integrations referenced by this particular mod? Historically, was this
        // only to simplify moving mod components in the Page Editor?
        integrationDependencies: integrationsArgs.filter(({ integrationId }) =>
          componentIntegrationIds.includes(integrationId),
        ),
      } as ModInstanceActivatedModComponent;

      if (modComponentDefinition.templateEngine) {
        base.templateEngine = modComponentDefinition.templateEngine;
      }

      if (deploymentMetadata) {
        base._deployment = deploymentMetadata;
      }

      return base;
    },
  );
}

function migrateDeploymentMetadata(
  deploymentMetadata: DeploymentMetadata,
): SetRequired<DeploymentMetadata, "active"> {
  return {
    ...deploymentMetadata,
    active: deploymentMetadata.active ?? true,
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
    deploymentMetadata: firstComponent._deployment
      ? migrateDeploymentMetadata(firstComponent._deployment)
      : undefined,
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
