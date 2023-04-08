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

import { type RecipeDefinition } from "@/types/recipeTypes";
import * as semver from "semver";
import { type MarketplaceListing, type Organization } from "@/types/contract";
import {
  type Installable,
  type SharingSource,
  type SharingType,
  type UnavailableRecipe,
} from "@/extensionConsole/pages/blueprints/blueprintsTypes";
import { createSelector } from "reselect";
import { selectExtensions } from "@/store/extensionsSelectors";
import {
  IExtension,
  ResolvedExtension,
  UnresolvedExtension,
} from "@/types/extensionTypes";
import { RegistryId } from "@/types/registryTypes";
import { UUID } from "@/types/stringTypes";

/**
 * Returns true if installable is an UnavailableRecipe
 * @param installable the installable
 * @see UnavailableRecipe
 */
export function isUnavailableRecipe(
  installable: Installable
): installable is UnavailableRecipe {
  return "isStub" in installable && installable.isStub;
}

/**
 * Returns true if the installable is a singleton extension, not a recipe.
 * @param installable the installable
 */
export function isExtension(
  installable: Installable
): installable is ResolvedExtension {
  return "extensionPointId" in installable;
}

/**
 * Return true if the installable is an IExtension that originated from a recipe.
 * @param installable the installable
 */
export function isExtensionFromRecipe(installable: Installable): boolean {
  return isExtension(installable) && Boolean(installable._recipe);
}

/**
 * Return true if the installable is a RecipeDefinition or UnavailableRecipe
 * @param installable the installable
 */
export function isBlueprint(
  installable: Installable
): installable is RecipeDefinition | UnavailableRecipe {
  return !isExtension(installable);
}

/**
 * Returns a unique id for the installable. Suitable for use as a React key
 * @param installable the installable
 */
export function getUniqueId(installable: Installable): UUID | RegistryId {
  return isExtension(installable) ? installable.id : installable.metadata.id;
}

/**
 * Returns the human-readable label for the installable
 * @param installable the installable
 */
export function getLabel(installable: Installable): string {
  return isExtension(installable)
    ? installable.label
    : installable.metadata.name;
}

export const getDescription = (installable: Installable): string => {
  const description = isExtension(installable)
    ? installable._recipe?.description
    : installable.metadata.description;

  if (!description && isExtension(installable)) {
    return "Created in the Page Editor";
  }

  return description;
};

/**
 * Return the registry id associated with an installable, or null
 * @param installable the installable
 */
export function getPackageId(installable: Installable): RegistryId | null {
  return isExtension(installable)
    ? installable._recipe?.id
    : installable.metadata.id;
}

export function getUpdatedAt(installable: Installable): string | null {
  return isExtension(installable)
    ? // @ts-expect-error -- TODO: need to figure out why updateTimestamp isn't included on IExtension here
      installable._recipe?.updated_at ?? installable.updateTimestamp
    : installable.updated_at;
}

function isPublic(installable: Installable): boolean {
  return isExtension(installable)
    ? installable._recipe?.sharing?.public
    : installable.sharing.public;
}

function isPersonalExtension(extension: IExtension): boolean {
  return !extension._recipe && !extension._deployment;
}

function hasSourceRecipeWithScope(
  extension: IExtension,
  scope: string
): boolean {
  return scope && extension._recipe?.id.startsWith(scope + "/");
}

function hasRecipeScope(
  recipe: RecipeDefinition | UnavailableRecipe,
  scope: string
) {
  return Boolean(recipe.metadata?.id.startsWith(scope + "/"));
}

/**
 * Returns true if the user directly owns the installable
 * @param installable the installable
 * @param userScope the user's scope, or null if it's not set
 */
function isPersonal(installable: Installable, userScope: string | null) {
  if (isExtension(installable)) {
    return (
      isPersonalExtension(installable) ||
      hasSourceRecipeWithScope(installable, userScope)
    );
  }

  return hasRecipeScope(installable, userScope);
}

export function getInstalledVersionNumber(
  installedExtensions: UnresolvedExtension[],
  installable: Installable
): string | null {
  if (isExtension(installable)) {
    return installable._recipe?.version;
  }

  const installedExtension = installedExtensions.find(
    (extension: UnresolvedExtension) =>
      extension._recipe?.id === installable.metadata.id
  );

  return installedExtension?._recipe?.version;
}

