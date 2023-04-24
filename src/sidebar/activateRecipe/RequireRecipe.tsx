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
import { type WizardValues } from "@/activation/wizardTypes";
import { collectPermissions } from "@/permissions";
import { containsPermissions } from "@/background/messenger/api";
import { getDefaultAuthOptionsForRecipe, useAuthOptions } from "@/hooks/auth";
import { isEmpty, uniq } from "lodash";
import { PIXIEBRIX_SERVICE_ID } from "@/services/constants";

export type RecipeState = {
  recipe: RecipeDefinition;
  recipeNameNode: React.ReactNode | null;
  includesQuickBar: boolean;
  needsPermissions: (formValues: WizardValues) => Promise<boolean>;
  canAutoActivate: boolean;
};

type RequireRecipeProps = {
  recipeId: RegistryId;
  children: (props: RecipeState) => React.ReactElement;
};

// Exported for testing
export async function getIncludesQuickBarAndNeedsPermissionForRecipe(
  recipe: RecipeDefinition
): Promise<{
  includesQuickBar: boolean;
  needsPermissions: (formValues: WizardValues) => Promise<boolean>;
}> {
  const resolvedRecipeConfigs = await resolveRecipe(
    recipe,
    recipe.extensionPoints
  );
  const includesQuickBar = await includesQuickBarExtensionPoint(
    resolvedRecipeConfigs
  );
  const needsPermissions = async (formValues: WizardValues) => {
    const serviceAuths = formValues.services.filter(({ config }) =>
      Boolean(config)
    );
    const collectedPermissions = await collectPermissions(
      resolvedRecipeConfigs,
      serviceAuths
    );
    const hasPermissions = await containsPermissions(collectedPermissions);
    return !hasPermissions;
  };

  return { includesQuickBar, needsPermissions };
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

  // Name component
  const recipeName =
    listing?.package?.verbose_name ?? listing?.package?.name ?? "Unnamed mod";

  // Quick Bar & Permissions
  const [
    quickBarAndPermissions,
    isLoadingQuickBarAndPermissions,
    quickBarAndPermissionsError,
  ] = useAsyncState(async () => {
    if (!recipe) {
      return null;
    }

    return getIncludesQuickBarAndNeedsPermissionForRecipe(recipe);
  }, [recipe]);

  // Auth Options
  const { authOptions, isLoading: isLoadingAuthOptions } = useAuthOptions();

  // Throw errors
  if (recipeError) {
    throw recipeError;
  }

  if (listingError) {
    throw listingError;
  }

  if (quickBarAndPermissionsError) {
    throw quickBarAndPermissionsError;
  }

  // Ensure recipe is loaded
  if (
    !isUninitialized &&
    !isLoadingRecipe &&
    !isLoadingAuthOptions &&
    !recipeError &&
    !recipe
  ) {
    throw new Error(`Recipe ${recipeId} not found`);
  }

  // Loading state
  const isLoading =
    isUninitialized ||
    isLoadingRecipe ||
    isLoadingListing ||
    isLoadingQuickBarAndPermissions;

  if (isLoading) {
    return <Loader />;
  }

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

  const recipeState: RecipeState = {
    recipe,
    recipeNameNode: <div className={styles.recipeName}>{recipeName}</div>,
    includesQuickBar: quickBarAndPermissions?.includesQuickBar,
    needsPermissions: quickBarAndPermissions?.needsPermissions,
    canAutoActivate,
  };

  return children(recipeState);
};

export default RequireRecipe;
