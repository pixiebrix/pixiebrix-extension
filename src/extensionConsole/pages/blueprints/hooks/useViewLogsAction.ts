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

import { type InstallableViewItem } from "@/installables/installableTypes";
import { useDispatch } from "react-redux";
import { getLabel, isExtension } from "@/utils/installableUtils";
import { blueprintModalsSlice } from "@/extensionConsole/pages/blueprints/modals/blueprintModalsSlice";
import { selectExtensionContext } from "@/extensionPoints/helpers";
import { type ActionCallback } from "@/extensionConsole/pages/blueprints/hooks/useBlueprintsPageActions";

function useViewLogsAction(
  installableViewItem: InstallableViewItem
): ActionCallback | null {
  const dispatch = useDispatch();
  const { installable, status } = installableViewItem;
  const isInstallableBlueprint = !isExtension(installable);

  const viewLogs = () => {
    dispatch(
      blueprintModalsSlice.actions.setLogsContext({
        title: getLabel(installable),
        messageContext: isInstallableBlueprint
          ? {
              label: getLabel(installable),
              blueprintId: installable.metadata.id,
            }
          : selectExtensionContext(installable),
      })
    );
  };

  return status === "Inactive" ? null : viewLogs;
}

export default useViewLogsAction;