export function isDeployment(
  installable: Installable,
  installedExtensions: UnresolvedExtension[]
): boolean {
  if (isExtension(installable)) {
    return Boolean(installable._deployment);
  }

  const recipeId = installable.metadata.id;
  return installedExtensions.some(
    (installedExtension) =>
      installedExtension._recipe?.id === recipeId &&
      installedExtension?._deployment
  );
}

/**
 * Returns true if a Blueprint has been made public but is not yet published to the Marketplace.
 */
export function isRecipePendingPublish(
  recipe: RecipeDefinition,
  marketplaceListings: Record<RegistryId, MarketplaceListing>
): boolean {
  return recipe.sharing.public && !marketplaceListings[recipe.metadata.id];
}

export function getSharingType({
  installable,
  organizations,
  scope,
  installedExtensions,
}: {
  installable: Installable;
  organizations: Organization[];
  scope: string;
  installedExtensions: UnresolvedExtension[];
}): SharingSource {
  let sharingType: SharingType = null;
  const organization = getOrganization(installable, organizations);

  if (isPersonal(installable, scope)) {
    sharingType = "Personal";
  } else if (isDeployment(installable, installedExtensions)) {
    sharingType = "Deployment";
  } else if (organization) {
    sharingType = "Team";
  } else if (isPublic(installable)) {
    sharingType = "Public";
  }

  let label: string;
  if (
    sharingType === "Team" ||
    // There's a corner case for team deployments of public market bricks. The organization will come through as
    // nullish here.
    (sharingType === "Deployment" && organization?.name)
  ) {
    label = organization.name;
  } else {
    label = sharingType;
  }

  return {
    type: sharingType,
    label,
    organization,
  };
}

export function updateAvailable(
  availableRecipes: RecipeDefinition[],
  installedExtensions: UnresolvedExtension[],
  installable: Installable
): boolean {
  let installedExtension: ResolvedExtension | UnresolvedExtension = null;

  if (isUnavailableRecipe(installable)) {
    // Unavailable recipes are never update-able
    return false;
  }

  if (isBlueprint(installable)) {
    installedExtension = installedExtensions?.find(
      (extension) => extension._recipe?.id === installable.metadata.id
    );
  } else {
    installedExtension = installable;
  }

  if (!installedExtension?._recipe) {
    return false;
  }

  const availableRecipe = availableRecipes?.find(
    (recipe) => recipe.metadata.id === installedExtension._recipe.id
  );

  if (!availableRecipe) {
    return false;
  }

  if (
    semver.gt(
      availableRecipe.metadata.version,
      installedExtension._recipe.version
    )
  ) {
    return true;
  }

  if (
    semver.eq(
      availableRecipe.metadata.version,
      installedExtension._recipe.version
    )
  ) {
    // Check the updated_at timestamp
    if (installedExtension._recipe?.updated_at == null) {
      // Extension was installed prior to us adding updated_at to RecipeMetadata
      return false;
    }

    const availableDate = new Date(availableRecipe.updated_at);
    const installedDate = new Date(installedExtension._recipe.updated_at);

    return availableDate > installedDate;
  }

  return false;
}

function getOrganization(
  installable: Installable,
  organizations: Organization[]
): Organization {
  const sharing = isExtension(installable)
    ? installable._recipe?.sharing
    : installable.sharing;

  if (!sharing || sharing.organizations.length === 0) {
    return null;
  }

  // If more than one sharing organization, use the first.
  // This is an uncommon scenario.
  return organizations.find((org) =>
    sharing.organizations.includes(org.id as UUID)
  );
}

/**
 * Select UnresolvedExtensions currently installed from the installable.
 */
export const selectExtensionsFromInstallable = createSelector(
  [selectExtensions, (state: unknown, installable: Installable) => installable],
  (installedExtensions, installable) =>
    isBlueprint(installable)
      ? installedExtensions.filter(
          (extension) => extension._recipe?.id === installable.metadata.id
        )
      : installedExtensions.filter((x) => x.id === installable.id)
);
