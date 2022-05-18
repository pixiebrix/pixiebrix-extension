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
import {
  IExtension,
  RegistryId,
  ResolvedExtension,
  UnresolvedExtension,
  UUID,
} from "@/core";
import * as semver from "semver";
import { Organization } from "@/types/contract";
import {
  Installable,
  SharingSource,
  SharingType,
} from "@/options/pages/blueprints/blueprintsTypes";
import { createSelector } from "reselect";
import { selectExtensions } from "@/store/extensionsSelectors";

export const isExtension = (
  installable: Installable
): installable is ResolvedExtension => "extensionPointId" in installable;

export const isExtensionFromRecipe = (installable: Installable) =>
  isExtension(installable) && Boolean(installable._recipe);

export const isBlueprint = (
  installable: Installable
): installable is RecipeDefinition => !isExtension(installable);

export const getUniqueId = (installable: Installable): UUID | RegistryId =>
  isExtension(installable) ? installable.id : installable.metadata.id;

export const getLabel = (installable: Installable): string =>
  isExtension(installable) ? installable.label : installable.metadata.name;

export const getDescription = (installable: Installable): string => {
  let description = isExtension(installable)
    ? installable._recipe?.description
    : installable.metadata.description;

  if (!description && isExtension(installable)) {
    description = "Created in the Page Editor";
  }

  return description;
};

export const getPackageId = (installable: Installable): RegistryId =>
  isExtension(installable) ? installable._recipe?.id : installable.metadata.id;

export const getUpdatedAt = (installable: Installable): string =>
  isExtension(installable)
    ? // @ts-expect-error -- need to figure out why updateTimestamp isn't included on IExtension here
      installable._recipe?.updated_at ?? installable.updateTimestamp
    : installable.updated_at;

export const getSharing = (installable: Installable) =>
  isExtension(installable) ? installable._recipe?.sharing : installable.sharing;

export const isShared = (installable: Installable) => {
  const sharing = getSharing(installable);
  return sharing?.organizations?.length > 0 || sharing?.public;
};

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

export const getInstalledVersionNumber = (
  installedExtensions: UnresolvedExtension[],
  installable: Installable
): string | null => {
  if (isExtension(installable)) {
    return installable._recipe?.version;
  }

  const installedExtension = installedExtensions.find(
    (extension: UnresolvedExtension) =>
      extension._recipe?.id === installable.metadata.id
  );

  return installedExtension?._recipe?.version;
};

export const isDeployment = (
  installable: Installable,
  installedExtensions: UnresolvedExtension[]
) => {
  if (isExtension(installable)) {
    return Boolean(installable._deployment);
  }

  const recipeId = installable.metadata.id;
  return installedExtensions.some(
    (installedExtension) =>
      installedExtension._recipe?.id === recipeId &&
      installedExtension?._deployment
  );
};

export const getSharingType = ({
  installable,
  organizations,
  scope,
  installedExtensions,
}: {
  installable: Installable;
  organizations: Organization[];
  scope: string;
  installedExtensions: UnresolvedExtension[];
}): SharingSource => {
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
};

export function updateAvailable(
  availableRecipes: RecipeDefinition[],
  installedExtensions: UnresolvedExtension[],
  installable: Installable
): boolean {
  let installedExtension: ResolvedExtension | UnresolvedExtension = null;

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

export const getOrganization = (
  installable: Installable,
  organizations: Organization[]
) => {
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
};

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
