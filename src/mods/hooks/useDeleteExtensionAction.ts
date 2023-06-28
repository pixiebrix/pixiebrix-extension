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

import { type ModViewItem } from "@/mods/modTypes";
import { useModals } from "@/components/ConfirmationModal";
import { useDeleteCloudExtensionMutation } from "@/services/api";
import { getLabel, isExtension, isModDefinition } from "@/utils/modUtils";
import useUserAction from "@/hooks/useUserAction";
import { CancelError } from "@/errors/businessErrors";

function useDeleteExtensionAction(modViewItem: ModViewItem): () => void | null {
  const { mod, sharing, status } = modViewItem;
  const modals = useModals();
  const [deleteCloudExtension] = useDeleteCloudExtensionMutation();
  const isActive = status === "Active" || status === "Paused";

  const isCloudExtension =
    isExtension(mod) &&
    sharing.source.type === "Personal" &&
    // If the status is active, there is still likely a copy of the extension saved on our server. But the point
    // this check is for extensions that aren't also installed locally
    !isActive;

  const deleteExtension = useUserAction(
    async () => {
      if (isModDefinition(mod)) {
        return;
      }

      const confirmed = await modals.showConfirmation({
        title: "Permanently Delete?",
        message: "Permanently delete the brick from your account?",
        submitCaption: "Delete",
        cancelCaption: "Back to Safety",
      });

      if (!confirmed) {
        throw new CancelError();
      }

      await deleteCloudExtension({ extensionId: mod.id }).unwrap();
    },
    {
      successMessage: `Deleted mod ${getLabel(mod)} from your account`,
      errorMessage: `Error deleting mod ${getLabel(mod)} from your account`,
      event: "ExtensionCloudDelete",
    },
    [modals]
  );

  return isCloudExtension ? deleteExtension : null;
}

export default useDeleteExtensionAction;
