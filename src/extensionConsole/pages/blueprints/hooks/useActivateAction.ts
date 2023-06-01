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
import { isExtension } from "@/utils/installableUtils";
import { reportEvent } from "@/telemetry/events";
import { push } from "connected-react-router";

function useActivateAction(
  installableViewItem: InstallableViewItem
): () => void | null {
  const dispatch = useDispatch();
  const { installable, status } = installableViewItem;
  const isInstallableBlueprint = !isExtension(installable);

  const activate = () => {
    if (isInstallableBlueprint) {
      reportEvent("StartInstallBlueprint", {
        blueprintId: installable.metadata.id,
        screen: "extensionConsole",
        reinstall: false,
      });

      dispatch(
        push(
          `/marketplace/activate/${encodeURIComponent(installable.metadata.id)}`
        )
      );
    } else {
      reportEvent("StartInstallBlueprint", {
        blueprintId: null,
        screen: "extensionConsole",
        reinstall: false,
      });

      dispatch(push(`/extensions/install/${installable.id}`));
    }
  };

  return status === "Inactive" ? activate : null;
}

export default useActivateAction;
