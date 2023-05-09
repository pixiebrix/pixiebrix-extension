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

import { type Deployment } from "@/types/contract";
import React, { useCallback, useMemo } from "react";
import {
  ensurePermissionsFromUserGesture,
  mergePermissionsStatuses,
} from "@/permissions/permissionsUtils";
import { useDispatch, useSelector } from "react-redux";
import { reportEvent } from "@/telemetry/events";
import { selectExtensions } from "@/store/extensionsSelectors";
import notify from "@/utils/notify";
import { getUID, services } from "@/background/messenger/api";
import { getExtensionVersion, reloadIfNewVersionIsReady } from "@/chrome";
import { refreshRegistries } from "@/hooks/useRefreshRegistries";
import { type Dispatch } from "redux";
import { type IExtension } from "@/types/extensionTypes";
import { maybeGetLinkedApiClient } from "@/services/apiClient";
import extensionsSlice from "@/store/extensionsSlice";
import useFlags from "@/hooks/useFlags";
import {
  checkExtensionUpdateRequired,
  makeUpdatedFilter,
  mergeDeploymentServiceConfigurations,
  selectInstalledDeployments,
} from "@/utils/deploymentUtils";
import settingsSlice from "@/store/settingsSlice";
import { checkDeploymentPermissions } from "@/permissions/deploymentPermissionsHelpers";
import useAsyncState from "@/hooks/useAsyncState";

const { actions } = extensionsSlice;

/**
 * Fetch deployments, or return empty array if the extension is not linked to the PixieBrix API.
 */
async function fetchDeployments(
  installedExtensions: IExtension[]
): Promise<Deployment[]> {
  const client = await maybeGetLinkedApiClient();

  if (!client) {
    // Not authenticated
    return [];
  }

  const { data: deployments } = await client.post<Deployment[]>(
    "/api/deployments/",
    {
      uid: await getUID(),
      version: getExtensionVersion(),
      active: selectInstalledDeployments(installedExtensions),
    }
  );

  return deployments;
}

async function activateDeployment(
  dispatch: Dispatch,
  deployment: Deployment,
  installed: IExtension[]
): Promise<void> {
  // Clear existing installations of the blueprint
  for (const extension of installed) {
    // Extension won't have recipe if it was locally created by a developer
    if (extension._recipe?.id === deployment.package.package_id) {
      dispatch(
        actions.removeExtension({
          extensionId: extension.id,
        })
      );
    }
  }

  // Install the blueprint with the service definition
  dispatch(
    actions.installRecipe({
      recipe: deployment.package.config,
      extensionPoints: deployment.package.config.extensionPoints,
      deployment,
      services: await mergeDeploymentServiceConfigurations(
        deployment,
        services.locateAllForId
      ),
      // Assume validation on the backend for options
      optionsArgs: deployment.options_config,
    })
  );

  reportEvent("DeploymentActivate", {
    deployment: deployment.id,
  });
}

async function activateDeployments(
  dispatch: Dispatch,
  deployments: Deployment[],
  installed: IExtension[]
): Promise<void> {
  // Activate as many as we can
  const errors = [];

  for (const deployment of deployments) {
    try {
      // eslint-disable-next-line no-await-in-loop -- modifies redux state
      await activateDeployment(dispatch, deployment, installed);
    } catch (error) {
      errors.push(error);
    }
  }

  if (errors.length > 0) {
    // XXX: only throwing the first is OK, because the user will see the next error if they fix this error and then
    // activate deployments again
    throw errors[0];
  }
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
   * The error if fetching available deployments failed, or undefined if loading/deployments were successfully fetched
   */
  error: unknown;
};

const initialValue: DeploymentsState = {
  hasUpdate: false,
  async update() {},
  extensionUpdateRequired: false,
  async updateExtension() {},
  isLoading: true,
  error: false,
};

function useDeployments(): DeploymentsState {
  const dispatch = useDispatch();
  const installedExtensions = useSelector(selectExtensions);
  const { restrict } = useFlags();

  const {
    data: deployments,
    isLoading,
    error: fetchError,
  } = useAsyncState(async () => {
    // Refresh registries to ensure user has the latest brick definitions. Refresh registries uses
    // memoizedUntilSettled to avoid excessive calls
    const [deployments] = await Promise.all([
      fetchDeployments(installedExtensions),
      refreshRegistries(),
    ]);
    return deployments;
  }, [installedExtensions]);

  const [updatedDeployments, extensionUpdateRequired] = useMemo(() => {
    const isUpdated = makeUpdatedFilter(installedExtensions, {
      restricted: restrict("uninstall"),
    });
    const updatedDeployments = (deployments ?? []).filter((x) => isUpdated(x));
    return [
      updatedDeployments,
      checkExtensionUpdateRequired(updatedDeployments),
    ];
  }, [restrict, installedExtensions, deployments]);

  const handleUpdateFromUserGesture = useCallback(async () => {
    // Always reset. So even if there's an error, the user at least has a grace period before PixieBrix starts
    // notifying them to update again
    dispatch(settingsSlice.actions.resetUpdatePromptTimestamp());

    if (deployments == null) {
      notify.error("Deployments have not been fetched");
      return;
    }

    // IMPORTANT: can't do a fetch or any potentially long operation because the call the request permissions must
    // happen within 5 seconds of the user gesture. Permissions check should come as early as possible.
    let accepted = false;
    try {
      const { permissions } = mergePermissionsStatuses(
        await Promise.all(
          deployments.map(async (deployment) =>
            checkDeploymentPermissions(deployment, services.locateAllForId)
          )
        )
      );

      accepted = await ensurePermissionsFromUserGesture(permissions);
    } catch (error) {
      notify.error({
        message: "Error granting permissions",
        error,
      });
      return;
    }

    if (checkExtensionUpdateRequired(deployments)) {
      void browser.runtime.requestUpdateCheck();
      notify.warning(
        "You must update the PixieBrix browser extension to activate the deployment"
      );
      reportEvent("DeploymentRejectVersion");
      return;
    }

    if (!accepted) {
      notify.warning("You declined the permissions");
      reportEvent("DeploymentRejectPermissions");
      return;
    }

    try {
      await activateDeployments(dispatch, deployments, installedExtensions);
      notify.success("Activated team deployments");
    } catch (error) {
      notify.error({ message: "Error activating team deployments", error });
    }
  }, [deployments, dispatch, installedExtensions]);

  const updateExtension = useCallback(async () => {
    await reloadIfNewVersionIsReady();
    notify.info(
      "The extension update hasn't yet been downloaded. Try again in a few minutes."
    );
  }, []);

  return {
    hasUpdate: updatedDeployments?.length > 0,
    update: handleUpdateFromUserGesture,
    updateExtension,
    extensionUpdateRequired,
    isLoading,
    error: fetchError,
  };
}

const DeploymentsContext = React.createContext<DeploymentsState>(initialValue);

/**
 * Provides deployment status to the children. Written as context instead of hook to allow for a singleton
 * instance tracking the deployment status.
 * @constructor
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
