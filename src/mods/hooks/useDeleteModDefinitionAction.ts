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

import { type ModViewItem } from "@/types/modTypes";
import { useModals } from "@/components/ConfirmationModal";
import { appApi, useDeletePackageMutation } from "@/data/service/api";
import { getLabel, isModDefinition } from "@/utils/modUtils";
import useUserAction from "@/hooks/useUserAction";
import { CancelError } from "@/errors/businessErrors";
import { Events } from "@/telemetry/events";
import useHasModPackageEditPermission from "@/mods/hooks/useHasModPackageEditPermission";

/**
 * Hook returning a user action to delete a mod definition, or null if mod is not mod package or the user does not have
 * required permissions for the package.
 * @see useDeleteStandaloneModDefinitionAction
 * @since 2.0.4
 */
function useDeleteModDefinitionAction(
  modViewItem: ModViewItem,
): (() => void) | null {
  const { mod, status } = modViewItem;
  const modals = useModals();
  const hasEditPermissions = useHasModPackageEditPermission(modViewItem);
  const [getEditablePackages] =
    appApi.endpoints.getEditablePackages.useLazyQuery();
  const [deletePackage] = useDeletePackageMutation();

  const isActive = status === "Active" || status === "Paused";
  const canDelete = hasEditPermissions && !isActive;

  const deleteMod = useUserAction(
    async () => {
      if (!isModDefinition(mod)) {
        // Should never happen, because useHasModPackageEditPermission returns false for non-packages
        throw new Error("Mod is not a mod definition");
      }

      // The mod definition doesn't have the surrogate id, so need to fetch it. We don't have a lookup endpoint,
      // so just fetch them all for now and search locally.
      const editable = await getEditablePackages().unwrap();
      const modPackage = editable.find((x) => x.name === mod.metadata.id);

      if (!modPackage) {
        throw new Error("You do not have edit permissions for this mod");
      }

      const confirmed = await modals.showConfirmation({
        title: "Permanently Delete?",
        message: "Permanently delete the mod from the package registry?",
        submitCaption: "Delete",
        cancelCaption: "Back to Safety",
      });

      if (!confirmed) {
        throw new CancelError();
      }

      await deletePackage({ id: modPackage.id }).unwrap();
    },
    {
      successMessage: `Deleted mod ${getLabel(mod)} from the package registry`,
      errorMessage: `Error deleting mod ${getLabel(
        mod,
      )} from the package registry`,
      event: Events.PACKAGE_DELETE,
    },
    [modals, mod],
  );

  return canDelete ? deleteMod : null;
}

export default useDeleteModDefinitionAction;
