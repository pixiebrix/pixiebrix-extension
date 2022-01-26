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

import { Deployment } from "@/types/contract";
import { useCallback, useMemo, useState } from "react";
import { useAsyncState } from "@/hooks/common";
import { blueprintPermissions, ensureAllPermissions } from "@/permissions";
import { useDispatch, useSelector } from "react-redux";
import { reportEvent } from "@/telemetry/events";
import { selectExtensions } from "@/store/extensionsSelectors";
import { getErrorMessage } from "@/errors";
import useNotifications from "@/hooks/useNotifications";
import { getUID } from "@/background/telemetry";
import { getExtensionVersion } from "@/chrome";
import { selectInstalledDeployments } from "@/background/deployment";
import { refreshRegistries } from "@/hooks/useRefresh";
import { Dispatch } from "redux";
import { mergePermissions } from "@/utils/permissions";
import browser, { Permissions } from "webextension-polyfill";
import { IExtension, UUID, RegistryId } from "@/core";
import { maybeGetLinkedApiClient } from "@/services/apiClient";
import { satisfies } from "semver";
import { compact } from "lodash";
import chromeP from "webext-polyfill-kinda";
import extensionsSlice from "@/store/extensionsSlice";

const { actions } = extensionsSlice;

async function selectDeploymentPermissions(
  deployments: Deployment[]
): Promise<Permissions.Permissions> {
  const blueprints = deployments.map((x) => x.package.config);
  // Deployments can only use proxied services, so there's no additional permissions to request for the serviceAuths.
  const permissions = await Promise.all(
    blueprints.map(async (x) => blueprintPermissions(x))
  );
  return mergePermissions(permissions);
}

/**
 * Fetch deployments, or return empty array if the extension is not linked to the PixieBrix API.
 * @param installedExtensions
 */
async function fetchDeployments(
  installedExtensions: IExtension[]
): Promise<Deployment[]> {
  const client = await maybeGetLinkedApiClient();

  if (!client) {
    return [];
  }

  const { data: deployments } = await client.post<Deployment[]>(
    "/api/deployments/",
    {
      uid: await getUID(),
      version: await getExtensionVersion(),
      active: selectInstalledDeployments(installedExtensions),
    }
  );

  return deployments;
}

const makeUpdatedFilter = (installed: IExtension[]) => (
  deployment: Deployment
) => {
  const match = installed.find(
    (extension) => extension._deployment?.id === deployment.id
  );
  return (
    !match ||
    new Date(match._deployment.timestamp) < new Date(deployment.updated_at)
  );
};

function activateDeployments(
  dispatch: Dispatch,
  deployments: Deployment[],
  installed: IExtension[]
) {
  for (const deployment of deployments) {
    // Clear existing installs of the blueprint
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
        services: Object.fromEntries(
          deployment.bindings.map(
            (x) => [x.auth.service_id, x.auth.id] as [RegistryId, UUID]
          )
        ),
        deployment,
      })
    );

    reportEvent("DeploymentActivate", {
      deployment: deployment.id,
    });
  }
}

export type DeploymentState = {
  /**
   * True iff deployment and update notifications are snoozed
   */
  isSnoozed: boolean;

  /**
   * `true` iff one or more new deployments/deployment updates are available
   */
  hasUpdate: boolean;

  /**
   * Callback to update the deployments (will prompt the user for permissions if required)
   */
  update: () => Promise<void>;

  /**
   * Snooze deployment notifications for an amount of time.
   * @param snoozeMillis
   */
  snooze: (snoozeMillis: number) => Promise<void>;

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
  error: unknown | undefined;
};

/**
 * Returns `true` if the user needs to update their browser extension to install the deployments.
 *
 * For now assumes only minimum version requirements. (I.e., this method also returns true if there's a maximum version
 * violation).
 */
function checkExtensionUpdateRequired(deployments: Deployment[]): boolean {
  // Check that the user's extension van run the deployment
  const { version: extensionVersion } = browser.runtime.getManifest();
  const versionRanges = compact(
    deployments.map((x) => x.package.config.metadata.extensionVersion)
  );

  console.debug("Checking deployment version requirements", {
    versionRanges,
    extensionVersion,
  });

  // For now assume the only version restrictions will be that the version must be greater than a certain number
  return versionRanges.some(
    (versionRange) => !satisfies(extensionVersion, versionRange)
  );
}

function useDeployments(): DeploymentState {
  const [hide, setHide] = useState(false);

  const notify = useNotifications();
  const dispatch = useDispatch();
  const installedExtensions = useSelector(selectExtensions);

  const [deployments, isLoading, fetchError] = useAsyncState(
    async () => fetchDeployments(installedExtensions),
    [installedExtensions]
  );

  const [updatedDeployments, extensionUpdateRequired] = useMemo(() => {
    const isUpdated = makeUpdatedFilter(installedExtensions);
    const updatedDeployments = (deployments ?? []).filter((x) => isUpdated(x));
    return [
      updatedDeployments,
      checkExtensionUpdateRequired(updatedDeployments),
    ];
  }, [installedExtensions, deployments]);

  const handleUpdate = useCallback(async () => {
    if (deployments == null) {
      notify.error("Deployments have not been fetched");
      return;
    }

    try {
      notify.info("Fetching latest brick definitions");
      // Get the latest brick definitions so we have the latest permission and version requirements
      // XXX: is this being broadcast to the content scripts so they get the updated brick definition content?
      await refreshRegistries();
    } catch (error) {
      // Try to proceed if we can't refresh the brick definitions
      notify.warning(
        `Error fetching latest bricks from server: ${getErrorMessage(error)}`,
        { error, report: true }
      );
    }

    if (checkExtensionUpdateRequired(deployments)) {
      await chromeP.runtime.requestUpdateCheck();
      notify.warning(
        "You must update the PixieBrix browser extension to activate the deployment",
        {
          event: "DeploymentRejectVersion",
        }
      );
      return;
    }

    const permissions = await selectDeploymentPermissions(deployments);

    let accepted = false;
    try {
      accepted = await ensureAllPermissions(permissions);
    } catch (error) {
      notify.error(`Error granting permissions: ${getErrorMessage(error)}`, {
        error,
      });
      return;
    }

    if (!accepted) {
      notify.warning("You declined the permissions", {
        event: "DeploymentRejectPermissions",
      });
      return;
    }

    try {
      activateDeployments(dispatch, deployments, installedExtensions);
      notify.success("Activated team deployments");
    } catch (error) {
      setHide(true);
      notify.error("Error activating team deployments", {
        error,
      });
    }
  }, [deployments, dispatch, notify, installedExtensions, setHide]);

  const snooze = useCallback(() => {
    // Track inside hook so we don't have to refetch state from storage
    setHide(true);
    throw new Error("Snooze not implemented");
  }, [setHide]);

  const updateExtension = useCallback(async () => {
    await chromeP.runtime.requestUpdateCheck();
    browser.runtime.reload();
  }, []);

  return {
    hasUpdate: updatedDeployments?.length > 0,
    update: handleUpdate,
    updateExtension,
    extensionUpdateRequired,
    isLoading,
    error: fetchError,
    snooze,
    isSnoozed: true || hide,
  };
}

export default useDeployments;
