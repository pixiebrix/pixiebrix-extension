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

import React from "react";
import { type RegistryId } from "@/types/registryTypes";
import { useRequiredModDefinitions } from "@/recipes/recipesHooks";
import { type ModDefinition } from "@/types/modDefinitionTypes";
import Loader from "@/components/Loader";
import includesQuickBarExtensionPoint from "@/utils/includesQuickBarExtensionPoint";
import { getDefaultAuthOptionsForRecipe, useAuthOptions } from "@/hooks/auth";
import { isEmpty, uniq } from "lodash";
import { PIXIEBRIX_SERVICE_ID } from "@/services/constants";
import { type AuthOption } from "@/auth/authTypes";
import useDeriveAsyncState from "@/hooks/useDeriveAsyncState";
import { isDatabaseField } from "@/components/fields/schemaFields/fieldTypeCheckers";
import { useSelector } from "react-redux";
import { selectExtensions } from "@/store/extensionsSelectors";

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
};

type Props = {
  modIds: RegistryId[];
  children: (props: RequiredModDefinition[]) => React.ReactElement;
};

/**
 * Return true if the recipe requires a user to configure options/integration configurations.
 *
 * NOTE: does not perform a permissions check.
 *
 * @param recipe the recipe definition
 * @param authOptions the integration configurations available to the user
 * @see checkRecipePermissions
 */
function requiresUserConfiguration(
  recipe: ModDefinition,
  authOptions: AuthOption[]
): boolean {
  const defaultAuthOptions = getDefaultAuthOptionsForRecipe(
    recipe,
    authOptions
  );

  const recipeOptions = recipe.options?.schema?.properties;

  const needsOptionsInputs =
    !isEmpty(recipeOptions) &&
    Object.values(recipeOptions).some((optionSchema) => {
      // This should not occur in practice, but it's here for type narrowing
      if (typeof optionSchema === "boolean") {
        return false;
      }

      // We return false here for any option that does not need user input
      // and can be auto-activated in the marketplace activation flow.
      // Options that allow auto-activation:
      // - Database fields with format "preview"
      // TODO: add more safe-default option types here

      if (isDatabaseField(optionSchema) && optionSchema.format === "preview") {
        return false;
      }

      // We require user input for any option that isn't explicitly excluded, so we return true here
      return true;
    });

  const recipeServiceIds = uniq(
    recipe.extensionPoints.flatMap(({ services }) =>
      services ? Object.values(services) : []
    )
  );

  const needsServiceInputs = recipeServiceIds.some((serviceId) => {
    if (serviceId === PIXIEBRIX_SERVICE_ID) {
      return false;
    }

    // eslint-disable-next-line security/detect-object-injection -- serviceId is a registry ID
    const defaultOption = defaultAuthOptions[serviceId];

    // Needs user configuration if there are any non-built-in options available
    return defaultOption?.sharingType !== "built-in";
  });

  return needsOptionsInputs || needsServiceInputs;
}

/**
 * Helper component to conditionally render children that depend on mod definitions.
 */
const RequireMods: React.FC<Props> = ({ modIds, children }) => {
  const modDefinitionsState = useRequiredModDefinitions(modIds);

  const modComponents = useSelector(selectExtensions);

  const authOptionsState = useAuthOptions();

  const state = useDeriveAsyncState(
    modDefinitionsState,
    authOptionsState,
    async (modDefinitions: ModDefinition[], authOptions: AuthOption[]) =>
      Promise.all(
        modDefinitions.map(async (modDefinition) => {
          const defaultAuthOptions = getDefaultAuthOptionsForRecipe(
            modDefinition,
            authOptions
          );

          return {
            modDefinition,
            defaultAuthOptions,
            requiresConfiguration: requiresUserConfiguration(
              modDefinition,
              authOptions
            ),
            includesQuickBar: await includesQuickBarExtensionPoint(
              modDefinition
            ),
            isActive: modComponents.some(
              (x) => x._recipe?.id === modDefinition.metadata.id
            ),
          };
        })
      )
  );

  // Throw error to hit error boundary
  if (state.isError) {
    throw state.error ?? new Error("Error retrieving mods");
  }

  if (state.isLoading) {
    return <Loader />;
  }

  return children(state.data);
};

export default RequireMods;
