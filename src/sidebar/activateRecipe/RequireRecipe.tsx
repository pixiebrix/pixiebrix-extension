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
import { useRequiredRecipe } from "@/recipes/recipesHooks";
import { type RecipeDefinition } from "@/types/recipeTypes";
import Loader from "@/components/Loader";
import styles from "./RequireRecipe.module.scss";
import includesQuickBarExtensionPoint from "@/utils/includesQuickBarExtensionPoint";
import { getDefaultAuthOptionsForRecipe, useAuthOptions } from "@/hooks/auth";
import { isEmpty, uniq } from "lodash";
import { PIXIEBRIX_SERVICE_ID } from "@/services/constants";
import { type AuthOption } from "@/auth/authTypes";
import useDeriveAsyncState from "@/hooks/useDeriveAsyncState";
import { isDatabaseField } from "@/components/fields/schemaFields/fieldTypeCheckers";

export type RecipeState = {
  recipe: RecipeDefinition;
  recipeNameNode: React.ReactNode;
  includesQuickBar: boolean;
  requiresConfiguration: boolean;
  defaultAuthOptions: Record<RegistryId, AuthOption>;
};

type Props = {
  recipeId: RegistryId;
  children: (props: RecipeState) => React.ReactElement;
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
  recipe: RecipeDefinition,
  authOptions: AuthOption[]
): boolean {
  const defaultAuthOptions = getDefaultAuthOptionsForRecipe(
    recipe,
    authOptions
  );

  const recipeOptions = recipe.options?.schema?.properties ?? {};

  // Options that allow auto-activation:
  // - Database fields with format "preview"
  const needsOptionsInputs =
    !isEmpty(recipeOptions) &&
    Object.values(recipeOptions).some((optionSchema) => {
      if (typeof optionSchema === "boolean") {
        return false;
      }

      // Exclude preview database fields
      if (isDatabaseField(optionSchema) && optionSchema.format === "preview") {
        return false;
      }

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
 * Helper component to render children that depend on a recipe and its metadata.
 */
const RequireRecipe: React.FC<Props> = ({ recipeId, children }) => {
  const recipeDefinitionState = useRequiredRecipe(recipeId);

  const authOptionsState = useAuthOptions();

  const state = useDeriveAsyncState(
    recipeDefinitionState,
    authOptionsState,
    async (recipe: RecipeDefinition, authOptions: AuthOption[]) => {
      const defaultAuthOptions = getDefaultAuthOptionsForRecipe(
        recipe,
        authOptions
      );

      return {
        recipe,
        defaultAuthOptions,
        requiresConfiguration: requiresUserConfiguration(recipe, authOptions),
        includesQuickBar: await includesQuickBarExtensionPoint(recipe),
        recipeNameNode: (
          <div className={styles.recipeName}>{recipe.metadata.name}</div>
        ),
      };
    }
  );

  // Throw error to hit error boundary
  if (state.isError) {
    throw state.error ?? new Error("Error retrieving mod");
  }

  if (state.isLoading) {
    return <Loader />;
  }

  return children(state.data);
};

export default RequireRecipe;
