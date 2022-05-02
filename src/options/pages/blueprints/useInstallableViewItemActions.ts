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
import { InstallableViewItem } from "./blueprintsTypes";
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
import { useDeleteCloudExtensionMutation } from "@/services/api";
import extensionsSlice from "@/store/extensionsSlice";
import useUserAction from "@/hooks/useUserAction";
import { CancelError } from "@/errors";
import { useModals } from "@/components/ConfirmationModal";
import useInstallablePermissions from "@/options/pages/blueprints/useInstallablePermissions";
import { selectScope } from "@/auth/authSelectors";
import { OptionsState } from "@/store/extensionsTypes";
import useFlags from "@/hooks/useFlags";
import notify from "@/utils/notify";

const { removeExtension } = extensionsSlice.actions;

type ActionCallback = () => void;

export type InstallableViewItemActions = {
  reinstall: ActionCallback | null;
  activate: ActionCallback | null;
  viewShare: ActionCallback | null;
  deleteExtension: ActionCallback | null;
  uninstall: ActionCallback | null;
  viewLogs: ActionCallback | null;
  requestPermissions: ActionCallback | null;

  // XXX: this is one is not implemented like the others for some reason. It will always be defined but will show
  // an error if the action is not available
  exportBlueprint: ActionCallback;
};

function useInstallableViewItemActions(
  installableViewItem: InstallableViewItem
): InstallableViewItemActions {
  const { installable, status, sharing } = installableViewItem;
  const dispatch = useDispatch();
  const modals = useModals();
  const [deleteCloudExtension] = useDeleteCloudExtensionMutation();
  const scope = useSelector(selectScope);
  const { restrict } = useFlags();

  // NOTE: paused deployments are installed, but they are not executed. See isDeploymentActive
  const isInstalled = status === "Active" || status === "Paused";

  const isCloudExtension =
    isExtension(installable) &&
    sharing.source.type === "Personal" &&
    // If the status is active, there is still likely a copy of the extension saved on our server. But the point
    // this check is for extensions that aren't also installed locally
    !isInstalled;

  const hasBlueprint =
    isExtensionFromRecipe(installable) || isBlueprint(installable);

  // TODO: double-check how team role factors into the uninstall flag. Do we need to check for team role?
  const isManaged =
    sharing.source.type === "Deployment" && restrict("uninstall");

  const extensionsFromInstallable = useSelector(
    (state: { options: OptionsState }) =>
      selectExtensionsFromInstallable(state, installable)
  );

  const { hasPermissions, requestPermissions } = useInstallablePermissions(
    extensionsFromInstallable
  );

  const reinstall = () => {
    if (hasBlueprint) {
      dispatch(
        push(
          `marketplace/activate/${encodeURIComponent(
            isBlueprint(installable)
              ? installable.metadata.id
              : installable._recipe.id
          )}?reinstall=1`
        )
      );
    } else {
      // This should never happen, because the hook will return `reinstall: null` for installables with no
      // associated blueprint
      notify.error({
        error: new Error("Cannot reinstall item with no associated blueprint"),
      });
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

      if (extensionsFromInstallable.length === 0) {
        throw new Error("Extension must be installed to export as blueprint");
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
    viewShare: isCloudExtension ? null : viewShare,
    deleteExtension: isCloudExtension ? deleteExtension : null,
    uninstall: isInstalled && !isManaged ? uninstall : null,
    // Only blueprints/deployments can be reinstalled. (Because there's no reason to reinstall an extension... there's
    // no activation-time integrations/options associated with them.)
    reinstall: hasBlueprint && isInstalled && !isManaged ? reinstall : null,
    viewLogs: status === "Inactive" ? null : viewLogs,
    activate: status === "Inactive" ? activate : null,
    exportBlueprint,
    requestPermissions: hasPermissions ? null : requestPermissions,
  };
}

export default useInstallableViewItemActions;
