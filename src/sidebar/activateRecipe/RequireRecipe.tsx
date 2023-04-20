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

import React, { useMemo } from "react";
import { type RegistryId } from "@/types/registryTypes";
import { useRecipe } from "@/recipes/recipesHooks";
import { useGetMarketplaceListingsQuery } from "@/services/api";
import { type RecipeDefinition } from "@/types/recipeTypes";
import Loader from "@/components/Loader";
import styles from "./RequireRecipe.module.scss";
import { useAsyncState } from "@/hooks/common";
import { resolveRecipe } from "@/registry/internal";
import includesQuickBarExtensionPoint from "@/utils/includesQuickBarExtensionPoint";
import { useDefaultAuthsByRequiredServiceIds } from "@/hooks/auth";
import { isEmpty, uniq } from "lodash";
import { PIXIEBRIX_SERVICE_ID } from "@/services/constants";

export type RecipeState = {
  recipe: RecipeDefinition;
  recipeNameNode: React.ReactNode | null;
  includesQuickBar: boolean;
  canAutoActivate: boolean;
};

type RequireRecipeProps = {
  recipeId: RegistryId;
  children: (props: RecipeState) => React.ReactElement;
};

function useCanAutoActivate(recipe: RecipeDefinition | null): {
  canAutoActivate: boolean;
  isLoading: boolean;
} {
  const { builtInServiceAuths, isLoading } =
    useDefaultAuthsByRequiredServiceIds(recipe);

  if (!recipe) {
    return { canAutoActivate: false, isLoading };
  }

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
    return !builtInServiceAuths[serviceId];
  });

  // Can auto-activate if no configuration required, or all services have built-in configurations
  return {
    canAutoActivate: !hasRecipeOptions && !needsServiceInputs,
    isLoading,
  };
}

const RequireRecipe: React.FC<RequireRecipeProps> = ({
  recipeId,
  children,
}) => {
  // Recipe
  const {
    data: recipe,
    isLoading: isLoadingRecipe,
    isUninitialized,
    error: recipeError,
  } = useRecipe(recipeId);

  // Listing
  const {
    data: listings,
    isLoading: isLoadingListing,
    error: listingError,
  } = useGetMarketplaceListingsQuery({ package__name: recipeId });
  // eslint-disable-next-line security/detect-object-injection -- RegistryId
  const listing = useMemo(() => listings?.[recipeId], [listings, recipeId]);

  // Can auto-activate
  const { canAutoActivate, isLoading: isAutoActivateLoading } =
    useCanAutoActivate(recipe);

  // Name component
  const recipeName =
    listing?.package?.verbose_name ?? listing?.package?.name ?? "Unnamed mod";

  // Quick Bar
  const [includesQuickbar, isLoadingQuickbar] = useAsyncState(async () => {
    const resolvedRecipeConfigs = await resolveRecipe(
      recipe,
      recipe.extensionPoints
    );
    return includesQuickBarExtensionPoint(resolvedRecipeConfigs);
  }, [recipe]);

  // Throw errors
  if (recipeError) {
    throw recipeError;
  }

  if (listingError) {
    throw listingError;
  }

  // Ensure recipe is loaded
  if (!isUninitialized && !isLoadingRecipe && !recipeError && !recipe) {
    throw new Error(`Recipe ${recipeId} not found`);
  }

  // Loading state
  const isLoading =
    isUninitialized ||
    isLoadingRecipe ||
    isLoadingListing ||
    isLoadingQuickbar ||
    isAutoActivateLoading;

  if (isLoading) {
    return <Loader />;
  }

  const recipeState: RecipeState = {
    recipe,
    recipeNameNode: <div className={styles.recipeName}>{recipeName}</div>,
    includesQuickBar: includesQuickbar,
    canAutoActivate,
  };

  return children(recipeState);
};

export default RequireRecipe;
