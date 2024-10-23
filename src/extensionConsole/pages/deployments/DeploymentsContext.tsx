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
import notify from "@/utils/notify";
import { integrationConfigLocator } from "@/background/messenger/api";
import { refreshRegistries } from "@/hooks/useRefreshRegistries";
import useFlags, { type FlagHelpers } from "@/hooks/useFlags";
import {
  checkExtensionUpdateRequired,
  makeUpdatedFilter,
  selectActivatedDeployments,
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
import type { ActivatedDeployment, Deployment } from "@/types/contract";
import useBrowserIdentifier from "@/hooks/useBrowserIdentifier";
import type { ActivatableDeployment } from "@/types/deploymentTypes";
import type { Permissions } from "webextension-polyfill";
import useDeactivateUnassignedDeploymentsEffect from "@/extensionConsole/pages/deployments/useDeactivateUnassignedDeploymentsEffect";
import { valueToAsyncState } from "@/utils/asyncStateUtils";
import { RestrictedFeatures } from "@/auth/featureFlags";
import { selectModInstances } from "@/store/modComponents/modInstanceSelectors";
import type { ModInstance } from "@/types/modInstanceTypes";
import { type AsyncDispatch } from "@/extensionConsole/store";

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
  const dispatch = useDispatch<AsyncDispatch>();
  const { data: browserIdentifier } = useBrowserIdentifier();
  const modInstances = useSelector(selectModInstances);
  const { state: flagsState } = useFlags();
  const activeDeployments = useMemoCompare<ActivatedDeployment[]>(
    selectActivatedDeployments(modInstances),
    isEqual,
  );

  const deploymentsState = useGetDeploymentsQuery(
    {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- see skip
      uid: browserIdentifier!,
      version: getExtensionVersion(),
      active: activeDeployments,
    },
    {
      skip: !browserIdentifier, // Avoid fetching deployments until we have a UUID
      refetchOnMountOrArgChange: 60, // 1 minute
    },
  );

  const deploymentUpdateState = useDeriveAsyncState(
    deploymentsState,
    flagsState,
    // Including modInstances in the dependencies to ensure the derived state is recalculated when they change
    valueToAsyncState(modInstances),
    async (
      deployments: Deployment[],
      { restrict }: FlagHelpers,
      _modInstances: ModInstance[],
    ) => {
      const isUpdated = makeUpdatedFilter(_modInstances, {
        restricted: restrict(RestrictedFeatures.DEACTIVATE_DEPLOYMENT),
      });

      const deployedModIds = new Set(
        deployments.map((deployment) => deployment.package.package_id),
      );

      const unassignedModInstances = _modInstances.filter(
        (modInstance) =>
          modInstance.deploymentMetadata &&
          !deployedModIds.has(modInstance.definition.metadata.id),
      );

      const updatedDeployments = deployments.filter((x) => isUpdated(x));

      const [activatableDeployments] = await Promise.all([
        fetchDeploymentModDefinitions(updatedDeployments),
        // `refreshRegistries` to ensure user has the latest brick definitions before deploying. `refreshRegistries`
        // uses memoizedUntilSettled to avoid excessive calls.
        updatedDeployments.length > 0 ? refreshRegistries() : Promise.resolve(),
      ]);

      // Log performance to determine if we're having issues with messenger/IDB performance
      const { permissions } = mergePermissionsStatuses(
        await logPromiseDuration(
          "useDeployments:checkDeploymentPermissions",
          Promise.all(
            activatableDeployments.map(async (activatableDeployment) =>
              checkDeploymentPermissions({
                activatableDeployment,
                locate:
                  integrationConfigLocator.findAllSanitizedConfigsForIntegration,
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
        unassignedModInstances,
        extensionUpdateRequired: checkExtensionUpdateRequired(
          activatableDeployments,
        ),
        permissions,
      };
    },
  );

  // Fallback values for loading/error states
  const {
    activatableDeployments,
    unassignedModInstances,
    extensionUpdateRequired,
    permissions,
  } = deploymentUpdateState.data ?? {
    // `useAutoDeploy` expects `null` to represent deployment loading state. It tries to activate once available
    activatableDeployments: null as ActivatableDeployment[] | null,
    extensionUpdateRequired: false as boolean,
    unassignedModInstances: [],
    permissions: [] as Permissions.Permissions,
  };

  const { isAutoDeploying } = useAutoDeploy({
    activatableDeployments,
    modInstances,
    extensionUpdateRequired,
  });

  useDeactivateUnassignedDeploymentsEffect(unassignedModInstances);

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
      // if there are no deployments to activate.
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
      await dispatch(
        activateDeployments({
          activatableDeployments,
          modInstances,
          reloadMode: "immediate",
        }),
      );
      notify.success("Updated team deployments");
    } catch (error) {
      notify.error({ message: "Error updating team deployments", error });
    }
  }, [dispatch, activatableDeployments, permissions, modInstances]);

  const updateExtension = useCallback(async () => {
    await reloadIfNewVersionIsReady();
    notify.info(
      "The extension update hasn't yet been downloaded. Try again in a few minutes.",
    );
  }, []);

  return {
    hasUpdate:
      (activatableDeployments && activatableDeployments.length > 0) ?? false,
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
