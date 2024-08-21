/*
 * Copyright (C) 2024 PixieBrix, Inc.
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
import { type RegistryId, type SemVerString } from "@/types/registryTypes";
import { type Nullishable } from "@/utils/nullishUtils";
import { type Timestamp, type UUID } from "@/types/stringTypes";

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

export type Mod = ModDefinition | UnavailableMod;

export type SharingType =
  | "Personal"
  | "Team"
  | "Public"
  | "Deployment"
  | "Unknown";

export type SharingSource = {
  type: SharingType;
  label: string;
  organization?: Nullishable<Organization>;
};

export type ModActivationStatus =
  | "Active"
  | "Inactive"
  // The mod comes from a deployment that has been paused
  | "Paused";

export type ModVersionStatus = {
  hasUpdate: boolean;
  activatedModVersion: SemVerString | null;
};

export type ModActionsEnabled = {
  showPublishToMarketplace: boolean;
  showViewDetails: boolean;
  showShareWithTeams: boolean;
  showViewLogs: boolean;
  showEditInWorkshop: boolean;
  showActivate: boolean;
  showReactivate: boolean;
  showDeactivate: boolean;
  showDelete: boolean;
};

// Reshaped Mod to easily filter, sort, and group Mods
export type ModViewItem = {
  modId: RegistryId;
  editablePackageId: UUID | null;
  marketplaceListingUrl: string | null;
  name: string;
  description: string;
  sharingSource: SharingSource;
  updatedAt: Timestamp;
  status: ModActivationStatus;
  hasUpdate: boolean;
  activatedModVersion: SemVerString | null;
  /**
   * True if the source package is no longer available
   */
  isUnavailable: boolean;
  modActions: ModActionsEnabled;
};

/**
 * A mod id with activation configuration.
 * @since 1.8.8
 */
export type ModActivationConfig = {
  /**
   * The mod to activate.
   */
  modId: RegistryId;
  /**
   * Initial activation options. Have not been validated yet.
   */
  initialOptions: UnknownObject;
};
