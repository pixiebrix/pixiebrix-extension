/*
 * Copyright (C) 2024 PixieBrix, Inc.
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

import React, { useCallback, useMemo } from "react";
import {
  ensurePermissionsFromUserGesture,
  mergePermissionsStatuses,
} from "@/permissions/permissionsUtils";
import { useDispatch, useSelector } from "react-redux";
import reportEvent from "@/telemetry/reportEvent";
import { Events } from "@/telemetry/events";
import { selectExtensions } from "@/store/extensionsSelectors";
import notify from "@/utils/notify";
import { getUUID } from "@/telemetry/telemetryHelpers";
import { services } from "@/background/messenger/api";
import { refreshRegistries } from "@/hooks/useRefreshRegistries";
import { type Dispatch } from "@reduxjs/toolkit";
import useFlags from "@/hooks/useFlags";
import {
  checkExtensionUpdateRequired,
  makeUpdatedFilter,
  selectInstalledDeployments,
} from "@/utils/deploymentUtils";
import settingsSlice from "@/store/settings/settingsSlice";
import { checkDeploymentPermissions } from "@/permissions/deploymentPermissionsHelpers";
import useAsyncState from "@/hooks/useAsyncState";

import { logPromiseDuration } from "@/utils/promiseUtils";

import {
  getExtensionVersion,
  reloadIfNewVersionIsReady,
} from "@/utils/extensionUtils";
import useAutoDeploy from "@/extensionConsole/pages/deployments/useAutoDeploy";
import { activateDeployments } from "@/extensionConsole/pages/deployments/activateDeployments";
import { useGetDeploymentsQuery } from "@/data/service/api";
import { deserializeError } from "serialize-error";
import { isEqual } from "lodash";

function getError(deploymentsError: unknown, permissionsError: unknown) {
  if (deploymentsError) {
    if (deserializeError(deploymentsError).name === "ExtensionNotLinkedError") {
      return null;
    }

    return deploymentsError;
  }

  return permissionsError;
}

export type DeploymentsState = {
  /**
   * `true` iff one or more new deployments/deployment updates are available
   */
  hasUpdate: boolean;

  /**
   * Callback to update the deployments (will prompt the user for permissions if required)
   */
  update: () => Promise<void>;

  /**
   * `true` iff the user needs to update their PixieBrix browser extension version to use the deployment
   */
  extensionUpdateRequired: boolean;

  /**
   * Callback to update the extension. Reloads the extension.
   */
  updateExtension: () => Promise<void>;

  /**
   * `true` when fetching the available deployments
   */
  isLoading: boolean;

  /**
   * `true` when attempting to automatically deploy updates
   */
  isAutoDeploying: boolean;

  /**
   * The error if fetching available deployments failed, or undefined if loading/deployments were successfully fetched
   */
  error: unknown;
};

