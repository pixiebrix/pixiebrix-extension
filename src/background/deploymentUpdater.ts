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

import { type Deployment, type Me } from "@/types/contract";
import { isEmpty, partition } from "lodash";
import reportError from "@/telemetry/reportError";
import { getUUID } from "@/telemetry/telemetryHelpers";
import { isLinked, readAuthData, updateUserData } from "@/auth/authStorage";
import reportEvent from "@/telemetry/reportEvent";
import { refreshRegistries } from "@/hooks/useRefreshRegistries";
import {
  selectExtensions,
  selectExtensionsForRecipe,
} from "@/store/extensionsSelectors";
import { maybeGetLinkedApiClient } from "@/data/service/apiClient";
import { queueReactivateTab } from "@/contentScript/messenger/api";
import { forEachTab, getExtensionVersion } from "@/utils/extensionUtils";
import { parse as parseSemVer, satisfies, type SemVer } from "semver";
import { type ModComponentState } from "@/store/extensionsTypes";
import extensionsSlice from "@/store/extensionsSlice";
import {
  getModComponentState,
  saveModComponentState,
} from "@/store/extensionsStorage";
import { expectContext } from "@/utils/expectContext";
import {
  getSettingsState,
  saveSettingsState,
} from "@/store/settings/settingsStorage";
import { isUpdateAvailable } from "@/background/installer";
import { selectUserDataUpdate } from "@/auth/authUtils";
import {
  findLocalDeploymentConfiguredIntegrationDependencies,
  makeUpdatedFilter,
  mergeDeploymentIntegrationDependencies,
  selectInstalledDeployments,
} from "@/utils/deploymentUtils";
import { selectUpdatePromptState } from "@/store/settings/settingsSelectors";
import settingsSlice from "@/store/settings/settingsSlice";
import { locator } from "@/background/locator";
import { getEditorState, saveEditorState } from "@/store/editorStorage";
import { type EditorState } from "@/pageEditor/pageEditorTypes";
import { editorSlice } from "@/pageEditor/slices/editorSlice";
import { removeExtensionForEveryTab } from "@/background/removeExtensionForEveryTab";
import registerBuiltinBricks from "@/bricks/registerBuiltinBricks";
import registerContribBlocks from "@/contrib/registerContribBlocks";
import { launchSsoFlow } from "@/store/enterprise/singleSignOn";
import { readManagedStorage } from "@/store/enterprise/managedStorage";
import { type UUID } from "@/types/stringTypes";
import { type UnresolvedModComponent } from "@/types/modComponentTypes";
import { type RegistryId } from "@/types/registryTypes";
import { type OptionsArgs } from "@/types/runtimeTypes";
import { checkDeploymentPermissions } from "@/permissions/deploymentPermissionsHelpers";
import { Events } from "@/telemetry/events";
import { allSettled } from "@/utils/promiseUtils";
import type { Manifest } from "webextension-polyfill";
import { getRequestHeadersByAPIVersion } from "@/data/service/apiVersioning";
import { fetchDeploymentModDefinitions } from "@/modDefinitions/modDefinitionRawApiCalls";
import { services } from "@/background/messenger/api";
import type { DeploymentModDefinitionPair } from "@/types/deploymentTypes";
import { isAxiosError } from "@/errors/networkErrorHelpers";

// eslint-disable-next-line local-rules/persistBackgroundData -- Static
const { reducer: optionsReducer, actions: optionsActions } = extensionsSlice;

// eslint-disable-next-line local-rules/persistBackgroundData -- Static
const { reducer: editorReducer, actions: editorActions } = editorSlice;

// eslint-disable-next-line local-rules/persistBackgroundData -- Function
const locateAllForService = locator.locateAllForService.bind(locator);

const UPDATE_INTERVAL_MS = 5 * 60 * 1000;

async function setExtensionsState(state: ModComponentState): Promise<void> {
  await saveModComponentState(state);
  await forEachTab(queueReactivateTab);
}

