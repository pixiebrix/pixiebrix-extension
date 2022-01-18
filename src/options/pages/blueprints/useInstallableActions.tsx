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

import {
  Installable,
  isExtension,
} from "@/options/pages/blueprints/installableUtils";
import { useDispatch } from "react-redux";
import { push } from "connected-react-router";
import { ResolvedExtension, UUID } from "@/core";
import { reportEvent } from "@/telemetry/events";
import {
  reactivateEveryTab,
  uninstallContextMenu,
} from "@/background/messenger/api";
import { reportError } from "@/telemetry/logging";
import { optionsSlice } from "@/options/slices";
import { installedPageSlice } from "@/options/pages/installed/installedPageSlice";
import { selectExtensionContext } from "@/extensionPoints/helpers";
import { useCallback } from "react";
import { exportBlueprint } from "@/options/pages/installed/exportBlueprint";
import useNotifications from "@/hooks/useNotifications";

const { removeExtension } = optionsSlice.actions;

function useInstallableActions(installable: Installable) {
  const dispatch = useDispatch();
  const notify = useNotifications();

  const viewShare = () => {
    if (!isExtension(installable)) {
      return;
    }

    dispatch(
      installedPageSlice.actions.setShareContext({
        extension: installable,
      })
    );
  };

  const remove = () => {
    if (!isExtension(installable)) {
      return;
    }

    reportEvent("ExtensionRemove", {
      extensionId: installable.id,
    });
    // Remove from storage first so it doesn't get re-added in reactivate step below
    dispatch(removeExtension({ extensionId: installable.id }));
    // XXX: also remove remove side panel panels that are already open?
    void uninstallContextMenu({ extensionId: installable.id }).catch(
      reportError
    );
    reactivateEveryTab();
  };

  const viewLogs = () => {
    if (!isExtension(installable)) {
      return;
    }

    dispatch(
      installedPageSlice.actions.setLogsContext({
        title: installable.label,
        messageContext: selectExtensionContext(installable),
      })
    );
  };

  // todo: use that callback & notify hook
  const exportBlueprint = useCallback(() => {
    const extension = isExtension(installable) ? installable : null;

    if (extension == null) {
      notify.error("Error exporting as blueprint: extension not found.");
      return;
    }

    exportBlueprint(extension);
  }, [installable, notify]);

  return { viewShare, remove, viewLogs, exportBlueprint };
}
export default useInstallableActions;