function useDeployments(): DeploymentsState {
  const dispatch = useDispatch<Dispatch>();
  const installedExtensions = useSelector(selectExtensions);
  const { restrict } = useFlags();
  const activeExtensions = selectInstalledDeployments(installedExtensions);
  const activeExtensionsRef = React.useRef(activeExtensions);
  if (!isEqual(activeExtensions, activeExtensionsRef.current)) {
    activeExtensionsRef.current = activeExtensions;
  }

  const { data: uuid } = useAsyncState(async () => getUUID(), []);

  const {
    data: deployments,
    isLoading: isLoadingDeployments,
    error: deploymentsError,
  } = useGetDeploymentsQuery(
    {
      uid: uuid,
      version: getExtensionVersion(),
      active: activeExtensionsRef.current,
    },
    {
      skip: !uuid,
      refetchOnMountOrArgChange: 60,
    },
  );

  const {
    data: permissions,
    isLoading: isLoadingPermissions,
    error: permissionsError,
  } = useAsyncState(async () => {
    if (!deployments) {
      return null;
    }

    // `refreshRegistries` to ensure user has the latest brick definitions. `refreshRegistries` uses
    // memoizedUntilSettled to avoid excessive calls.
    await refreshRegistries();

    // Log performance to determine if we're having issues with messenger/IDB performance
    const { permissions } = mergePermissionsStatuses(
      await logPromiseDuration(
        "useDeployments:checkDeploymentPermissions",
        Promise.all(
          deployments.map(async (deployment) =>
            checkDeploymentPermissions(deployment, services.locateAllForId, {
              // In the UI context, always prompt the user to accept permissions to ensure they get the full
              // functionality of the mod
              optionalPermissions: [],
            }),
          ),
        ),
      ),
    );

    return permissions;
  }, [installedExtensions, deployments]);

  const [updatedDeployments, extensionUpdateRequired] = useMemo(() => {
    const isUpdated = makeUpdatedFilter(installedExtensions, {
      restricted: restrict("uninstall"),
    });

    const updatedDeployments = deployments?.filter((x) => isUpdated(x)) ?? null;

    return [
      updatedDeployments,
      checkExtensionUpdateRequired(updatedDeployments),
    ];
  }, [restrict, installedExtensions, deployments]);

  const { isAutoDeploying } = useAutoDeploy(
    updatedDeployments,
    installedExtensions,
    { extensionUpdateRequired },
  );

  const handleUpdateFromUserGesture = useCallback(async () => {
    // IMPORTANT: can't do a fetch or any potentially stalling operation (including IDB calls) because the call to
    // request permissions must occur within 5 seconds of the user gesture. ensurePermissionsFromUserGesture check
    // must come as early as possible.

    // Always reset. So even if there's an error, the user at least has a grace period before PixieBrix starts
    // notifying them to update again
    dispatch(settingsSlice.actions.resetUpdatePromptTimestamp());

    if (deployments == null) {
      notify.error("Deployments have not been fetched");
      return;
    }

    let accepted = false;
    try {
      accepted = await ensurePermissionsFromUserGesture(permissions);
    } catch (error) {
      notify.error({
        message: "Error granting permissions, try again",
        error,
      });
      return;
    }

    if (checkExtensionUpdateRequired(deployments)) {
      void browser.runtime.requestUpdateCheck();
      notify.warning(
        "You must update the PixieBrix browser extension to activate the deployment",
      );
      reportEvent(Events.DEPLOYMENT_REJECT_VERSION);
      return;
    }

    if (!accepted) {
      notify.warning("You declined the permissions");
      reportEvent(Events.DEPLOYMENT_REJECT_PERMISSIONS);
      return;
    }

    try {
      await activateDeployments(dispatch, deployments, installedExtensions);
      notify.success("Updated team deployments");
    } catch (error) {
      notify.error({ message: "Error updating team deployments", error });
    }
  }, [deployments, permissions, dispatch, installedExtensions]);

  const updateExtension = useCallback(async () => {
    await reloadIfNewVersionIsReady();
    notify.info(
      "The extension update hasn't yet been downloaded. Try again in a few minutes.",
    );
  }, []);

  return {
    hasUpdate: updatedDeployments?.length > 0,
    update: handleUpdateFromUserGesture,
    updateExtension,
    extensionUpdateRequired,
    isLoading: isLoadingDeployments || isLoadingPermissions,
    error: getError(deploymentsError, permissionsError),
    isAutoDeploying,
  };
}

const defaultValue: DeploymentsState = {
  hasUpdate: false,
  async update() {},
  extensionUpdateRequired: false,
  async updateExtension() {},
  isAutoDeploying: true,
  isLoading: true,
  error: false,
};

const DeploymentsContext = React.createContext<DeploymentsState>(defaultValue);

/**
 * Provides deployment status to the children. Written as React context instead of a hook to allow for a singleton
 * instance tracking the deployment status.
 * @constructor
 * @see DeploymentBanner
 * @see useOnboarding
 */
export const DeploymentsProvider: React.FC = ({ children }) => {
  const deployments = useDeployments();

  return (
    <DeploymentsContext.Provider value={deployments}>
      {children}
    </DeploymentsContext.Provider>
  );
};

export default DeploymentsContext;
