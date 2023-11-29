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

import { type ModDefinition } from "@/types/modDefinitionTypes";
import * as semver from "semver";
import { type MarketplaceListing, type Organization } from "@/types/contract";
import {
  type Mod,
  type SharingSource,
  type SharingType,
  type UnavailableMod,
} from "@/types/modTypes";
import { createSelector } from "reselect";
import { selectExtensions } from "@/store/extensionsSelectors";
import {
  type ModComponentBase,
  type ResolvedModComponent,
  type UnresolvedModComponent,
} from "@/types/modComponentTypes";
import { type RegistryId } from "@/types/registryTypes";
import { type UUID } from "@/types/stringTypes";
import { InvalidTypeError } from "@/errors/genericErrors";
import reportError from "@/telemetry/reportError";
import { assert } from "./typeUtils";

/**
 * Returns true if the mod is an UnavailableMod
 * @param mod the mod
 * @see UnavailableMod
 */
export function isUnavailableMod(mod: Mod): mod is UnavailableMod {
  return "isStub" in mod && mod.isStub;
}

/**
 * Returns true if the mod is a ResolvedExtension, instead of a mod definition.
 * @param mod the mod
 */
export function isResolvedModComponent(mod: Mod): mod is ResolvedModComponent {
  return "extensionPointId" in mod;
}

/**
 * Return true if the mod is an ModComponentBase that originated from a recipe.
 * @param mod the mod
 */
export function isModComponentFromRecipe(mod: Mod): boolean {
  return isResolvedModComponent(mod) && Boolean(mod._recipe);
}

/**
 * Return true if the mod is a ModDefinition or UnavailableMod
 * @param mod the mod
 */
export function isModDefinition(
  mod: Mod,
): mod is ModDefinition | UnavailableMod {
  return mod && "kind" in mod && mod.kind === "recipe" && "sharing" in mod;
}

/**
 * Returns a unique id for the mod. Suitable for use as a React key
 * @param mod the mod
 */
export function getUniqueId(mod: Mod): UUID | RegistryId {
  return isResolvedModComponent(mod) ? mod.id : mod.metadata.id;
}

/**
 * Returns the human-readable label for the mod
 * @param mod the mod
 */
export function getLabel(mod: Mod): string {
  return isResolvedModComponent(mod) ? mod.label : mod.metadata.name;
}

/**
 * Returns the description for the mod
 * @param mod the mod
 */
export const getDescription = (mod: Mod): string => {
  if (isResolvedModComponent(mod)) {
    return mod._recipe?.description ?? "Created in the Page Editor";
  }

  return mod.metadata.description ?? "No description";
};

/**
 * Return the registry id associated with a mod, or null
 * @param mod the mod
 */
export function getPackageId(mod: Mod): RegistryId | undefined {
  return isResolvedModComponent(mod) ? mod._recipe?.id : mod.metadata.id;
}

/**
 * Returns the timestamp for the time the mod was last updated (edited)
 * @param mod the mod
 */
export function getUpdatedAt(mod: Mod): string | null {
  return isResolvedModComponent(mod)
    ? // @ts-expect-error -- TODO: need to figure out why updateTimestamp isn't included on ModComponentBase here
      mod._recipe?.updated_at ?? mod.updateTimestamp
    : mod.updated_at;
}

function isPublic(mod: Mod): boolean {
  return isResolvedModComponent(mod)
    ? mod._recipe?.sharing?.public ?? false
    : mod.sharing.public;
}

function isPersonalModComponent(extension: ModComponentBase): boolean {
  return !extension._recipe && !extension._deployment;
}

function hasSourceRecipeWithScope(
  extension: ModComponentBase,
  scope: string,
): boolean {
  return Boolean(scope && extension._recipe?.id.startsWith(scope + "/"));
}

function hasRecipeScope(
  modDefinition: ModDefinition | UnavailableMod,
  scope: string,
) {
  return Boolean(modDefinition.metadata?.id.startsWith(scope + "/"));
}

/**
 * Returns true if the user directly owns the mod
 * @param mod the mod
 * @param userScope the user's scope, or null if it's not set
 */
function isPersonal(mod: Mod, userScope: string | null) {
  if (isResolvedModComponent(mod)) {
    return (
      isPersonalModComponent(mod) ||
      (userScope && hasSourceRecipeWithScope(mod, userScope))
    );
  }

  return userScope && hasRecipeScope(mod, userScope);
}

