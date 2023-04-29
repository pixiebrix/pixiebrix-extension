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
import { useGetMarketplaceListingsQuery } from "@/services/api";
import { type RecipeDefinition } from "@/types/recipeTypes";
import Loader from "@/components/Loader";
import styles from "./RequireRecipe.module.scss";
import { resolveRecipe } from "@/registry/internal";
import includesQuickBarExtensionPoint from "@/utils/includesQuickBarExtensionPoint";
import { getDefaultAuthOptionsForRecipe, useAuthOptions } from "@/hooks/auth";
import { isEmpty, uniq } from "lodash";
import { PIXIEBRIX_SERVICE_ID } from "@/services/constants";
import { type AuthOption } from "@/auth/authTypes";
import { type MarketplaceListing } from "@/types/contract";
import useDeriveAsyncState from "@/hooks/useDeriveAsyncState";

export type RecipeState = {
  recipe: RecipeDefinition;
  recipeNameNode: React.ReactNode | null;
  includesQuickBar: boolean;
  canAutoActivate: boolean;
  defaultAuthOptions: Record<RegistryId, AuthOption>;
};

type RequireRecipeProps = {
  recipeId: RegistryId;
  children: (props: RecipeState) => React.ReactElement;
};

const RequireRecipe: React.FC<RequireRecipeProps> = ({
  recipeId,
  children,
}) => {
  const recipeDefinitionState = useRequiredRecipe(recipeId);
  const listingsState = useGetMarketplaceListingsQuery({
    package__name: recipeId,
  });
  // FIXME: useAuthOptions returns empty remote auths initially. Is that OK?
  const authOptionsState = useAuthOptions();

  const derivedState = useDeriveAsyncState(
    recipeDefinitionState,
    listingsState,
    authOptionsState,
    async (
      recipe: RecipeDefinition,
      listings: Record<RegistryId, MarketplaceListing>,
      authOptions: AuthOption[]
    ) => {
      const resolvedRecipeConfigs = await resolveRecipe(
        recipe,
        recipe.extensionPoints
      );

      return {
        recipe,
        listings,
        authOptions,
        includesQuickBar: await includesQuickBarExtensionPoint(
          resolvedRecipeConfigs
        ),
      };
    }
  );

  // Throw errors
  if (derivedState.isError) {
    throw derivedState.error ?? new Error("Error retrieving mod");
  }

  if (derivedState.isLoading) {
    return <Loader />;
  }

  const { recipe, listings, authOptions, includesQuickBar } = derivedState.data;

  // eslint-disable-next-line security/detect-object-injection -- RegistryId
  const listing = listings[recipeId];

  // Name component
  const recipeName =
    listing?.package?.verbose_name ?? listing?.package?.name ?? "Unnamed mod";

  // Calculate canAutoActivate
  const defaultAuthOptions = getDefaultAuthOptionsForRecipe(
    recipe,
    authOptions
  );

  const hasRecipeOptions = !isEmpty(recipe.options?.schema?.properties);

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

  // Can auto-activate if no configuration required
  const canAutoActivate = !hasRecipeOptions && !needsServiceInputs;

  return children({
    recipe,
    recipeNameNode: <div className={styles.recipeName}>{recipeName}</div>,
    includesQuickBar,
    canAutoActivate,
    defaultAuthOptions,
  });
};

export default RequireRecipe;
