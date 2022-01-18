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
import { RegistryId, ResolvedExtension } from "@/core";
import { groupBy } from "lodash";

export type Installable = RecipeDefinition | ResolvedExtension;

export type InstallableInfo = {
  label: string;
  description?: string;
  packageId?: RegistryId;
  updated_at?: string;
  active: boolean;
};

export const groupByRecipe = (installables: Installable[]): Installable[][] =>
  Object.values(
    groupBy(installables, (installable) =>
      isExtension(installable)
        ? installable._recipe?.id ?? installable.id
        : installable.metadata.id
    )
  );

export const isExtension = (
  installable: Installable
): installable is ResolvedExtension => "_recipe" in installable;

export const isExtensionFromRecipe = (installable: Installable) =>
  isExtension(installable) && Boolean(installable._recipe);

export const isBlueprint = (
  installable: Installable
): installable is RecipeDefinition => !isExtension(installable);

export const getUniqueId = (installable: Installable) => {
  return isExtension(installable) ? installable.id : installable.metadata.id;
};

// TODO: instead, make these access methods like getLabel() on an
//  installable class?
export const getInstallableInfo: InstallableInfo = (
  installable: Installable
) => {
  return isExtension(installable)
    ? {
        label: installable.label,
        description: installable._recipe?.description,
        packageId: installable._recipe?.id,
        updated_at:
          installable._recipe?.updated_at ?? installable.updateTimestamp,
        active: installable.active,
      }
    : {
        label: installable.metadata.name,
        description: installable.metadata.description,
        packageId: installable.metadata.id,
        updated_at: installable.updated_at,
        active: installable.active,
      };
};

export const isPublic = (installable: Installable) => {
  if (isExtension(installable)) {
    return installable._recipe?.sharing?.public;
  }

  return installable.sharing.public;
};

const isPersonalBrick = (extension: ResolvedExtension) =>
  !extension._recipe && !extension._deployment;

const isPersonalBlueprint = (extension: ResolvedExtension, scope: string) =>
  scope && extension._recipe?.id.startsWith(scope + "/");

const isPersonalRecipe = (installable: Installable, scope: string) => {
  return installable.metadata.id.includes(scope);
};

export const isPersonal = (installable: Installable, scope: string) => {
  if (isExtension(installable)) {
    return (
      isPersonalBrick(installable) || isPersonalBlueprint(installable, scope)
    );
  }

  return isPersonalRecipe(installable, scope);
};

export const isDeployment = (installable: Installable) => {
  if (isExtension(installable)) {
    return Boolean(installable._deployment);
  }
};

export const getSharing = (installable: Installable) =>
  isExtension(installable) ? installable._recipe?.sharing : installable.sharing;
