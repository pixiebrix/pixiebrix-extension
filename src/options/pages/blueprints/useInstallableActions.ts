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
  getLabel,
  getPackageId,
  getUniqueId,
  isBlueprint,
  isExtension,
  isExtensionFromRecipe,
  isPersonal,
  isShared,
} from "@/options/pages/blueprints/installableUtils";
import { Installable } from "./blueprintsTypes";
import { useDispatch } from "react-redux";
import { reportEvent } from "@/telemetry/events";
import {
  reactivateEveryTab,
  uninstallContextMenu,
} from "@/background/messenger/api";
import { installedPageSlice } from "@/options/pages/installed/installedPageSlice";
import { selectExtensionContext } from "@/extensionPoints/helpers";
import { useCallback } from "react";
import useNotifications from "@/hooks/useNotifications";
import { push } from "connected-react-router";
import { exportBlueprint } from "@/options/pages/installed/exportBlueprint";
import { useGetAuthQuery } from "@/services/api";
import extensionsSlice from "@/store/extensionsSlice";
import useUserAction from "@/hooks/useUserAction";
import { CancelError } from "@/errors";
import { getLinkedApiClient } from "@/services/apiClient";
import { useModals } from "@/components/ConfirmationModal";

const { removeExtension } = extensionsSlice.actions;

function useInstallableActions(installable: Installable) {
  const dispatch = useDispatch();
  const notify = useNotifications();
  const modals = useModals();

  const {
    data: { scope },
  } = useGetAuthQuery();

  const reinstall = () => {
    if (!isExtension(installable) || !installable._recipe) {
      return;
    }

    dispatch(
      push(
        `marketplace/activate/${encodeURIComponent(
          installable._recipe.id
        )}?reinstall=1`
      )
    );
  };

  const activate = () => {
    if (!isExtension(installable)) {
      dispatch(
        push(
          `/marketplace/activate/${encodeURIComponent(installable.metadata.id)}`
        )
      );
      return;
    }

    dispatch(push(`/extensions/install/${installable.id}`));
  };

  const viewShare = () => {
    let shareContext = null;

    if (isBlueprint(installable) || isShared(installable)) {
      shareContext = {
        blueprintId: getPackageId(installable),
      };
    } else if (isPersonal(installable, scope) && isExtension(installable)) {
      shareContext = {
        extensionId: installable.id,
      };
    }

    dispatch(installedPageSlice.actions.setShareContext(shareContext));
  };

  const deleteExtension = useUserAction(
    async () => {
      const confirmed = await modals.showConfirmation({
        title: "Permanently Delete?",
        message: "Permanently delete the brick from your account?",
        submitCaption: "Delete",
        cancelCaption: "Back to Safety",
      });

      if (!confirmed) {
        throw new CancelError();
      }

      const client = await getLinkedApiClient();
      await client.delete(`/api/extensions/${getUniqueId(installable)}/`);
    },
    {
      successMessage: `Deleted brick ${getLabel(
        installable
      )} from your account`,
      errorMessage: `Error deleting brick ${getLabel(
        installable
      )} from your account`,
      event: "ExtensionCloudDelete",
    },
    [modals]
  );

  const uninstall = () => {
    if (!isExtension(installable)) {
      return;
    }

    reportEvent("ExtensionRemove", {
      extensionId: installable.id,
    });
    // Remove from storage first so it doesn't get re-added in reactivate step below
    dispatch(removeExtension({ extensionId: installable.id }));
    // XXX: also remove remove side panel panels that are already open?
    void uninstallContextMenu({ extensionId: installable.id });
    reactivateEveryTab();

    notify.success(`Removed brick ${getLabel(installable)}`, {
      event: "ExtensionRemove",
    });
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

  const onExportBlueprint = useCallback(() => {
    const extension = isExtension(installable) ? installable : null;

    if (extension == null) {
      notify.error("Error exporting as blueprint: extension not found.");
      return;
    }

    exportBlueprint(extension);
  }, [installable, notify]);

  return {
    viewShare,
    uninstall,
    viewLogs,
    onExportBlueprint,
    activate,
    deleteExtension: isExtension(installable) ? deleteExtension : null,
    reinstall: isExtensionFromRecipe(installable) ? reinstall : null,
  };
}

export default useInstallableActions;
