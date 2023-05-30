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
  isExtension,
  isExtensionFromRecipe,
  selectExtensionsFromInstallable,
} from "@/utils/installableUtils";
import { type InstallableViewItem } from "../../../../installables/installableTypes";
import { useDispatch, useSelector } from "react-redux";
import { reportEvent } from "@/telemetry/events";
import { blueprintModalsSlice } from "@/extensionConsole/pages/blueprints/modals/blueprintModalsSlice";
import { selectExtensionContext } from "@/extensionPoints/helpers";
import { push } from "connected-react-router";
import useUserAction from "@/hooks/useUserAction";
import useInstallablePermissions from "@/installables/hooks/useInstallablePermissions";
import { type OptionsState } from "@/store/extensionsTypes";
import useFlags from "@/hooks/useFlags";
import notify from "@/utils/notify";
import { uninstallExtensions, uninstallRecipe } from "@/store/uninstallUtils";
import { useCallback } from "react";
import useActivateAction from "@/extensionConsole/pages/blueprints/actions/useActivateAction";
import useViewPublishAction from "@/extensionConsole/pages/blueprints/actions/useViewPublishAction";
import useMarketplaceUrl from "@/installables/hooks/useMarketplaceUrl";
import useViewShareAction from "@/extensionConsole/pages/blueprints/actions/useViewShareAction";
import useDeleteExtensionAction from "@/installables/hooks/useDeleteExtensionAction";

export type ActionCallback = () => void;

export type InstallableViewItemActions = {
  reactivate: ActionCallback | null;
  activate: ActionCallback | null;
  viewPublish: ActionCallback | null;
  viewInMarketplaceHref: string | null;
  viewShare: ActionCallback | null;
  deleteExtension: ActionCallback | null;
  deactivate: ActionCallback | null;
  viewLogs: ActionCallback | null;
  requestPermissions: ActionCallback | null;
};

const useReactivateAction = (
  installableViewItem: InstallableViewItem
): ActionCallback | null => {
  const dispatch = useDispatch();
  const { restrict } = useFlags();
  const { installable, unavailable, status, sharing } = installableViewItem;
  const isInstallableBlueprint = !isExtension(installable);
  const hasBlueprint =
    isExtensionFromRecipe(installable) || isInstallableBlueprint;
  const isActive = status === "Active" || status === "Paused";
  const isDeployment = sharing.source.type === "Deployment";
  const isRestricted = isDeployment && restrict("uninstall");

  const reactivate = () => {
    if (hasBlueprint) {
      const blueprintId = isInstallableBlueprint
        ? installable.metadata.id
        : installable._recipe.id;

      reportEvent("StartInstallBlueprint", {
        blueprintId,
        screen: "extensionConsole",
        reinstall: true,
      });

      const reactivatePath = `marketplace/activate/${encodeURIComponent(
        blueprintId
      )}?reinstall=1`;

      dispatch(push(reactivatePath));
    } else {
      // This should never happen, because the hook will return `reactivate: null` for installables with no
      // associated blueprint
      notify.error({
        error: new Error("Cannot reactivate item with no associated mod"),
      });
    }
  };

  // Only blueprints/deployments can be reactivated. (Because there's no reason to reactivate an extension... there's
  // no activation-time integrations/options associated with them.)
  return hasBlueprint && isActive && !isRestricted && !unavailable
    ? reactivate
    : null;
};

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

function useDeactivateAction(
  installableViewItem: InstallableViewItem
): ActionCallback | null {
  const dispatch = useDispatch();
  const { restrict } = useFlags();
  const { installable, status, sharing } = installableViewItem;
  const isInstallableBlueprint = !isExtension(installable);
  const isActive = status === "Active" || status === "Paused";
  const isDeployment = sharing.source.type === "Deployment";

  // Restricted users aren't allowed to deactivate/reactivate deployments. They are controlled by the admin from the
  // Admin Console. See restricted flag logic here:
  // https://github.com/pixiebrix/pixiebrix-app/blob/5b30c50d7f9ca7def79fd53ba8f78e0f800a0dcb/api/serializers/account.py#L198-L198
  const isRestricted = isDeployment && restrict("uninstall");

  // Without memoization, the selector reference changes on every render, which causes useInstallablePermissions
  // to recompute, spamming the background worker with service locator requests
  const memoizedExtensionsSelector = useCallback(
    (state: { options: OptionsState }) =>
      selectExtensionsFromInstallable(state, installable),
    [installable]
  );

  const extensionsFromInstallable = useSelector(memoizedExtensionsSelector);

  const deactivate = useUserAction(
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

  return isActive && !isRestricted ? deactivate : null;
}

function useRequestPermissionsAction(
  installableViewItem: InstallableViewItem
): ActionCallback | null {
  const { installable } = installableViewItem;

  // Without memoization, the selector reference changes on every render, which causes useInstallablePermissions
  // to recompute, spamming the background worker with service locator requests
  const memoizedExtensionsSelector = useCallback(
    (state: { options: OptionsState }) =>
      selectExtensionsFromInstallable(state, installable),
    [installable]
  );

  const extensionsFromInstallable = useSelector(memoizedExtensionsSelector);

  const { hasPermissions, requestPermissions } = useInstallablePermissions(
    extensionsFromInstallable
  );

  return hasPermissions ? null : requestPermissions;
}

function useBlueprintsPageActions(
  installableViewItem: InstallableViewItem
): InstallableViewItemActions {
  const marketplaceListingUrl = useMarketplaceUrl(installableViewItem);
  const viewPublish = useViewPublishAction(installableViewItem);
  const viewShare = useViewShareAction(installableViewItem);
  const reactivate = useReactivateAction(installableViewItem);
  const viewLogs = useViewLogsAction(installableViewItem);
  const activate = useActivateAction(installableViewItem);
  const deactivate = useDeactivateAction(installableViewItem);
  const deleteExtension = useDeleteExtensionAction(installableViewItem);
  const requestPermissions = useRequestPermissionsAction(installableViewItem);

  return {
    viewPublish,
    viewInMarketplaceHref: marketplaceListingUrl,
    viewShare,
    deleteExtension,
    deactivate,
    reactivate,
    viewLogs,
    activate,
    requestPermissions,
  };
}

export default useBlueprintsPageActions;
