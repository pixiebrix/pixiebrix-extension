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
  isBlueprint,
  isExtension,
  isExtensionFromRecipe,
  isPersonal,
  isShared,
} from "@/options/pages/blueprints/utils/installableUtils";
import { Installable } from "./blueprintsTypes";
import { useDispatch, useSelector } from "react-redux";
import { reportEvent } from "@/telemetry/events";
import {
  reactivateEveryTab,
  uninstallContextMenu,
} from "@/background/messenger/api";
import { blueprintModalsSlice } from "@/options/pages/blueprints/modals/blueprintModalsSlice";
import { selectExtensionContext } from "@/extensionPoints/helpers";
import notify from "@/utils/notify";
import { push } from "connected-react-router";
import { exportBlueprint as exportBlueprintYaml } from "@/options/pages/blueprints/utils/exportBlueprint";
import { useDeleteCloudExtensionMutation } from "@/services/api";
import extensionsSlice from "@/store/extensionsSlice";
import useUserAction from "@/hooks/useUserAction";
import { CancelError } from "@/errors";
import { useModals } from "@/components/ConfirmationModal";
import { selectExtensions } from "@/store/extensionsSelectors";
import { IExtension } from "@/core";
import { useMemo } from "react";
import useInstallablePermissions from "@/options/pages/blueprints/useInstallablePermissions";
import { selectScope } from "@/auth/authSelectors";

const { removeExtension } = extensionsSlice.actions;

function useInstallableActions(installable: Installable) {
  const dispatch = useDispatch();
  const modals = useModals();
  const [deleteCloudExtension] = useDeleteCloudExtensionMutation();
  const unresolvedExtensions = useSelector(selectExtensions);
  const scope = useSelector(selectScope);

  // The extensions associated with the installable
  const extensions: IExtension[] = useMemo(
    () =>
      isBlueprint(installable)
        ? unresolvedExtensions.filter(
            (extension) => extension._recipe?.id === installable.metadata.id
          )
        : [installable],
    [unresolvedExtensions, installable]
  );

  const { hasPermissions, requestPermissions } =
    useInstallablePermissions(extensions);

  const reinstall = () => {
    if (isExtensionFromRecipe(installable) || isBlueprint(installable)) {
      dispatch(
        push(
          `marketplace/activate/${encodeURIComponent(
            isBlueprint(installable)
              ? installable.metadata.id
              : installable._recipe.id
          )}?reinstall=1`
        )
      );
    }
  };

  const activate = () => {
    if (isBlueprint(installable)) {
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

    dispatch(blueprintModalsSlice.actions.setShareContext(shareContext));
  };

  const deleteExtension = useUserAction(
    async () => {
      if (isBlueprint(installable)) {
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

      await deleteCloudExtension({ extensionId: installable.id }).unwrap();
    },
    {
      successMessage: `Deleted extension ${getLabel(
        installable
      )} from your account`,
      errorMessage: `Error deleting extension ${getLabel(
        installable
      )} from your account`,
      event: "ExtensionCloudDelete",
    },
    [modals]
  );

  const uninstall = () => {
    for (const extension of extensions) {
      // Remove from storage first so it doesn't get re-added in reactivate step below
      dispatch(removeExtension({ extensionId: extension.id }));
      // XXX: also remove remove side panel panels that are already open?
      void uninstallContextMenu({ extensionId: extension.id });
      reactivateEveryTab();

      reportEvent("ExtensionRemove", {
        extensionId: extension.id,
      });
    }

    notify.success(`Deactivated blueprint ${getLabel(installable)}`);
  };

  const viewLogs = () => {
    dispatch(
      blueprintModalsSlice.actions.setLogsContext({
        title: getLabel(installable),
        messageContext: isBlueprint(installable)
          ? {
              label: getLabel(installable),
              blueprintId: installable.metadata.id,
            }
          : selectExtensionContext(installable),
      })
    );
  };

  const exportBlueprint = () => {
    const extension = isExtension(installable) ? installable : null;

    if (extension == null) {
      notify.error("Error exporting as blueprint: extension not found.");
      return;
    }

    exportBlueprintYaml(extension);
  };

  return {
    viewShare,
    uninstall,
    viewLogs,
    exportBlueprint,
    activate,
    deleteExtension: isExtension(installable) ? deleteExtension : null,
    requestPermissions: hasPermissions ? null : requestPermissions,
    reinstall:
      isExtensionFromRecipe(installable) || isBlueprint(installable)
        ? reinstall
        : null,
  };
}

export default useInstallableActions;
