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
  selectExtensionsFromInstallable,
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
import { push } from "connected-react-router";
import { exportBlueprint as exportBlueprintYaml } from "@/options/pages/blueprints/utils/exportBlueprint";
import { appApi, useDeleteCloudExtensionMutation } from "@/services/api";
import extensionsSlice from "@/store/extensionsSlice";
import useUserAction from "@/hooks/useUserAction";
import { CancelError } from "@/errors";
import { useModals } from "@/components/ConfirmationModal";
import useInstallablePermissions from "@/options/pages/blueprints/useInstallablePermissions";
import { OptionsState } from "@/store/extensionsTypes";

const { removeExtension } = extensionsSlice.actions;

function useInstallableActions(installable: Installable) {
  const dispatch = useDispatch();
  const modals = useModals();
  const [deleteCloudExtension] = useDeleteCloudExtensionMutation();

  // Select cached auth data for performance reasons
  const {
    data: { scope },
  } = useSelector(appApi.endpoints.getAuth.select());

  const extensionsFromInstallable = useSelector(
    (state: { options: OptionsState }) =>
      selectExtensionsFromInstallable(state, installable)
  );

  const { hasPermissions, requestPermissions } = useInstallablePermissions(
    extensionsFromInstallable
  );

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
    } else {
      dispatch(push(`/extensions/install/${installable.id}`));
    }
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

  const uninstall = useUserAction(
    () => {
      for (const extension of extensionsFromInstallable) {
        // Remove from storage first so it doesn't get re-added in reactivate step below
        dispatch(removeExtension({ extensionId: extension.id }));
        // XXX: also remove sidebar panels that are already open?
        void uninstallContextMenu({ extensionId: extension.id });
        reactivateEveryTab();
      }

      // Report telemetry
      if (isBlueprint(installable)) {
        reportEvent("BlueprintRemove", {
          blueprintId: installable.metadata.id,
        });
      } else {
        for (const extension of extensionsFromInstallable) {
          reportEvent("ExtensionRemove", {
            extensionId: extension.id,
          });
        }
      }
    },
    {
      successMessage: `Deactivated blueprint: ${getLabel(installable)}`,
      errorMessage: `Error deactivating blueprint: ${getLabel(installable)}`,
    },
    [installable, extensionsFromInstallable]
  );

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

  const exportBlueprint = useUserAction(
    () => {
      if (isBlueprint(installable)) {
        throw new Error("Already a blueprint. Access in the Workshop");
      }

      exportBlueprintYaml(extensionsFromInstallable[0]);
    },
    {
      successMessage: `Exported blueprint: ${getLabel(installable)}`,
      errorMessage: `Error exporting blueprint: ${getLabel(installable)}`,
      event: "ExtensionExport",
    },
    [installable, extensionsFromInstallable]
  );

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
