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

import { RegistryId, ResolvedExtension } from "@/core";
import { TableInstance } from "react-table";
import { RecipeDefinition } from "@/types/definitions";
import { ReactNode } from "react";
import { MeOrganization } from "@/types/contract";

// XXX: should this be UnresolvedExtension instead of ResolvedExtension? The old screens used ResolvedExtension
export type Installable = RecipeDefinition | ResolvedExtension;

export type SharingType = "Personal" | "Team" | "Public" | "Deployment";
export type SharingSource = {
  type: SharingType;
  label: string;
  organization: MeOrganization;
};

export type InstallableStatus = "Active" | "Inactive";

// Reshaped Installable to easily filter, sort, and group Installables
export type InstallableViewItem = {
  name: string;
  description: string;
  sharing: {
    packageId: RegistryId;
    source: SharingSource;
  };
  updatedAt: string;
  status: InstallableStatus;
  hasUpdate: boolean;
  installedVersionNumber: string;
  icon: ReactNode;
  // Used to get Installable actions from useInstallableActions
  installable: Installable;
};

export type BlueprintListViewProps = {
  tableInstance: TableInstance<InstallableViewItem>;
  width: number;
  height: number;
};
