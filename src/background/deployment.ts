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

import { loadOptions, saveOptions } from "@/options/loader";
import { Deployment } from "@/types/contract";
import browser from "webextension-polyfill";
import { partition, uniqBy } from "lodash";
import { reportError } from "@/telemetry/logging";
import { getUID } from "@/background/telemetry";
import { getExtensionVersion } from "@/chrome";
import { isLinked } from "@/auth/token";
import { optionsSlice } from "@/options/slices";
import { reportEvent } from "@/telemetry/events";
import { refreshRegistries } from "@/hooks/useRefresh";
import { selectExtensions } from "@/options/selectors";
import {
  uninstallContextMenu,
  containsPermissions,
} from "@/background/messenger/api";
import { deploymentPermissions } from "@/permissions";
import { IExtension, UUID, RegistryId } from "@/core";
import { ExtensionOptionsState } from "@/store/extensions";
import { getLinkedApiClient } from "@/services/apiClient";
import { queueReactivateTab } from "@/contentScript/messenger/api";
import { forEachTab } from "./util";
import { parse as parseSemVer, satisfies, SemVer } from "semver";

const { reducer, actions } = optionsSlice;

const UPDATE_INTERVAL_MS = 5 * 60 * 1000;

/**
 * Deployment installed on the client. A deployment may be installed but not active (see DeploymentContext.active)
 */
type InstalledDeployment = {
  deployment: UUID;
  blueprint: RegistryId;
  blueprintVersion: string;
};

export function selectInstalledDeployments(
  extensions: Array<Pick<IExtension, "_deployment" | "_recipe">>
): InstalledDeployment[] {
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

export function queueReactivateEveryTab(): void {
  void forEachTab(queueReactivateTab);
}

function installDeployment(
  state: ExtensionOptionsState,
  deployment: Deployment
): ExtensionOptionsState {
  let returnState = state;
  const installed = selectExtensions({ options: state });

  // Uninstall existing versions of the extensions
  for (const extension of installed) {
    if (extension._recipe.id === deployment.package.package_id) {
      const extensionRef = {
        extensionId: extension.id,
      };

      void uninstallContextMenu(extensionRef).catch(reportError);

      returnState = reducer(returnState, actions.removeExtension(extensionRef));
    }
  }

  // Install the deployment's blueprint with the service definition
  returnState = reducer(
    returnState,
    actions.installRecipe({
      recipe: deployment.package.config,
      extensionPoints: deployment.package.config.extensionPoints,
      deployment,
      services: Object.fromEntries(
        deployment.bindings.map(
          (x) => [x.auth.service_id, x.auth.id] as [RegistryId, UUID]
        )
      ),
    })
  );

  reportEvent("DeploymentActivate", {
    deployment: deployment.id,
    auto: true,
  });

  return returnState;
}

function makeDeploymentTimestampLookup(extensions: IExtension[]) {
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

/**
 * Return true if the deployment can be automatically installed
 */
function canAutomaticallyInstall({
  deployment,
  hasPermissions,
  extensionVersion,
}: {
  deployment: Deployment;
  hasPermissions: boolean;
  extensionVersion: SemVer;
}): boolean {
  if (!hasPermissions) {
    return false;
  }

  const requiredRange = deployment.package.config.metadata.extensionVersion;
  return !requiredRange || satisfies(extensionVersion, requiredRange);
}

async function updateDeployments() {
  if (!(await isLinked())) {
    return;
  }

  // Always get the freshest options slice from the local storage
  const { extensions } = await loadOptions();

  // For a user has to go to the Active Bricks page to activate their first deployment
  if (!extensions.some((x) => x._deployment?.id)) {
    console.debug("No deployments installed");
    return;
  }

  const { version: extensionVersionString } = browser.runtime.getManifest();
  const extensionVersion = parseSemVer(extensionVersionString);

  const { data: deployments } = await (await getLinkedApiClient()).post<
    Deployment[]
  >("/api/deployments/", {
    uid: await getUID(),
    version: await getExtensionVersion(),
    active: selectInstalledDeployments(extensions),
  });

  const timestamps = makeDeploymentTimestampLookup(extensions);

  // This check also detects changes to the `active` flag of the deployment, because the updated_at is bumped whenever
  // the active flag changes
  const updatedDeployments = deployments.filter(
    (deployment) =>
      !timestamps.has(deployment.id) ||
      new Date(deployment.updated_at) > timestamps.get(deployment.id)
  );

  if (updatedDeployments.length === 0) {
    console.debug("No deployment updates found");
    return;
  }

  // Fetch the current brick definitions, which will have the current permissions and extensionVersion requirements
  try {
    await refreshRegistries();
  } catch (error) {
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

  const [automatic, manual] = partition(deploymentRequirements, (x) =>
    canAutomaticallyInstall({ ...x, extensionVersion })
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
      queueReactivateEveryTab();
      console.info(
        `Applied automatic updates for ${automatic.length} deployment(s)`
      );
    } catch (error) {
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
