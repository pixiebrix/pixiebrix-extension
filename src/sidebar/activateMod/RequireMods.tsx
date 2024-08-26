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

import React from "react";
import { type RegistryId } from "@/types/registryTypes";
import { useRequiredModDefinitions } from "@/modDefinitions/modDefinitionHooks";
import { type ModDefinition } from "@/types/modDefinitionTypes";
import Loader from "@/components/Loader";
import { getDefaultAuthOptionsForMod, useAuthOptions } from "@/hooks/auth";
import { isEmpty, zip } from "lodash";
import { type AuthOption } from "@/auth/authTypes";
import useDeriveAsyncState from "@/hooks/useDeriveAsyncState";
import { isDatabaseField } from "@/components/fields/schemaFields/fieldTypeCheckers";
import { useSelector } from "react-redux";
import { selectActivatedModComponents } from "@/store/modComponents/modComponentSelectors";
import { includesQuickBarStarterBrick } from "@/starterBricks/starterBrickModUtils";
import { PIXIEBRIX_INTEGRATION_ID } from "@/integrations/constants";
import getUnconfiguredComponentIntegrations from "@/integrations/util/getUnconfiguredComponentIntegrations";
import type { ModActivationConfig } from "@/types/modTypes";
import { valueToAsyncState } from "@/utils/asyncStateUtils";
import { assertNotNullish } from "@/utils/nullishUtils";

export type RequiredModDefinition = {
  /**
   * The mod definition.
   */
  modDefinition: ModDefinition;
  /**
   * True if the mod includes a quick bar or dynamic quick bar provider starter brick.
   */
  includesQuickBar: boolean;
  /**
   * True if the mod will require end-user configuration.
   */
  requiresConfiguration: boolean;
  /**
   * True if the mod is already activated.
   */
  isActive: boolean;
  /**
   * The default integration configurations for the mod
   */
  defaultAuthOptions: Record<RegistryId, AuthOption | null>;
  /**
   * Initial options to pass to the mod configuration form for new activations.
   *
   * Introduced to support providing initial options via activation URL.
   *
   * @since 1.8.8
   */
  initialOptions: UnknownObject;
};

type Props = {
  mods: ModActivationConfig[];
  children: (props: RequiredModDefinition[]) => React.ReactElement;
};

/**
 * Return true if the recipe requires a user to configure options/integration configurations.
 *
 * NOTE: does not perform a permissions check.
 *
 * @param modDefinition the mod definition
 * @param authOptions the integration configurations available to the user
 * @param initialOptions the initial options for the mod
 * @see checkModDefinitionPermissions
 */
export function requiresUserConfiguration(
  modDefinition: ModDefinition,
  authOptions: AuthOption[],
  initialOptions: UnknownObject,
): boolean {
  const defaultAuthOptionsByIntegrationId = getDefaultAuthOptionsForMod(
    modDefinition,
    authOptions,
  );

  const { properties: modOptions, required: requiredOptions = [] } =
    modDefinition.options?.schema ?? {};

  const needsOptionsInputs =
    !isEmpty(modOptions) &&
    Object.entries(modOptions).some(([name, optionSchema]) => {
      // This should not occur in practice, but it's here for type narrowing
      if (typeof optionSchema === "boolean") {
        return false;
      }

      // We return false here for any option that does not need user input and can be auto-activated in the marketplace
      // activation flow.
      // Options that allow auto-activation:
      // - Database fields with format "preview"
      // - Options not marked as required

      if (isDatabaseField(optionSchema) && optionSchema.format === "preview") {
        return false;
      }

      // We require user input for any option that isn't explicitly excluded, so we return true here
      // Since 1.8.8., validate whether an initial option is provided, but don't validate its value
      return (
        requiredOptions.includes(name) &&
        initialOptions[name] === undefined &&
        !optionSchema.default
      );
    });

  const modIntegrationIds = getUnconfiguredComponentIntegrations(modDefinition);
  const needsIntegrationAuths = modIntegrationIds.some(
    ({ integrationId, isOptional }) => {
      if (integrationId === PIXIEBRIX_INTEGRATION_ID || isOptional) {
        return false;
      }

      // eslint-disable-next-line security/detect-object-injection -- serviceId is a registry ID
      const defaultOption = defaultAuthOptionsByIntegrationId[integrationId];

      // Needs user configuration if there are any non-built-in options available
      return defaultOption?.sharingType !== "built-in";
    },
  );

  return needsOptionsInputs || needsIntegrationAuths;
}

/**
 * Helper component to conditionally render children that depend on mod definitions.
 */
const RequireMods: React.FC<Props> = ({ mods, children }) => {
  const modDefinitionsState = useRequiredModDefinitions(
    mods.map((x) => x.modId),
  );
  const originalState = valueToAsyncState(mods);
  const authOptionsState = useAuthOptions();

  const activatedModComponents = useSelector(selectActivatedModComponents);

  const state = useDeriveAsyncState(
    originalState,
    modDefinitionsState,
    authOptionsState,
    async (
      modOptionPairs: ModActivationConfig[],
      modDefinitions: ModDefinition[],
      authOptions: AuthOption[],
    ) =>
      Promise.all(
        zip(modOptionPairs, modDefinitions).map(
          async ([modOptionPair, modDefinition]) => {
            const { initialOptions } = modOptionPair ?? {};
            assertNotNullish(modDefinition, "modDefinition is nullish");
            assertNotNullish(initialOptions, "initialOptions is nullish");

            const defaultAuthOptions = getDefaultAuthOptionsForMod(
              modDefinition,
              authOptions,
            );

            return {
              modDefinition,
              defaultAuthOptions,
              initialOptions,
              requiresConfiguration: requiresUserConfiguration(
                modDefinition,
                authOptions,
                initialOptions,
              ),
              includesQuickBar:
                await includesQuickBarStarterBrick(modDefinition),
              isActive: activatedModComponents.some(
                (x) => x._recipe?.id === modDefinition.metadata.id,
              ),
            };
          },
        ),
      ),
  );

  // Throw error to hit error boundary
  if (state.isError) {
    throw (state.error as Error) ?? new Error("Error retrieving mods");
  }

  if (state.isLoading) {
    return <Loader />;
  }

  assertNotNullish(state.data, "state.data is nullish");

  return children(state.data);
};

export default RequireMods;
