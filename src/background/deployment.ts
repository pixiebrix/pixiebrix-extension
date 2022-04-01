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

import { Deployment, Me } from "@/types/contract";
import { isEmpty, partition, uniqBy } from "lodash";
import reportError from "@/telemetry/reportError";
import { getUID } from "@/background/telemetry";
import { getExtensionVersion, ManualStorageKey, readStorage } from "@/chrome";
import { isLinked, readAuthData, updateUserData } from "@/auth/token";
import { reportEvent } from "@/telemetry/events";
import { refreshRegistries } from "@/hooks/useRefresh";
import { selectExtensions } from "@/store/extensionsSelectors";
import { deploymentPermissions } from "@/permissions";
import { IExtension, UUID, RegistryId } from "@/core";
import { maybeGetLinkedApiClient } from "@/services/apiClient";
import { queueReactivateTab } from "@/contentScript/messenger/api";
import { forEachTab } from "./util";
import { parse as parseSemVer, satisfies, SemVer } from "semver";
import { ExtensionOptionsState } from "@/store/extensionsTypes";
import extensionsSlice from "@/store/extensionsSlice";
import { loadOptions, saveOptions } from "@/store/extensionsStorage";
import { expectContext } from "@/utils/expectContext";
import { getSettingsState } from "@/store/settingsStorage";
import { isUpdateAvailable } from "@/background/installer";
import { selectUserDataUpdate } from "@/auth/authUtils";
import { uninstallContextMenu } from "@/background/contextMenus";

const { reducer, actions } = extensionsSlice;

const UPDATE_INTERVAL_MS = 5 * 60 * 1000;

const MANAGED_CAMPAIGN_IDS_KEY = "campaignIds" as ManualStorageKey;

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

async function setExtensionsState(state: ExtensionOptionsState): Promise<void> {
  await saveOptions(state);
  await forEachTab(queueReactivateTab);
}

function uninstallExtension(
  state: ExtensionOptionsState,
  extensionId: UUID
): ExtensionOptionsState {
  const extensionRef = {
    extensionId,
  };
  void uninstallContextMenu(extensionRef);
  return reducer(state, actions.removeExtension(extensionRef));
}

/**
 * Uninstall all deployments by uninstalling all extensions associated with the deployment.
 */
export async function uninstallAllDeployments(): Promise<void> {
  let state = await loadOptions();
  const installed = selectExtensions({ options: state });

  const toUninstall = installed.filter(
    (extension) => !isEmpty(extension._deployment)
  );

  if (toUninstall.length === 0) {
    return;
  }

  // Uninstall existing versions of the extensions
  for (const extension of toUninstall) {
    state = uninstallExtension(state, extension.id);
  }

  await setExtensionsState(state);

  reportEvent("DeploymentDeactivateAll", {
    auto: true,
  });
}

export async function uninstallUnmatchedDeployments(
  deployments: Deployment[]
): Promise<void> {
  let state = await loadOptions();
  const installed = selectExtensions({ options: state });

  const recipeIds = new Set(
    deployments.map((x) => x.package.package_id as RegistryId)
  );
  const toUninstall = installed.filter(
    (extension) =>
      !isEmpty(extension._deployment) && !recipeIds.has(extension._recipe.id)
  );

  if (toUninstall.length === 0) {
    return;
  }

  for (const extension of toUninstall) {
    state = uninstallExtension(state, extension.id);
  }

  await setExtensionsState(state);

  reportEvent("DeploymentDeactivateAll", {
    auto: true,
  });
}

function uninstallRecipe(
  state: ExtensionOptionsState,
  recipeId: RegistryId
): ExtensionOptionsState {
  let returnState = state;
  const installed = selectExtensions({ options: state });

  // Uninstall existing versions of the extensions
  for (const extension of installed) {
    if (extension._recipe.id === recipeId) {
      returnState = uninstallExtension(returnState, extension.id);
    }
  }

  return returnState;
}

