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

import React, { useCallback } from "react";
import {
  ensurePermissionsFromUserGesture,
  mergePermissionsStatuses,
} from "@/permissions/permissionsUtils";
import { useDispatch, useSelector } from "react-redux";
import reportEvent from "@/telemetry/reportEvent";
import { Events } from "@/telemetry/events";
import { selectExtensions } from "@/store/extensionsSelectors";
import notify from "@/utils/notify";
import { services } from "@/background/messenger/api";
import { refreshRegistries } from "@/hooks/useRefreshRegistries";
import { type Dispatch } from "@reduxjs/toolkit";
import useFlags from "@/hooks/useFlags";
import {
  checkExtensionUpdateRequired,
  type InstalledDeployment,
  makeUpdatedFilter,
  selectInstalledDeployments,
} from "@/utils/deploymentUtils";
import settingsSlice from "@/store/settings/settingsSlice";
import { checkDeploymentPermissions } from "@/permissions/deploymentPermissionsHelpers";
import { logPromiseDuration } from "@/utils/promiseUtils";
import {
  getExtensionVersion,
  reloadIfNewVersionIsReady,
} from "@/utils/extensionUtils";
import useAutoDeploy from "@/extensionConsole/pages/deployments/useAutoDeploy";
import { activateDeployments } from "@/extensionConsole/pages/deployments/activateDeployments";
import { useGetDeploymentsQuery } from "@/data/service/api";
import { fetchDeploymentModDefinitions } from "@/modDefinitions/modDefinitionRawApiCalls";
import { isEqual } from "lodash";
import useMemoCompare from "@/hooks/useMemoCompare";
import useDeriveAsyncState from "@/hooks/useDeriveAsyncState";
import type { Deployment } from "@/types/contract";
import useBrowserIdentifier from "@/hooks/useBrowserIdentifier";
import type { ActivatableDeployment } from "@/types/deploymentTypes";
import type { Permissions } from "webextension-polyfill";

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
  const activeExtensions = useSelector(selectExtensions);
  const { restrict } = useFlags();
  const activeDeployments = useMemoCompare<InstalledDeployment[]>(
    selectInstalledDeployments(activeExtensions),
    isEqual,
  );

  const { data: uuid } = useBrowserIdentifier();

  const deploymentsState = useGetDeploymentsQuery(
    {
      uid: uuid,
      version: getExtensionVersion(),
      active: activeDeployments,
    },
    {
      skip: !uuid, // Avoid fetching deployments until we have a UUID
      refetchOnMountOrArgChange: 60, // 1 minute
    },
  );

  const deploymentUpdateState = useDeriveAsyncState(
    deploymentsState,
    async (deployments: Deployment[]) => {
      const isUpdated = makeUpdatedFilter(activeExtensions, {
        // FIXME: the restrict reference changes when the available flags change. Currently useFlags makes an
        //   HTTP request vs. using the app cache. So there there will be a race on whether the flags are ready for
        //   checking. A potential solution is to ensure the App is gated until the flags are ready, e.g., via
        //   the RequireAuth component or similar. In that case, useFlags should use a React Context vs. RTK Query.
        restricted: restrict("uninstall"),
      });

      const updatedDeployments = deployments.filter((x) => isUpdated(x));

      const activatableDeployments =
        await fetchDeploymentModDefinitions(updatedDeployments);

      if (activatableDeployments.length > 0) {
        // `refreshRegistries` to ensure user has the latest brick definitions before deploying. `refreshRegistries`
        // uses memoizedUntilSettled to avoid excessive calls.
        await refreshRegistries();
      }

      // Log performance to determine if we're having issues with messenger/IDB performance
      const { permissions } = mergePermissionsStatuses(
        await logPromiseDuration(
          "useDeployments:checkDeploymentPermissions",
          Promise.all(
            activatableDeployments.map(async (activatableDeployment) =>
              checkDeploymentPermissions({
                activatableDeployment,
                locate: services.locateAllForId,
                // In the UI context, always prompt the user to accept permissions to ensure they get the full
                // functionality of the mod
                optionalPermissions: [],
              }),
            ),
          ),
        ),
      );

      return {
        activatableDeployments,
        extensionUpdateRequired: checkExtensionUpdateRequired(
          activatableDeployments,
        ),
        permissions,
      };
    },
  );

  // Fallback values for loading/error states
  const { activatableDeployments, extensionUpdateRequired, permissions } =
    deploymentUpdateState.data ?? {
      // `useAutoDeploy` expects `null` to represent deployment loading state. It tries to activate once available
      activatableDeployments: null as ActivatableDeployment[] | null,
      extensionUpdateRequired: false as boolean,
      permissions: [] as Permissions.Permissions,
    };

  const { isAutoDeploying } = useAutoDeploy({
    activatableDeployments,
    installedExtensions: activeExtensions,
    extensionUpdateRequired,
  });

  const handleUpdateFromUserGesture = useCallback(async () => {
    // IMPORTANT: can't do a fetch or any potentially stalling operation (including IDB calls) because the call to
    // request permissions must occur within 5 seconds of the user gesture. ensurePermissionsFromUserGesture check
    // must come as early as possible.

    // Always reset. So even if there's an error, the user at least has a grace period before PixieBrix starts
    // notifying them to update again
    dispatch(settingsSlice.actions.resetUpdatePromptTimestamp());

    if (activatableDeployments == null) {
      notify.error("Deployments have not been fetched");
      return;
    }

    if (activatableDeployments.length === 0) {
      // In practice, this code path should never get hit because the button to update deployments should be hidden
      // if there are not deployments to activate.
      notify.info("No deployments to activate");
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

    if (checkExtensionUpdateRequired(activatableDeployments)) {
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
      await activateDeployments({
        dispatch,
        activatableDeployments,
        installed: activeExtensions,
      });
      notify.success("Updated team deployments");
    } catch (error) {
      notify.error({ message: "Error updating team deployments", error });
    }
  }, [dispatch, activatableDeployments, permissions, activeExtensions]);

  const updateExtension = useCallback(async () => {
    await reloadIfNewVersionIsReady();
    notify.info(
      "The extension update hasn't yet been downloaded. Try again in a few minutes.",
    );
  }, []);

  return {
    hasUpdate: activatableDeployments?.length > 0,
    update: handleUpdateFromUserGesture,
    updateExtension,
    extensionUpdateRequired,
    // XXX: should `isLoading` if isAutoDeploying is true?
    isLoading: deploymentUpdateState.isLoading,
    error: deploymentUpdateState.error,
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
