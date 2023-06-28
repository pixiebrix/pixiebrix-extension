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
import { type Organization } from "@/types/contract";
import { type ResolvedExtension } from "@/types/extensionTypes";
import { type RegistryId } from "@/types/registryTypes";

/**
 * @deprecated
 * A mod that has been deleted (or user no longer has access) from the registry, but is still installed locally.
 * @since 1.7.22
 */
export type UnavailableMod = Pick<
  ModDefinition,
  "kind" | "metadata" | "updated_at" | "sharing"
> & {
  isStub: true;
};

// XXX: should this be UnresolvedExtension instead of ResolvedExtension? The old screens used ResolvedExtension
export type Mod = ModDefinition | ResolvedExtension | UnavailableMod;

export type SharingType = "Personal" | "Team" | "Public" | "Deployment";
export type SharingSource = {
  type: SharingType;
  label: string;
  organization: Organization;
};

export type ModStatus =
  | "Active"
  | "Inactive"
  // The mod comes from a deployment that has been paused
  | "Paused";

// Reshaped Mod to easily filter, sort, and group Mods
export type ModViewItem = {
  name: string;
  description: string;
  sharing: {
    packageId: RegistryId;
    source: SharingSource;
    listingId: string | null;
  };
  updatedAt: string;
  status: ModStatus;
  hasUpdate: boolean;
  installedVersionNumber: string;
  // Used to get Mod actions from useModActions
  mod: Mod;
  /**
   * True if the source package is no longer available
   */
  unavailable: boolean;
};