function uninstallExtensionFromStates(
  optionsState: ModComponentState,
  editorState: EditorState | undefined,
  extensionId: UUID,
): {
  options: ModComponentState;
  editor: EditorState;
} {
  const options = optionsReducer(
    optionsState,
    optionsActions.removeExtension({ extensionId }),
  );
  const editor = editorState
    ? editorReducer(editorState, editorActions.removeElement(extensionId))
    : undefined;
  return { options, editor };
}

async function uninstallExtensionsAndSaveState(
  toUninstall: UnresolvedModComponent[],
  {
    editorState,
    optionsState,
  }: { editorState: EditorState; optionsState: ModComponentState },
): Promise<void> {
  // Uninstall existing versions of the extensions
  for (const extension of toUninstall) {
    const result = uninstallExtensionFromStates(
      optionsState,
      editorState,
      extension.id,
    );
    optionsState = result.options;
    editorState = result.editor;
  }

  await allSettled(
    toUninstall.map(async ({ id }) => removeExtensionForEveryTab(id)),
    { catch: "ignore" },
  );

  await setExtensionsState(optionsState);
  await saveEditorState(editorState);
}

/**
 * Uninstall all deployments by uninstalling all extensions associated with a deployment.
 */
export async function uninstallAllDeployments(): Promise<void> {
  const [optionsState, editorState] = await Promise.all([
    getModComponentState(),
    getEditorState(),
  ]);
  const installed = selectExtensions({ options: optionsState });

  const toUninstall = installed.filter(
    (extension) => !isEmpty(extension._deployment),
  );

  if (toUninstall.length === 0) {
    // Short-circuit to skip reporting telemetry
    return;
  }

  await uninstallExtensionsAndSaveState(toUninstall, {
    editorState,
    optionsState,
  });

  reportEvent("DeploymentDeactivateAll", {
    auto: true,
    deployments: toUninstall.map((x) => x._deployment.id),
  });
}

async function uninstallUnmatchedDeployments(
  deployments: Deployment[],
): Promise<void> {
  const [optionsState, editorState] = await Promise.all([
    getModComponentState(),
    getEditorState(),
  ]);
  const installed = selectExtensions({ options: optionsState });

  const deploymentRecipeIds = new Set(
    deployments.map((deployment) => deployment.package.package_id),
  );

  const toUninstall = installed.filter(
    (extension) =>
      !isEmpty(extension._deployment) &&
      !deploymentRecipeIds.has(extension._recipe?.id),
  );

  if (toUninstall.length === 0) {
    // Short-circuit to skip reporting telemetry
    return;
  }

  await uninstallExtensionsAndSaveState(toUninstall, {
    editorState,
    optionsState,
  });

  reportEvent(Events.DEPLOYMENT_DEACTIVATE_UNASSIGNED, {
    auto: true,
    deployments: toUninstall.map((x) => x._deployment.id),
  });
}

async function uninstallRecipe(
  optionsState: ModComponentState,
  editorState: EditorState | undefined,
  recipeId: RegistryId,
): Promise<{
  options: ModComponentState;
  editor: EditorState | undefined;
}> {
  let options = optionsState;
  let editor = editorState;

  const recipeOptionsSelector = selectExtensionsForRecipe(recipeId);
  const recipeExtensions = recipeOptionsSelector({ options: optionsState });

  // Uninstall existing versions of the extensions
  for (const extension of recipeExtensions) {
    const result = uninstallExtensionFromStates(options, editor, extension.id);
    options = result.options;
    editor = result.editor;
  }

  return { options, editor };
}

async function installDeployment({
  optionsState,
  editorState,
  deploymentModDefinitionPair,
}: {
  optionsState: ModComponentState;
  editorState: EditorState | undefined;
  deploymentModDefinitionPair: DeploymentModDefinitionPair;
}): Promise<{
  options: ModComponentState;
  editor: EditorState | undefined;
}> {
  let options = optionsState;
  let editor = editorState;
  const { deployment, modDefinition } = deploymentModDefinitionPair;

  const isReinstall = optionsState.extensions.some(
    (x) => x._deployment?.id === deployment.id,
  );

  // Uninstall existing versions of the extensions
  const result = await uninstallRecipe(
    options,
    editor,
    deployment.package.package_id,
  );

  options = result.options;
  editor = result.editor;

  // Install the deployment's blueprint with the service definition
  options = optionsReducer(
    options,
    optionsActions.installMod({
      modDefinition,
      deployment,
      configuredDependencies: await mergeDeploymentIntegrationDependencies(
        deploymentModDefinitionPair,
        services.locateAllForId,
      ),
      // Assume backend properly validates the options
      optionsArgs: deployment.options_config as OptionsArgs,
      screen: "background",
      isReinstall,
    }),
  );

  reportEvent(Events.DEPLOYMENT_ACTIVATE, {
    deployment: deployment.id,
    auto: true,
  });

  return { options, editor };
}

