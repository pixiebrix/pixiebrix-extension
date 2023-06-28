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

import { type InstallableViewItem } from "@/mods/modTypes";
import { useDispatch } from "react-redux";
import { getPackageId, isExtension } from "@/utils/installableUtils";
import {
  blueprintModalsSlice,
  type ShareContext,
} from "@/extensionConsole/pages/blueprints/modals/blueprintModalsSlice";

function useViewShareAction(
  installableViewItem: InstallableViewItem
): () => void | null {
  const { installable, unavailable, sharing } = installableViewItem;
  const dispatch = useDispatch();
  const isInstallableBlueprint = !isExtension(installable);
  const isDeployment = sharing.source.type === "Deployment";

  const viewShare = () => {
    const shareContext: ShareContext = isInstallableBlueprint
      ? {
          blueprintId: getPackageId(installable),
        }
      : {
          extensionId: installable.id,
        };

    dispatch(blueprintModalsSlice.actions.setShareContext(shareContext));
  };

  // Deployment sharing is controlled via the Admin Console
  return isDeployment || unavailable ? null : viewShare;
}

export default useViewShareAction;