export function getInstalledVersionNumber(
  installedExtensions: UnresolvedModComponent[],
  mod: Mod,
): string | undefined {
  if (isResolvedModComponent(mod)) {
    return mod._recipe?.version;
  }

  const installedExtension = installedExtensions.find(
    (extension: UnresolvedModComponent) =>
      extension._recipe?.id === mod.metadata.id,
  );

  return installedExtension?._recipe?.version;
}

export function isDeployment(
  mod: Mod,
  installedExtensions: UnresolvedModComponent[],
): boolean {
  if (isResolvedModComponent(mod)) {
    return Boolean(mod._deployment);
  }

  const recipeId = mod.metadata.id;
  return installedExtensions.some(
    (installedExtension) =>
      installedExtension._recipe?.id === recipeId &&
      installedExtension?._deployment,
  );
}

/**
 * Returns true if a mod has been made public but is not yet published to the Marketplace.
 */
export function isRecipePendingPublish(
  recipe: ModDefinition,
  marketplaceListings: Record<RegistryId, MarketplaceListing>,
): boolean {
  return recipe.sharing.public && !marketplaceListings[recipe.metadata.id];
}

export function getSharingSource({
  mod,
  organizations,
  scope,
  installedExtensions,
}: {
  mod: Mod;
  organizations: Organization[];
  scope: string;
  installedExtensions: UnresolvedModComponent[];
}): SharingSource {
  let sharingType: SharingType | null = null;
  const organization = getOrganization(mod, organizations);

  if (!isModDefinition(mod) && !isResolvedModComponent(mod)) {
    const error = new InvalidTypeError(
      "Mod is not a ModDefinition or ResolvedModComponent",
      { mod, organization, scope, installedExtensions },
    );

    reportError(error);

    throw error;
  }

  let label: string;
  if (isPersonal(mod, scope)) {
    sharingType = "Personal";
  } else if (isDeployment(mod, installedExtensions)) {
    sharingType = "Deployment";
    // There's a corner case for team deployments of public market bricks. The organization will come through as
    // nullish here.
    if (organization?.name) {
      label = organization.name;
    }
  } else if (organization) {
    sharingType = "Team";
    label = organization.name;
  } else if (isPublic(mod)) {
    sharingType = "Public";
  }

  assert(sharingType, "Sharing type could not be determined");

  label ??= sharingType;

  return {
    type: sharingType,
    label,
    organization,
  };
}

export function updateAvailable(
  availableRecipes: Map<RegistryId, ModDefinition>,
  installedExtensions: Map<RegistryId, UnresolvedModComponent>,
  mod: Mod,
): boolean {
  if (isUnavailableMod(mod)) {
    // Unavailable mods are never update-able
    return false;
  }

  const installedExtension = isModDefinition(mod)
    ? installedExtensions.get(mod.metadata.id)
    : mod;

  if (!installedExtension?._recipe) {
    return false;
  }

  const availableRecipe = availableRecipes.get(installedExtension._recipe.id);

  if (!availableRecipe) {
    return false;
  }

  // Allow unversioned recipes through without version comparisons
  if (
    !availableRecipe.metadata.version ||
    !installedExtension._recipe.version
  ) {
    return true;
  }

  if (
    semver.gt(
      availableRecipe.metadata.version,
      installedExtension._recipe.version,
    )
  ) {
    return true;
  }

  if (
    semver.eq(
      availableRecipe.metadata.version,
      installedExtension._recipe.version,
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
  mod: Mod,
  organizations: Organization[],
): Organization | undefined {
  const sharing = isResolvedModComponent(mod)
    ? mod._recipe?.sharing
    : mod.sharing;

  if (!sharing || sharing.organizations.length === 0) {
    return undefined;
  }

  // If more than one sharing organization, use the first.
  // This is an uncommon scenario.
  return organizations.find((org) => sharing.organizations.includes(org.id));
}

/**
 * Select UnresolvedExtensions currently installed from the mod.
 */
export const selectExtensionsFromMod = createSelector(
  [selectExtensions, (_state: unknown, mod: Mod) => mod],
  (installedExtensions, mod) =>
    isModDefinition(mod)
      ? installedExtensions.filter(
          (extension) => extension._recipe?.id === mod.metadata.id,
        )
      : installedExtensions.filter((x) => x.id === mod.id),
);
