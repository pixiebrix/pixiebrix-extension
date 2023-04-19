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

export type RecipeState = {
  recipe: RecipeDefinition;
  recipeNameNode: React.ReactNode | null;
  includesQuickBar: boolean;
};

type RequireRecipeProps = {
  recipeId: RegistryId;
  children: (recipeState: RecipeState) => React.ReactNode;
};

const RequireRecipe: React.FC<RequireRecipeProps> = ({ recipeId }) => {
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
    isUninitialized || isLoadingRecipe || isLoadingListing || isLoadingQuickbar;

  if (isLoading) {
    return <Loader />;
  }

  const recipeState: RecipeState = {
    recipe,
    recipeNameNode: <div className={styles.recipeName}>{recipeName}</div>,
    includesQuickBar: includesQuickbar,
  };

  return children(recipeState);
};

export default RequireRecipe;
