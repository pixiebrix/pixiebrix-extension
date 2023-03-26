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

import { type RegistryId, type ResolvedExtension } from "@/core";
import { type TableInstance } from "react-table";
import { type RecipeDefinition } from "@/types/definitions";
import { type ReactNode } from "react";
import { type Organization } from "@/types/contract";

/**
 * A recipe that has been deleted (or user no longer has access) from the registry, but is still installed locally.
 * @since 1.7.22
 */
export type UnavailableRecipe = Pick<
  RecipeDefinition,
  "kind" | "metadata" | "updated_at" | "sharing"
> & {
  isStub: true;
};

// XXX: should this be UnresolvedExtension instead of ResolvedExtension? The old screens used ResolvedExtension
export type Installable =
  | RecipeDefinition
  | ResolvedExtension
  | UnavailableRecipe;

export type SharingType = "Personal" | "Team" | "Public" | "Deployment";
export type SharingSource = {
  type: SharingType;
  label: string;
  organization: Organization;
};

export type InstallableStatus =
  | "Active"
  | "Inactive"
  // The installable is a deployment that has been paused
  | "Paused"
  // The IExtension(s) for a mod are installed, but the user no longer has access to the source mod
  | "Unavailable";

// Reshaped Installable to easily filter, sort, and group Installables
export type InstallableViewItem = {
  name: string;
  description: string;
  sharing: {
    packageId: RegistryId;
    source: SharingSource;
    listingId: string | null;
  };
  updatedAt: string;
  status: InstallableStatus;
  hasUpdate: boolean;
  installedVersionNumber: string;
  icon: ReactNode;
  // Used to get Installable actions from useInstallableActions
  installable: Installable;
};

export type BlueprintsPageContentProps = {
  tableInstance: TableInstance<InstallableViewItem>;
  width: number;
  height: number;
};
