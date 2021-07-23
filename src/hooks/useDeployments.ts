/*
 * Copyright (C) 2021 PixieBrix, Inc.
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
import { useCallback, useMemo } from "react";
import { useAsyncState } from "@/hooks/common";
import { collectPermissions, ensureAllPermissions } from "@/permissions";
import { useDispatch, useSelector } from "react-redux";
import { fromPairs } from "lodash";
import { reportEvent } from "@/telemetry/events";
import { optionsSlice } from "@/options/slices";
import {
  InstalledExtension,
  selectInstalledExtensions,
} from "@/options/selectors";
import { getErrorMessage } from "@/errors";
import useNotifications from "@/hooks/useNotifications";
import { getExtensionToken } from "@/auth/token";
import axios from "axios";
import { getBaseURL } from "@/services/baseService";
import { getExtensionVersion, getUID } from "@/background/telemetry";
import { activeDeployments } from "@/background/deployment";
import { refreshRegistries } from "@/hooks/refresh";
import { Dispatch } from "redux";

const { actions } = optionsSlice;

async function selectDeploymentPermissions(deployments: Deployment[]) {
  const blueprints = deployments.map((x) => x.package.config);
  // Deployments can only use proxied services, so there's no additional permissions to request for the
  // the serviceAuths.
  return collectPermissions(
    blueprints.flatMap((x) => x.extensionPoints),
    []
  );
}

async function fetchDeployments(
  installedExtensions: InstalledExtension[]
): Promise<Deployment[]> {
  const token = await getExtensionToken();
  const { data: deployments } = await axios.post<Deployment[]>(
    `${await getBaseURL()}/api/deployments/`,
    {
      uid: await getUID(),
      version: await getExtensionVersion(),
      active: activeDeployments(installedExtensions),
    },
    {
      headers: { Authorization: `Token ${token}` },
    }
  );
  return deployments;
}

const makeUpdatedFilter = (installed: InstalledExtension[]) => (
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
  installed: InstalledExtension[]
) {
  for (const deployment of deployments) {
    // Clear existing installs of the blueprint
    for (const extension of installed) {
      if (extension._recipe.id === deployment.package.package_id) {
        dispatch(
          actions.removeExtension({
            extensionPointId: extension.extensionPointId,
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
        services: fromPairs(
          deployment.bindings.map((x) => [x.auth.service_id, x.auth.id])
        ),
        deployment,
      })
    );

    reportEvent("DeploymentActivate", {
      deployment: deployment.id,
    });
  }
}

type DeploymentState = {
  hasUpdate: boolean;
  update: () => Promise<void>;
};

function useDeployments(): DeploymentState {
  const notify = useNotifications();
  const dispatch = useDispatch();
  const installed = useSelector(selectInstalledExtensions);

  const [deployments] = useAsyncState(async () => fetchDeployments(installed), [
    installed,
  ]);

  const updatedDeployments = useMemo(
    () => (deployments ?? []).filter(makeUpdatedFilter(installed)),
    [installed, deployments]
  );

  const handleUpdate = useCallback(async () => {
    if (!deployments) {
      notify.error("Deployments have not been fetched");
      return;
    }

    // Get the latest brick definitions so we have the latest permission requirements
    // XXX: is this being broadcast to the content scripts so they get the updated brick definition content?
    try {
      notify.info("Fetching latest brick definitions");
      await refreshRegistries();
    } catch (error: unknown) {
      // Try to proceed if we can't refresh the brick definitions
      notify.warning(
        `Error fetching latest bricks from server: ${getErrorMessage(error)}`,
        { error }
      );
    }

    const permissions = await selectDeploymentPermissions(deployments);

    let accepted = false;
    try {
      accepted = await ensureAllPermissions(permissions);
    } catch (error: unknown) {
      notify.error(`Error granting permissions: ${getErrorMessage(error)}`, {
        error,
      });
      return;
    }

    if (!accepted) {
      reportEvent("DeploymentRejectPermissions");
      notify.warning("You declined the permissions");
      return;
    }

    activateDeployments(dispatch, deployments, installed);

    notify.success("Activated team bricks");
  }, [deployments, dispatch, notify, installed]);

  return { hasUpdate: updatedDeployments?.length > 0, update: handleUpdate };
}

export default useDeployments;
