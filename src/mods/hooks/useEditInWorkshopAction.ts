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
import { appApi } from "@/data/service/api";
import { isModDefinition } from "@/utils/modUtils";
import useHasModPackageEditPermission from "@/mods/hooks/useHasModPackageEditPermission";
import { useHistory } from "react-router";
import useUserAction from "@/hooks/useUserAction";
import useFlags from "@/hooks/useFlags";

/**
 * Hook returning a callback to a mod in the workshop, or null if mod is not mod package or the user does not have
 * required permissions for the package.
 * @since 2.0.4
 */
function useEditInWorkshopAction(
  modViewItem: ModViewItem,
): (() => void) | null {
  const { permit } = useFlags();
  const { mod } = modViewItem;
  const history = useHistory();
  const canEdit = useHasModPackageEditPermission(modViewItem);

  const [getEditablePackages] =
    appApi.endpoints.getEditablePackages.useLazyQuery();

  const canOpenInWorkshop = permit("workshop") && canEdit;

  const openInWorkshop = useUserAction(
    async () => {
      if (!isModDefinition(mod)) {
        // Should never happen, because useHasModPackageEditPermission returns false for non-packages
        throw new Error("Mod is not a mod package");
      }

      // The mod definition doesn't have the surrogate id, so need to fetch it. We don't have a lookup endpoint,
      // so just fetch them all for now and search locally.
      const editable = await getEditablePackages().unwrap();
      const modPackage = editable.find((x) => x.name === mod.metadata.id);

      if (!modPackage) {
        // Using error instead of BusinessError because the UI should not have shown the user the option to edit
        // the mod in the workshop if they don't have permissions.
        throw new Error("You do not have edit permissions for this mod");
      }

      history.push(`/workshop/bricks/${modPackage.id}`);
    },
    {
      errorMessage: "Error opening mod in the Workshop",
    },
    [getEditablePackages, mod, history],
  );

  return canOpenInWorkshop ? openInWorkshop : null;
}

export default useEditInWorkshopAction;
