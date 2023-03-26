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

import {
  getLabel,
  getPackageId,
  isExtension,
  isExtensionFromRecipe,
  selectExtensionsFromInstallable,
} from "@/options/pages/blueprints/utils/installableUtils";
import { type InstallableViewItem } from "./blueprintsTypes";
import { useDispatch, useSelector } from "react-redux";
import { reportEvent } from "@/telemetry/events";
import {
  blueprintModalsSlice,
  type PublishContext,
  type ShareContext,
} from "@/options/pages/blueprints/modals/blueprintModalsSlice";
import { selectExtensionContext } from "@/extensionPoints/helpers";
import { push } from "connected-react-router";
import { useDeleteCloudExtensionMutation } from "@/services/api";
import useUserAction from "@/hooks/useUserAction";
import { useModals } from "@/components/ConfirmationModal";
import useInstallablePermissions from "@/options/pages/blueprints/useInstallablePermissions";
import { type OptionsState } from "@/store/extensionsTypes";
import useFlags from "@/hooks/useFlags";
import notify from "@/utils/notify";
import { CancelError } from "@/errors/businessErrors";
import { MARKETPLACE_URL } from "@/utils/strings";
import { uninstallExtensions, uninstallRecipe } from "@/store/uninstallUtils";

type ActionCallback = () => void;

export type InstallableViewItemActions = {
  reinstall: ActionCallback | null;
  activate: ActionCallback | null;
  viewPublish: ActionCallback | null;
  viewInMarketplaceHref: string | null;
  viewShare: ActionCallback | null;
  deleteExtension: ActionCallback | null;
  uninstall: ActionCallback | null;
  viewLogs: ActionCallback | null;
  requestPermissions: ActionCallback | null;
};

// eslint-disable-next-line complexity
function useInstallableViewItemActions(
  installableViewItem: InstallableViewItem
): InstallableViewItemActions {
  const { installable, status, sharing } = installableViewItem;
  const dispatch = useDispatch();
  const modals = useModals();
  const [deleteCloudExtension] = useDeleteCloudExtensionMutation();
  const { restrict } = useFlags();

  // NOTE: paused deployments are installed, but they are not executed. See deployments.ts:isDeploymentActive
  const isInstalled =
    status === "Active" || status === "Paused" || status === "Unavailable";
  const isInstallableExtension = isExtension(installable);
  const isInstallableBlueprint = !isInstallableExtension;

  const isCloudExtension =
    isInstallableExtension &&
    sharing.source.type === "Personal" &&
    // If the status is active, there is still likely a copy of the extension saved on our server. But the point
    // this check is for extensions that aren't also installed locally
    !isInstalled;

  const hasBlueprint =
    isExtensionFromRecipe(installable) || isInstallableBlueprint;

  const isUnavailable = status === "Unavailable";
  const isDeployment = sharing.source.type === "Deployment";

  // Restricted users aren't allowed to uninstall/reinstall deployments. They are controlled by the admin from the
  // Admin Console. See restricted flag logic here:
  // https://github.com/pixiebrix/pixiebrix-app/blob/5b30c50d7f9ca7def79fd53ba8f78e0f800a0dcb/api/serializers/account.py#L198-L198
  const isRestricted = isDeployment && restrict("uninstall");

  const extensionsFromInstallable = useSelector(
    (state: { options: OptionsState }) =>
      selectExtensionsFromInstallable(state, installable)
  );

  const { hasPermissions, requestPermissions } = useInstallablePermissions(
    extensionsFromInstallable
  );

  const reinstall = () => {
    if (hasBlueprint) {
      const blueprintId = isInstallableBlueprint
        ? installable.metadata.id
        : installable._recipe.id;

      reportEvent("StartInstallBlueprint", {
        blueprintId,
        screen: "extensionConsole",
        reinstall: true,
      });

      dispatch(
        push(
          `marketplace/activate/${encodeURIComponent(blueprintId)}?reinstall=1`
        )
      );
    } else {
      // This should never happen, because the hook will return `reinstall: null` for installables with no
      // associated blueprint
      notify.error({
        error: new Error("Cannot reinstall item with no associated mod"),
      });
    }
  };

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

  const viewPublish = () => {
    const publishContext: PublishContext = isInstallableBlueprint
      ? {
          blueprintId: getPackageId(installable),
        }
      : {
          extensionId: installable.id,
        };

    dispatch(blueprintModalsSlice.actions.setPublishContext(publishContext));
  };

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

  const deleteExtension = useUserAction(
    async () => {
      if (isInstallableBlueprint) {
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
      successMessage: `Deleted mod ${getLabel(installable)} from your account`,
      errorMessage: `Error deleting mod ${getLabel(
        installable
      )} from your account`,
      event: "ExtensionCloudDelete",
    },
    [modals]
  );

  const uninstall = useUserAction(
    async () => {
      if (isInstallableBlueprint) {
        const blueprintId = installable.metadata.id;
        await uninstallRecipe(blueprintId, extensionsFromInstallable, dispatch);

        reportEvent("BlueprintRemove", {
          blueprintId,
        });
      } else {
        await uninstallExtensions(
          extensionsFromInstallable.map(({ id }) => id),
          dispatch
        );

        for (const extension of extensionsFromInstallable) {
          reportEvent("ExtensionRemove", {
            extensionId: extension.id,
          });
        }
      }
    },
    {
      successMessage: `Deactivated mod: ${getLabel(installable)}`,
      errorMessage: `Error deactivating mod: ${getLabel(installable)}`,
    },
    [installable, extensionsFromInstallable]
  );

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

  const showPublishAction =
    !isUnavailable &&
    // Deployment sharing is controlled via the Admin Console
    !isDeployment &&
    // Extensions can be published
    (isInstallableExtension ||
      // In case of blueprint, skip if it is already published
      sharing.listingId == null);

  const viewInMarketplaceHref =
    isDeployment || showPublishAction || isUnavailable
      ? null
      : // If showPublishAction is false, then the listing for the recipe is defined
        `${MARKETPLACE_URL}${sharing.listingId}/`;

  return {
    viewPublish: showPublishAction ? viewPublish : null,
    viewInMarketplaceHref,
    // Deployment sharing is controlled via the Admin Console
    viewShare: isDeployment || isUnavailable ? null : viewShare,
    deleteExtension: isCloudExtension ? deleteExtension : null,
    uninstall: isInstalled && !isRestricted ? uninstall : null,
    // Only blueprints/deployments can be reinstalled. (Because there's no reason to reinstall an extension... there's
    // no activation-time integrations/options associated with them.)
    reinstall:
      hasBlueprint && isInstalled && !isRestricted && !isUnavailable
        ? reinstall
        : null,
    viewLogs: status === "Inactive" ? null : viewLogs,
    activate: status === "Inactive" ? activate : null,
    requestPermissions: hasPermissions ? null : requestPermissions,
  };
}

export default useInstallableViewItemActions;
