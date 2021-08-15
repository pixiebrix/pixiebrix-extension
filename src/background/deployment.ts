/* eslint-disable filenames/match-exported */
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

import { ExtensionOptions, loadOptions, saveOptions } from "@/options/loader";
import { Deployment } from "@/types/contract";
import { browser } from "webextension-polyfill-ts";
import { fromPairs, partition, uniqBy } from "lodash";
import { reportError } from "@/telemetry/logging";
import axios from "axios";
import { getBaseURL } from "@/services/baseService";
import { getExtensionVersion, getUID } from "@/background/telemetry";
import { getExtensionToken } from "@/auth/token";
import { optionsSlice, OptionsState } from "@/options/slices";
import { reportEvent } from "@/telemetry/events";
import { refreshRegistries } from "@/hooks/useRefresh";
import { liftBackground } from "@/background/protocol";
import * as contentScript from "@/contentScript/lifecycle";
import { selectInstalledExtensions } from "@/options/selectors";
import { uninstallContextMenu } from "@/background/contextMenus";
import { containsPermissions } from "@/utils/permissions";
import { deploymentPermissions } from "@/permissions";

const { reducer, actions } = optionsSlice;

const UPDATE_INTERVAL_MS = 10 * 60 * 1000;

type ActiveDeployment = {
  deployment: string;
  blueprint: string;
  blueprintVersion: string;
};

export function activeDeployments(
  extensions: Array<Pick<ExtensionOptions, "_deployment" | "_recipe">>
): ActiveDeployment[] {
  return uniqBy(
    extensions
      .filter((x) => x._deployment?.id != null)
      .map((x) => ({
        deployment: x._deployment.id,
        blueprint: x._recipe?.id,
        blueprintVersion: x._recipe?.version,
      })),
    (x) => x.deployment
  );
}

export const queueReactivate = liftBackground(
  "QUEUE_REACTIVATE",
  async () => {
    await contentScript.queueReactivate(null);
  },
  { asyncResponse: false }
);

function installDeployment(
  state: OptionsState,
  deployment: Deployment
): OptionsState {
  let returnState = state;
  const installed = selectInstalledExtensions({ options: state });

  for (const extension of installed) {
    if (extension._recipe.id === deployment.package.package_id) {
      const identifier = {
        extensionPointId: extension.extensionPointId,
        extensionId: extension.id,
      };

      void uninstallContextMenu(identifier).catch((error) => {
        reportError(error);
      });

      returnState = reducer(returnState, actions.removeExtension(identifier));
    }
  }

  // Install the blueprint with the service definition
  returnState = reducer(
    returnState,
    actions.installRecipe({
      recipe: deployment.package.config,
      extensionPoints: deployment.package.config.extensionPoints,
      deployment,
      services: fromPairs(
        deployment.bindings.map((x) => [x.auth.service_id, x.auth.id])
      ),
    })
  );

  reportEvent("DeploymentActivate", {
    deployment: deployment.id,
    auto: true,
  });

  return returnState;
}

function makeDeploymentTimestampLookup(extensions: ExtensionOptions[]) {
  const timestamps = new Map<string, Date>();

  for (const extension of extensions) {
    if (extension._deployment?.id) {
      timestamps.set(
        extension._deployment?.id,
        new Date(extension._deployment?.timestamp)
      );
    }
  }

  return timestamps;
}

async function updateDeployments() {
  const token = await getExtensionToken();

  if (!token) {
    return;
  }

  const { extensions: extensionPointConfigs } = await loadOptions();
  const extensions: ExtensionOptions[] = Object.entries(
    extensionPointConfigs
  ).flatMap(([, xs]) => Object.values(xs));

  if (!extensions.some((x) => x._deployment?.id)) {
    console.debug("No deployments installed");
    return;
  }

  const { data: deployments } = await axios.post<Deployment[]>(
    `${await getBaseURL()}/api/deployments/`,
    {
      uid: await getUID(),
      version: await getExtensionVersion(),
      active: activeDeployments(extensions),
    },
    {
      headers: { Authorization: `Token ${token}` },
    }
  );

  const timestamps = makeDeploymentTimestampLookup(extensions);

  const updatedDeployments = deployments.filter(
    (x: Deployment) =>
      !timestamps.has(x.id) || new Date(x.updated_at) > timestamps.get(x.id)
  );

  if (updatedDeployments.length === 0) {
    console.debug("No deployment updates found");
    return;
  }

  // Fetch the current brick definitions, which will have the current permissions
  try {
    await refreshRegistries();
  } catch (error: unknown) {
    reportError(error);
    await browser.runtime.openOptionsPage();
    // Bail and open the main options page, which 1) fetches the latest bricks, and 2) will prompt the user the to
    // manually install the deployments via the banner
    return;
  }

  const deploymentRequirements = await Promise.all(
    updatedDeployments.map(async (deployment) => ({
      deployment,
      hasPermissions: await containsPermissions(
        await deploymentPermissions(deployment)
      ),
    }))
  );

  const [automatic, manual] = partition(
    deploymentRequirements,
    (x) => x.hasPermissions
  );

  let automaticError: unknown;

  if (automatic.length > 0) {
    console.debug(
      `Applying automatic updates for ${automatic.length} deployment(s)`
    );

    try {
      let currentOptions = await loadOptions();
      for (const { deployment } of automatic) {
        // Clear existing installs of the blueprint
        currentOptions = installDeployment(currentOptions, deployment);
      }

      await saveOptions(currentOptions);
      void queueReactivate();
      console.info(
        `Applied automatic updates for ${automatic.length} deployment(s)`
      );
    } catch (error: unknown) {
      reportError(error);
      automaticError = error;
    }
  }

  // We only want to call openOptionsPage a single time
  if (manual.length > 0 || automaticError != null) {
    console.debug(
      "Opening options page for user to manually activate updated deployment(s)",
      {
        manual,
        automaticError,
      }
    );
    await browser.runtime.openOptionsPage();
  }
}

function initDeploymentUpdater(): void {
  setInterval(updateDeployments, UPDATE_INTERVAL_MS);
  void updateDeployments();
}

export default initDeploymentUpdater;
