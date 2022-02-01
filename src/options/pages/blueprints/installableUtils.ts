/*
 * Copyright (C) 2022 PixieBrix, Inc.
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

import { RecipeDefinition } from "@/types/definitions";
import { IExtension, RegistryId, ResolvedExtension, UUID } from "@/core";
import * as semver from "semver";
import { Organization } from "@/types/contract";
import { Installable, InstallStatus } from "./blueprintsTypes";

export const getSharingType = (
  installable: Installable,
  scope: string
): {
  type: string;
  label: string;
} => {
  let sharingType = "";

  if (isPersonal(installable, scope)) {
    sharingType = "Personal";
  } else if (isDeployment(installable)) {
    sharingType = "Deployment";
  } else if (installable.organization) {
    sharingType = "Team";
  } else if (isPublic(installable)) {
    sharingType = "Public";
  }

  return {
    type: sharingType,
    label: ["Team", "Deployment"].includes(sharingType)
      ? installable.organization.name
      : sharingType,
  };
};

export const isExtension = (
  installable: Installable
): installable is ResolvedExtension & InstallStatus => "_recipe" in installable;

export const isExtensionFromRecipe = (installable: Installable) =>
  isExtension(installable) && Boolean(installable._recipe);

export const isBlueprint = (
  installable: Installable
): installable is RecipeDefinition & InstallStatus => !isExtension(installable);

export const getUniqueId = (installable: Installable) =>
  isExtension(installable) ? installable.id : installable.metadata.id;

export const getLabel = (installable: Installable): string =>
  isExtension(installable) ? installable.label : installable.metadata.name;

export const getDescription = (installable: Installable): string =>
  isExtension(installable)
    ? installable._recipe?.description
    : installable.metadata.description;

export const getPackageId = (installable: Installable): RegistryId =>
  isExtension(installable) ? installable._recipe?.id : installable.metadata.id;

export const getUpdatedAt = (installable: Installable): string =>
  isExtension(installable)
    ? // @ts-expect-error -- need to figure out why updateTimestamp isn't included on IExtension here
      installable._recipe?.updated_at ?? installable.updateTimestamp
    : installable.updated_at;

export const getSharing = (installable: Installable) =>
  isExtension(installable) ? installable._recipe?.sharing : installable.sharing;

export const isPublic = (installable: Installable): boolean =>
  isExtension(installable)
    ? installable._recipe?.sharing?.public
    : installable.sharing.public;

const isPersonalExtension = (extension: IExtension) =>
  !extension._recipe && !extension._deployment;

const hasSourceRecipeWithScope = (extension: IExtension, scope: string) =>
  scope && extension._recipe?.id.startsWith(scope + "/");

const hasRecipeScope = (recipe: RecipeDefinition, scope: string) =>
  Boolean(recipe.metadata?.id.startsWith(scope + "/"));

export const isPersonal = (installable: Installable, userScope: string) => {
  if (isExtension(installable)) {
    return (
      isPersonalExtension(installable) ||
      hasSourceRecipeWithScope(installable, userScope)
    );
  }

  return hasRecipeScope(installable, userScope);
};

export const isDeployment = (installable: Installable) =>
  isExtension(installable) && Boolean(installable._deployment);

export function updateAvailable(
  availableRecipes: RecipeDefinition[],
  extension: ResolvedExtension
): boolean {
  if (!extension._recipe) {
    return false;
  }

  const availableRecipe = availableRecipes?.find(
    (recipe) => recipe.metadata.id === extension._recipe.id
  );

  if (!availableRecipe) {
    return false;
  }

  if (semver.gt(availableRecipe.metadata.version, extension._recipe.version)) {
    return true;
  }

  if (semver.eq(availableRecipe.metadata.version, extension._recipe.version)) {
    // Check the updated_at timestamp
    if (extension._recipe?.updated_at == null) {
      // Extension was installed prior to us adding updated_at to RecipeMetadata
      return false;
    }

    const availableDate = new Date(availableRecipe.updated_at);
    const installedDate = new Date(extension._recipe.updated_at);

    return availableDate > installedDate;
  }

  return false;
}

export const getOrganization = (
  extensionOrRecipe: ResolvedExtension | RecipeDefinition,
  organizations: Organization[]
) => {
  const sharing =
    "_recipe" in extensionOrRecipe
      ? extensionOrRecipe._recipe?.sharing
      : extensionOrRecipe.sharing;

  if (!sharing || sharing.organizations.length === 0) {
    return null;
  }

  // If more than one sharing organization, use the first.
  // This is an uncommon scenario.
  return organizations.find((org) =>
    sharing.organizations.includes(org.id as UUID)
  );
};
