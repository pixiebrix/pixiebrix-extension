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

import type {
  Mod,
  ModActivationStatus,
  ModVersionStatus,
  ModViewItem,
  SharingSource,
} from "../../../../types/modTypes";
import type { ModsPageUserPermissions } from "../modsPageTypes";
import type { RegistryId } from "../../../../types/registryTypes";
import type {
  EditablePackageMetadata,
  MarketplaceListing,
} from "../../../../types/contract";
import { MARKETPLACE_URL } from "../../../../urlConstants";
import { isUnavailableMod } from "../../../../utils/modUtils";

export type BuildModViewItemsInputs = {
  mods: Mod[];
  getActivationStatus: (mod: Mod) => ModActivationStatus;
  getVersionStatus: (mod: Mod) => ModVersionStatus;
  getSharingSource: (mod: Mod) => SharingSource;
  getCanEditModScope: (mod: Mod) => boolean;
  userPermissions: ModsPageUserPermissions;
  listings: Record<RegistryId, MarketplaceListing>;
  editablePackages: EditablePackageMetadata[];
};

const emptyModViewItems: ModViewItem[] = [];

export function buildModViewItems({
  mods,
  getActivationStatus,
  getVersionStatus,
  getSharingSource,
  getCanEditModScope,
  userPermissions,
  listings,
  editablePackages,
}: BuildModViewItemsInputs): ModViewItem[] {
  if (mods.length === 0) {
    return emptyModViewItems;
  }

  const { canPublish, canDeactivate, canEditInWorkshop } = userPermissions;

  return mods.map<ModViewItem>((mod) => {
    const { hasUpdate, activatedModVersion } = getVersionStatus(mod);
    const listingId = listings?.[mod.metadata.id]?.id;
    const marketplaceListingUrl = listingId
      ? `${MARKETPLACE_URL}${listingId}/`
      : null;
    const isUnavailable = isUnavailableMod(mod);
    const sharingSource = getSharingSource(mod);
    const isDeployment = sharingSource.type === "Deployment";
    const isRestricted = isDeployment && !canDeactivate;
    const modActivationStatus = getActivationStatus(mod);
    const isActive =
      modActivationStatus === "Active" || modActivationStatus === "Paused";
    const canEditModScope = getCanEditModScope(mod);
    const packageMetadata = editablePackages?.find(
      ({ name }) => name === mod.metadata.id,
    );
    const showEditInWorkshop =
      canEditInWorkshop && packageMetadata != null && canEditModScope;
    const showDelete = !isActive && packageMetadata != null && canEditModScope;

    return {
      modId: mod.metadata.id,
      editablePackageId: packageMetadata?.id ?? null,
      marketplaceListingUrl,
      name: mod.metadata.name,
      description: mod.metadata.description ?? "",
      sharingSource,
      updatedAt: mod.updated_at,
      status: modActivationStatus,
      hasUpdate,
      activatedModVersion,
      isUnavailable,
      isDeployment,
      modActions: {
        showPublishToMarketplace:
          canPublish && listingId == null && !isUnavailable && !isDeployment,
        showViewDetails: marketplaceListingUrl != null,
        showShareWithTeams: !isUnavailable && !isDeployment,
        showViewLogs: isActive,
        showEditInWorkshop,
        showActivate: modActivationStatus === "Inactive",
        showReactivate: isActive && !isRestricted && !isUnavailable,
        showDeactivate: isActive && !isRestricted,
        showDelete,
      },
    };
  });
}