/**
 * Install all deployments
 * @param deploymentModDefinitionPairs deployments that PixieBrix already has permission to run
 */
async function installDeployments(
  deploymentModDefinitionPairs: DeploymentModDefinitionPair[],
): Promise<void> {
  let [optionsState, editorState] = await Promise.all([
    getModComponentState(),
    getEditorState(),
  ]);

  for (const deploymentModDefinitionPair of deploymentModDefinitionPairs) {
    // eslint-disable-next-line no-await-in-loop -- running reducer, need to update states serially
    const result = await installDeployment({
      optionsState,
      editorState,
      deploymentModDefinitionPair,
    });
    optionsState = result.options;
    editorState = result.editor;
  }

  await setExtensionsState(optionsState);
  await saveEditorState(editorState);
}

type DeploymentConstraint = {
  deploymentModDefinitionPair: DeploymentModDefinitionPair;
  hasPermissions: boolean;
  extensionVersion: SemVer;
};

/**
 * Return true if the deployment can be automatically installed.
 *
 * For automatic install, the following must be true:
 * 1. PixieBrix already has permissions for the required pages/APIs
 * 2. The user has a version of the PixieBrix browser extension compatible with the deployment
 * 3. The user has exactly one (1) personal configuration for each unbound service for the deployment
 */
async function canAutomaticallyInstall({
  deploymentModDefinitionPair,
  hasPermissions,
  extensionVersion,
}: DeploymentConstraint): Promise<boolean> {
  if (!hasPermissions) {
    return false;
  }

  const requiredRange =
    deploymentModDefinitionPair.modDefinition.metadata.extensionVersion;
  if (requiredRange && !satisfies(extensionVersion, requiredRange)) {
    return false;
  }

  const personalConfigs =
    await findLocalDeploymentConfiguredIntegrationDependencies(
      deploymentModDefinitionPair,
      locateAllForService,
    );
  return personalConfigs.every(({ configs }) => configs.length === 1);
}

/**
 * Return the deployments that need to be installed because they have an update
 * @param deployments the deployments
 * @param restricted `true` if the user is a restricted user, e.g., as opposed to a developer
 */
async function selectUpdatedDeployments(
  deployments: Deployment[],
  { restricted }: { restricted: boolean },
): Promise<Deployment[]> {
  // Always get the freshest options slice from the local storage
  const { extensions } = await getModComponentState();
  const updatePredicate = makeUpdatedFilter(extensions, { restricted });
  return deployments.filter((deployment) => updatePredicate(deployment));
}

async function markAllAsInstalled() {
  const settings = await getSettingsState();
  const next = settingsSlice.reducer(
    settings,
    settingsSlice.actions.resetUpdatePromptTimestamp(),
  );
  await saveSettingsState(next);
}

/**
 * Sync local deployments with provisioned deployments.
 *
 * If PixieBrix does not have the permissions required to automatically activate a deployment, opens the Options page
 * so the user can click to activate the deployments.
 *
 * NOTE: if updates are snoozed, does not install updates automatically. (To not interrupt the current business
 * process the team member is working on.)
 */