function installDeployment(
  state: ExtensionOptionsState,
  deployment: Deployment
): ExtensionOptionsState {
  let returnState = state;

  // Uninstall existing versions of the extensions
  returnState = uninstallRecipe(
    returnState,
    deployment.package.package_id as RegistryId
  );

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

/**
 * Install all deployments
 * @param deployments deployments that PixieBrix already has permission to run
 */
async function installDeployments(deployments: Deployment[]): Promise<void> {
  let state = await loadOptions();
  for (const deployment of deployments) {
    state = installDeployment(state, deployment);
  }

  await setExtensionsState(state);
}

function makeDeploymentTimestampLookup(
  extensions: IExtension[]
): Map<string, Date> {
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

type DeploymentConstraint = {
  deployment: Deployment;
  hasPermissions: boolean;
  extensionVersion: SemVer;
};

/**
 * Return true if the deployment can be automatically installed
 */
function canAutomaticallyInstall({
  deployment,
  hasPermissions,
  extensionVersion,
}: DeploymentConstraint): boolean {
  if (!hasPermissions) {
    return false;
  }

  const requiredRange = deployment.package.config.metadata.extensionVersion;
  return !requiredRange || satisfies(extensionVersion, requiredRange);
}

async function selectUpdatedDeployments(
  deployments: Deployment[]
): Promise<Deployment[]> {
  // Always get the freshest options slice from the local storage
  const { extensions } = await loadOptions();

  const timestamps = makeDeploymentTimestampLookup(extensions);

  // This check also detects changes to the `active` flag of the deployment, because the updated_at is bumped whenever
  // the active flag changes
  return deployments.filter(
    (deployment) =>
      !timestamps.has(deployment.id) ||
      new Date(deployment.updated_at) > timestamps.get(deployment.id)
  );
}

/**
 * Sync local deployments with provisioned deployments.
 *
 * If PixieBrix does not have the permissions required to automatically activate a deployment, opens the Options page
 * so the user can click to activate the deployments.
 */
export async function updateDeployments(): Promise<void> {
  expectContext("background");

  const now = Date.now();

  const [linked, { organizationId }, { nextUpdate }] = await Promise.all([
    isLinked(),
    readAuthData(),
    getSettingsState(),
  ]);

  if (!linked) {
    // If the Browser extension is unlinked (it doesn't have the API key), just NOP. If it's an enterprise user, it's
    // likely they just need to reconnect their extension. If it's a non-enterprise user, they shouldn't have any
    // deployments installed anyway.
    return;
  }

  if (organizationId == null) {
    // One of the three scenarios hold:
    // 1) has never been a member of an organization,
    // 2) has left their organization,
    // 3) linked their extension to a non-organization profile
    await uninstallAllDeployments();
    return;
  }

  // Always get the freshest options slice from the local storage
  const { extensions } = await loadOptions();

  // Version to report to the server. The update check happens via isUpdateAvailable below
  const { version: extensionVersionString } = browser.runtime.getManifest();
  const extensionVersion = parseSemVer(extensionVersionString);

  // This is the "heartbeat". The old behavior was to only send if the user had at least one deployment installed.
  // Now we're always sending in order to help team admins understand any gaps between number of registered users
  // and amount of activity when using deployments
  const client = await maybeGetLinkedApiClient();
  if (client == null) {
    console.debug(
      "Skipping  deployments update because the extension is not linked to the PixieBrix service"
    );
    return;
  }

  const { data: profile, status: profileResponseStatus } = await client.get<Me>(
    "/api/me/"
  );

  if (profileResponseStatus >= 400) {
    // If our server is acting up, check again later
    console.debug(
      "Skipping deployments update because /api/me/ request failed"
    );
    return;
  }

  // Ensure the user's flags and telemetry information is up-to-date
  void updateUserData(selectUserDataUpdate(profile));

  const { data: deployments, status: deploymentResponseStatus } =
    await client.post<Deployment[]>("/api/deployments/", {
      uid: await getUID(),
      version: await getExtensionVersion(),
      active: selectInstalledDeployments(extensions),
      campaignId: await readStorage(
        MANAGED_CAMPAIGN_IDS_KEY,
        undefined,
        "managed"
      ),
    });

  if (deploymentResponseStatus >= 400) {
    // Our server is active up, check again later
    console.debug(
      "Skipping deployments update because /api/deployments/ request failed"
    );
    return;
  }

  // Always uninstall unmatched deployments
  await uninstallUnmatchedDeployments(deployments);

  if (nextUpdate && nextUpdate > now) {
    console.debug("Skipping deployments update because updates are snoozed", {
      nextUpdate,
    });
    return;
  }

  if (
    isUpdateAvailable() &&
    // `restricted-version` is an implicit flag from the MeSerializer
    profile.flags.includes("restricted-version")
  ) {
    console.info("Extension update available from the web store");
    // Have the user update their browser extension. (Since the new version might impact the deployment activation)
    void browser.runtime.openOptionsPage();
    return;
  }

  const updatedDeployments = await selectUpdatedDeployments(deployments);

  if (updatedDeployments.length === 0) {
    console.debug("No deployment updates found");
    return;
  }

  // Fetch the current brick definitions, which will have the current permissions and extensionVersion requirements
  try {
    await refreshRegistries();
  } catch (error) {
    reportError(error);
    void browser.runtime.openOptionsPage();
    // Bail and open the main options page, which 1) fetches the latest bricks, and 2) will prompt the user the to
    // manually install the deployments via the banner
    return;
  }

  const deploymentRequirements = await Promise.all(
    updatedDeployments.map(async (deployment) => ({
      deployment,
      hasPermissions: await browser.permissions.contains(
        await deploymentPermissions(deployment)
      ),
    }))
  );

  const [automatic, manual] = partition(deploymentRequirements, (x) =>
    canAutomaticallyInstall({ ...x, extensionVersion })
  );

  let automaticError: boolean;

  if (automatic.length > 0) {
    try {
      await installDeployments(automatic.map((x) => x.deployment));
    } catch (error) {
      reportError(error);
      automaticError = true;
    }
  }

  // We only want to call openOptionsPage a single time
  if (manual.length > 0 || automaticError) {
    void browser.runtime.openOptionsPage();
  }
}

function initDeploymentUpdater(): void {
  setInterval(updateDeployments, UPDATE_INTERVAL_MS);
  void updateDeployments();
}

export default initDeploymentUpdater;