export async function syncDeployments(): Promise<void> {
  expectContext("background");

  const now = Date.now();

  const [linked, { organizationId }, settings, managedStorage] =
    await Promise.all([
      isLinked(),
      readAuthData(),
      getSettingsState(),
      readManagedStorage(),
    ]);

  const {
    campaignIds = [],
    managedOrganizationId,
    ssoUrl,
    disableLoginTab,
  } = managedStorage;

  if (!linked) {
    // If the Browser extension is unlinked (it doesn't have the API key), one of the following must be true:
    // - The user has managed install, and they have not linked their extension yet
    // - The user is part of an organization, and somehow lost their token: 1) the token is no longer valid
    //   so PixieBrix cleared it out, 2) something removed the local storage entry
    // - If the user is not an enterprise user (or has not linked their extension yet), just NOP. They likely they just
    //   need to reconnect their extension. If it's a non-enterprise user, they shouldn't have any deployments
    //   installed anyway.

    if (disableLoginTab) {
      // IT manager has disabled opening login tab automatically
      return;
    }

    if (ssoUrl != null) {
      reportEvent(Events.ORGANIZATION_EXTENSION_LINK, {
        organizationId,
        managedOrganizationId,
        // Initial marks whether this is the initial background deployment install
        initial: !organizationId,
        campaignIds,
        sso: true,
      });

      void launchSsoFlow(ssoUrl);

      return;
    }

    if (managedOrganizationId != null || organizationId != null) {
      reportEvent(Events.ORGANIZATION_EXTENSION_LINK, {
        organizationId,
        managedOrganizationId,
        // Initial marks whether this is the initial background deployment install
        initial: !organizationId,
        campaignIds,
        sso: false,
      });

      await browser.runtime.openOptionsPage();

      return;
    }

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
  const { extensions } = await getModComponentState();

  // This is the "heartbeat". The old behavior was to only send if the user had at least one deployment installed.
  // Now we're always sending in order to help team admins understand any gaps between number of registered users
  // and amount of activity when using deployments
  const client = await maybeGetLinkedApiClient();
  if (client == null) {
    console.debug(
      "Skipping deployments update because the extension is not linked to the PixieBrix service",
    );
    return;
  }

  const { data: profile } = await client.get<Me>("/api/me/");

  const { isSnoozed, isUpdateOverdue, updatePromptTimestamp } =
    selectUpdatePromptState(
      { settings },
      {
        now,
        enforceUpdateMillis: profile.enforce_update_millis,
      },
    );

  // Ensure the user's flags and telemetry information is up-to-date
  void updateUserData(selectUserDataUpdate(profile));

  const { data: deployments } = await client.post<Deployment[]>(
    "/api/deployments/",
    {
      uid: await getUUID(),
      version: getExtensionVersion(),
      active: selectInstalledDeployments(extensions),
      campaignIds,
    },
    {
      // @since 1.8.10 -- API version 1.1 excludes the package config
      headers: getRequestHeadersByAPIVersion("1.1"),
    },
  );

  // Always uninstall unmatched deployments
  await uninstallUnmatchedDeployments(deployments);

  // Using the restricted-uninstall flag as a proxy for whether the user is a restricted user. The flag currently
  // corresponds to whether the user is a restricted user vs. developer
  const updatedDeployments = await selectUpdatedDeployments(deployments, {
    restricted: profile.flags.includes("restricted-uninstall"),
  });

  if (
    isSnoozed &&
    profile.enforce_update_millis &&
    updatePromptTimestamp == null &&
    (isUpdateAvailable() || updatedDeployments.length > 0)
  ) {
    // There are updates, so inform the user even though they have snoozed updates because there will be a countdown
    void browser.runtime.openOptionsPage();
    return;
  }

  if (isSnoozed && !isUpdateOverdue) {
    console.debug("Skipping deployments update because updates are snoozed");
    return;
  }

  if (
    isUpdateAvailable() &&
    // `restricted-version` is an implicit flag from the MeSerializer
    (profile.flags.includes("restricted-version") ||
      profile.enforce_update_millis)
  ) {
    console.info("Extension update available from the web store");
    // Have the user update their browser extension. (Since the new version might impact the deployment activation)
    void browser.runtime.openOptionsPage();
    return;
  }

  if (updatedDeployments.length === 0) {
    console.debug("No deployment updates found");
    return;
  }

  // Ensure the user brick definitions are up-to-date, to ensure they have the latest current permissions and
  // extensionVersion requirements for bricks.
  try {
    await refreshRegistries();
  } catch (error) {
    // Reporting goes through Datadog, so safe to report even if our server is acting up.
    reportError(error);

    if (isAxiosError(error) && error.response?.status >= 500) {
      // If our server is acting up, bail because opening the options page will cause a refetch, which will just
      // further increase server load. Try again on the next heart beat.
      return;
    }

    // Bail and open the main options page, which 1) fetches the latest bricks, and 2) will prompt the user to
    // manually install the deployments via the banner.
    void browser.runtime.openOptionsPage();
    return;
  }

  // Extracted activateDeploymentsInBackground into a separate function because code only uses deploymentModDefinitionPairs.
  await activateDeploymentsInBackground({
    // Excludes any deployments that fail to fetch. In those cases, the user will stay on the old deployment until
    // the next heartbeat/check.
    deploymentModDefinitionPairs:
      await fetchDeploymentModDefinitions(updatedDeployments),
    profile,
  });
}

/**
 * Activate deployments in the background.
 *
 * Similar to activateDeployments, which activates deployments in the foreground.
 * @see activateDeployments
 */
async function activateDeploymentsInBackground({
  deploymentModDefinitionPairs,
  profile,
}: {
  deploymentModDefinitionPairs: DeploymentModDefinitionPair[];
  profile: Me;
}): Promise<void> {
  // `clipboardWrite` is not strictly required to use the clipboard brick, so allow it to auto-install.
  // Behind a feature flag in case it causes problems for enterprise customers.
  // Could use browser.runtime.getManifest().optional_permissions here, but that also technically supports the Origin
  // type so the types wouldn't match with checkDeploymentPermissions
  const optionalPermissions: Manifest.OptionalPermission[] =
    profile.flags.includes("deployment-permissions-strict")
      ? []
      : ["clipboardWrite"];

  const deploymentRequirements = await Promise.all(
    deploymentModDefinitionPairs.map(async (deploymentModDefinitionPair) => ({
      deploymentModDefinitionPair,
      ...(await checkDeploymentPermissions({
        deploymentModDefinitionPair,
        locate: locateAllForService,
        optionalPermissions,
      })),
    })),
  );

  // Version to report to the server.
  const { version: extensionVersionString } = browser.runtime.getManifest();
  const extensionVersion = parseSemVer(extensionVersionString);

  const installability = await Promise.all(
    deploymentRequirements.map(
      async ({ deploymentModDefinitionPair, hasPermissions }) => ({
        deploymentModDefinitionPair,
        isAutomatic: await canAutomaticallyInstall({
          deploymentModDefinitionPair,
          hasPermissions,
          extensionVersion,
        }),
      }),
    ),
  );

  const [automatic, manual] = partition(installability, (x) => x.isAutomatic);

  let automaticError: boolean;

  if (automatic.length > 0) {
    try {
      await installDeployments(
        automatic.map((x) => x.deploymentModDefinitionPair),
      );
    } catch (error) {
      reportError(error);
      automaticError = true;
    }
  }

  if (manual.length === 0) {
    void markAllAsInstalled();
  }

  // We only want to call openOptionsPage a single time
  if (manual.length > 0 || automaticError) {
    void browser.runtime.openOptionsPage();
  }
}

/**
 * Reset the update countdown timer on startup.
 *
 * - If there was a Browser Extension update, it would have been applied
 * - We don't currently separately track timestamps for showing an update modal for deployments vs. browser extension
 * upgrades. However, in enterprise scenarios where enforceUpdateMillis is set, the IT policy is generally such
 * that IT can't reset the extension.
 */
async function resetUpdatePromptTimestamp() {
  // There could be a race here, but unlikely because this is run on startup
  console.debug("Resetting updatePromptTimestamp");
  const settings = await getSettingsState();
  await saveSettingsState({
    ...settings,
    updatePromptTimestamp: null,
  });
}

function initDeploymentUpdater(): void {
  // Need to load the built-in bricks for permissions checks to work on initial startup
  registerBuiltinBricks();
  registerContribBlocks();

  setInterval(syncDeployments, UPDATE_INTERVAL_MS);
  void resetUpdatePromptTimestamp();
  void syncDeployments();
}

export default initDeploymentUpdater;
