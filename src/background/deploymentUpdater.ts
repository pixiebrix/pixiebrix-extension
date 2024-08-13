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

import { type Deployment } from "@/types/contract";
import { isEmpty } from "lodash";
import reportError from "@/telemetry/reportError";
import { getUUID } from "@/telemetry/telemetryHelpers";
import { isLinked, readAuthData, updateUserData } from "@/auth/authStorage";
import reportEvent from "@/telemetry/reportEvent";
import { refreshRegistries } from "@/hooks/useRefreshRegistries";
import {
  selectActivatedModComponents,
  selectModComponentsForMod,
} from "@/store/modComponents/modComponentSelectors";
import { maybeGetLinkedApiClient } from "@/data/service/apiClient";
import {
  queueReloadModEveryTab,
  reloadModsEveryTab,
} from "@/contentScript/messenger/api";
import { getExtensionVersion } from "@/utils/extensionUtils";
import { parse as parseSemVer, satisfies, type SemVer } from "semver";
import { type ModComponentState } from "@/store/modComponents/modComponentTypes";
import modComponentSlice from "@/store/modComponents/modComponentSlice";
import {
  getModComponentState,
  saveModComponentState,
} from "@/store/modComponents/modComponentStorage";
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
import { getEditorState, saveEditorState } from "@/store/editorStorage";
import { type EditorState } from "@/pageEditor/store/editor/pageEditorTypes";
import { editorSlice } from "@/pageEditor/store/editor/editorSlice";
import { removeModComponentForEveryTab } from "@/background/removeModComponentForEveryTab";
import registerBuiltinBricks from "@/bricks/registerBuiltinBricks";
import registerContribBricks from "@/contrib/registerContribBricks";
import { launchSsoFlow } from "@/store/enterprise/singleSignOn";
import { readManagedStorage } from "@/store/enterprise/managedStorage";
import { type UUID } from "@/types/stringTypes";
import { type SerializedModComponent } from "@/types/modComponentTypes";
import { type RegistryId } from "@/types/registryTypes";
import { type OptionsArgs } from "@/types/runtimeTypes";
import { checkDeploymentPermissions } from "@/permissions/deploymentPermissionsHelpers";
import { Events } from "@/telemetry/events";
import { allSettled } from "@/utils/promiseUtils";
import type { Manifest } from "webextension-polyfill";
import { getRequestHeadersByAPIVersion } from "@/data/service/apiVersioning";
import { fetchDeploymentModDefinitions } from "@/modDefinitions/modDefinitionRawApiCalls";
import { integrationConfigLocator } from "@/background/messenger/api";
import type { ActivatableDeployment } from "@/types/deploymentTypes";
import { isAxiosError } from "@/errors/networkErrorHelpers";
import type { components } from "@/types/swagger";
import { transformMeResponse } from "@/data/model/Me";
import { getMe } from "@/data/service/backgroundApi";
import { flagOn } from "@/auth/featureFlagStorage";
import { SessionValue } from "@/mv3/SessionStorage";

// eslint-disable-next-line local-rules/persistBackgroundData -- Static
const { reducer: optionsReducer, actions: optionsActions } = modComponentSlice;

// eslint-disable-next-line local-rules/persistBackgroundData -- Static
const { reducer: editorReducer, actions: editorActions } = editorSlice;

// eslint-disable-next-line local-rules/persistBackgroundData -- Function
const findAllSanitizedIntegrationConfigs =
  integrationConfigLocator.findAllSanitizedConfigsForIntegration.bind(
    integrationConfigLocator,
  );

/**
 * Heartbeat frequency for reporting/checking deployments from the server.
 */
const UPDATE_INTERVAL_MS = 5 * 60 * 1000;

/**
 * Session variable indicating whether the deployments have been fetched from the server yet on extension startup.
 *
 * See https://github.com/pixiebrix/pixiebrix-extension/issues/8753 for customer context
 *
 * @since 2.0.5
 */
// Exported for testing
export const startupDeploymentUpdateLoaded = new SessionValue<boolean | null>(
  "startupDeploymentUpdateLoaded",
  import.meta.url,
);

type ReloadOptions = {
  /**
   * When to reload mods on existing tabs/frames
   * @since 2.0.5
   */
  reloadMode: "queue" | "immediate";
};

async function saveModComponentStateAndReloadTabs(
  state: ModComponentState,
  { reloadMode }: ReloadOptions,
): Promise<void> {
  await saveModComponentState(state);

  if (reloadMode === "immediate") {
    reloadModsEveryTab();
  } else {
    queueReloadModEveryTab();
  }
}

function deactivateModComponentFromStates(
  modComponentId: UUID,
  optionsState: ModComponentState,
  editorState: EditorState | undefined,
): { options: ModComponentState; editor: EditorState | undefined } {
  const options = optionsReducer(
    optionsState,
    optionsActions.removeModComponent({ modComponentId }),
  );
  const editor = editorState
    ? editorReducer(
        editorState,
        editorActions.removeModComponentFormState(modComponentId),
      )
    : undefined;
  return { options, editor };
}

async function deactivateModComponentsAndSaveState(
  modComponentsToDeactivate: SerializedModComponent[],
  {
    editorState,
    optionsState,
  }: { editorState: EditorState | undefined; optionsState: ModComponentState },
): Promise<void> {
  // Deactivate existing mod components
  for (const modComponent of modComponentsToDeactivate) {
    const result = deactivateModComponentFromStates(
      modComponent.id,
      optionsState,
      editorState,
    );
    optionsState = result.options;
    editorState = result.editor;
  }

  await allSettled(
    modComponentsToDeactivate.map(async ({ id }) =>
      removeModComponentForEveryTab(id),
    ),
    { catch: "ignore" },
  );

  await saveModComponentStateAndReloadTabs(optionsState, {
    // Always queue deactivation to not interfere with running mods
    reloadMode: "queue",
  });
  await saveEditorState(editorState);
}

/**
 * Deactivate all deployed mods by deactivating all mod components associated with a deployment
 */
export async function deactivateAllDeployedMods(): Promise<void> {
  const [optionsState, editorState] = await Promise.all([
    getModComponentState(),
    getEditorState(),
  ]);
  const activatedModComponents = selectActivatedModComponents({
    options: optionsState,
  });

  const modComponentsToDeactivate = activatedModComponents.filter(
    (activatedModComponent) => !isEmpty(activatedModComponent._deployment),
  );

  if (modComponentsToDeactivate.length === 0) {
    // Short-circuit to skip reporting telemetry
    return;
  }

  await deactivateModComponentsAndSaveState(modComponentsToDeactivate, {
    editorState,
    optionsState,
  });

  reportEvent(Events.DEPLOYMENT_DEACTIVATE_ALL, {
    auto: true,
    deployments: modComponentsToDeactivate
      .map((x) => x._deployment?.id)
      .filter((x) => x != null),
  });
}

async function deactivateUnassignedDeployments(
  assignedDeployments: Deployment[],
): Promise<void> {
  const [optionsState, editorState] = await Promise.all([
    getModComponentState(),
    getEditorState(),
  ]);
  const activatedModComponents = selectActivatedModComponents({
    options: optionsState,
  });

  const deployedModIds = new Set(
    assignedDeployments.map((deployment) => deployment.package.package_id),
  );

  const unassignedModComponents = activatedModComponents.filter(
    (activatedModComponent) =>
      !isEmpty(activatedModComponent._deployment) &&
      activatedModComponent._recipe?.id &&
      !deployedModIds.has(activatedModComponent._recipe.id),
  );

  if (unassignedModComponents.length === 0) {
    // Short-circuit to skip reporting telemetry
    return;
  }

  await deactivateModComponentsAndSaveState(unassignedModComponents, {
    editorState,
    optionsState,
  });

  reportEvent(Events.DEPLOYMENT_DEACTIVATE_UNASSIGNED, {
    auto: true,
    deployments: unassignedModComponents
      .map((x) => x._deployment?.id)
      .filter((x) => x != null),
  });
}

async function deactivateMod(
  modId: RegistryId,
  optionsState: ModComponentState,
  editorState: EditorState | undefined,
): Promise<{
  options: ModComponentState;
  editor: EditorState | undefined;
}> {
  let _optionsState = optionsState;
  let _editorState = editorState;

  const modComponentsForModSelector = selectModComponentsForMod(modId);
  const activatedModComponentsForMod = modComponentsForModSelector({
    options: optionsState,
  });

  for (const activatedModComponent of activatedModComponentsForMod) {
    const result = deactivateModComponentFromStates(
      activatedModComponent.id,
      _optionsState,
      _editorState,
    );
    _optionsState = result.options;
    _editorState = result.editor;
  }

  return { options: _optionsState, editor: _editorState };
}

async function activateDeployment({
  optionsState,
  editorState,
  activatableDeployment,
}: {
  optionsState: ModComponentState;
  editorState: EditorState | undefined;
  activatableDeployment: ActivatableDeployment;
}): Promise<{
  options: ModComponentState;
  editor: EditorState | undefined;
}> {
  let _optionsState = optionsState;
  let _editorState = editorState;
  const { deployment, modDefinition } = activatableDeployment;

  const isAlreadyActivated = optionsState.extensions.some(
    (activatedModComponent) =>
      activatedModComponent._deployment?.id === deployment.id,
  );

  // Deactivate existing mod component versions
  const result = await deactivateMod(
    deployment.package.package_id,
    _optionsState,
    _editorState,
  );

  _optionsState = result.options;
  _editorState = result.editor;

  // Activate the deployed mod with the service definition
  _optionsState = optionsReducer(
    _optionsState,
    optionsActions.activateMod({
      modDefinition,
      deployment,
      configuredDependencies: await mergeDeploymentIntegrationDependencies(
        activatableDeployment,
        integrationConfigLocator.findAllSanitizedConfigsForIntegration,
      ),
      // Assume backend properly validates the options
      optionsArgs: deployment.options_config as OptionsArgs,
      screen: "background",
      isReactivate: isAlreadyActivated,
    }),
  );

  reportEvent(Events.DEPLOYMENT_ACTIVATE, {
    deployment: deployment.id,
    auto: true,
  });

  return { options: _optionsState, editor: _editorState };
}

/**
 * Activate a list of deployments
 * @param activatableDeployments deployments that PixieBrix already has permission to run
 * @param options options for reloading mods on existing tabs
 */
async function activateDeployments(
  activatableDeployments: ActivatableDeployment[],
  options: ReloadOptions,
): Promise<void> {
  let [optionsState, editorState] = await Promise.all([
    getModComponentState(),
    getEditorState(),
  ]);

  for (const activatableDeployment of activatableDeployments) {
    // eslint-disable-next-line no-await-in-loop -- running reducer, need to update states serially
    const result = await activateDeployment({
      optionsState,
      editorState,
      activatableDeployment,
    });
    optionsState = result.options;
    editorState = result.editor;
  }

  await saveModComponentStateAndReloadTabs(optionsState, options);
  await saveEditorState(editorState);
}

type DeploymentConstraint = {
  activatableDeployment: ActivatableDeployment;
  hasPermissions: boolean;
  extensionVersion: SemVer | null;
};

/**
 * Return true if the deployment can be automatically activated.
 *
 * For automatic activation, the following must be true:
 * 1. PixieBrix already has permissions for the required pages/APIs
 * 2. The user has a version of the PixieBrix Extension compatible with the deployment
 * 3. The user has exactly one (1) personal configuration for each unbound service for the deployment
 */
async function canAutoActivate({
  activatableDeployment,
  hasPermissions,
  extensionVersion,
}: DeploymentConstraint): Promise<boolean> {
  if (!hasPermissions || extensionVersion == null) {
    return false;
  }

  const requiredRange =
    activatableDeployment.modDefinition.metadata.extensionVersion;
  if (requiredRange && !satisfies(extensionVersion, requiredRange)) {
    return false;
  }

  const personalConfigs =
    await findLocalDeploymentConfiguredIntegrationDependencies(
      activatableDeployment,
      findAllSanitizedIntegrationConfigs,
    );
  return personalConfigs.every(({ configs }) => configs.length === 1);
}

/**
 * Return the deployments that need to be activated because they have an update
 * @param deployments the deployments to filter
 * @param restricted `true` if the user is a restricted user, e.g., as opposed to a developer
 */
async function selectUpdatedDeployments(
  deployments: Deployment[],
  { restricted }: { restricted: boolean },
): Promise<Deployment[]> {
  // Always get the freshest options slice from the local storage
  const { extensions: activatedModComponents } = await getModComponentState();
  const updatePredicate = makeUpdatedFilter(activatedModComponents, {
    restricted,
  });
  return deployments.filter((deployment) => updatePredicate(deployment));
}

/**
 * Sync activated deployments with assigned deployments.
 *
 * If PixieBrix does not have the permissions required to automatically activate a deployment, open the Options page
 * so the user can click to activate the deployments.
 *
 * NOTE: if updates are snoozed, does not activate updated deployments automatically. (To not interrupt the current business
 * process the team member is working on.)
 *
 * WARNING: Partially duplicated code with DeploymentsProvider
 * @see DeploymentsProvider
 */
export async function syncDeployments(): Promise<void> {
  expectContext("background");

  const now = Date.now();

  const [
    linked,
    { organizationId },
    settings,
    managedStorage,
    shouldReportDeployments,
  ] = await Promise.all([
    isLinked(),
    readAuthData(),
    getSettingsState(),
    readManagedStorage(),
    flagOn("report-background-deployments"),
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
    //   activated anyway.

    if (disableLoginTab) {
      // IT manager has disabled opening login tab automatically
      return;
    }

    if (ssoUrl != null) {
      reportEvent(Events.ORGANIZATION_EXTENSION_LINK, {
        organizationId,
        managedOrganizationId,
        // Initial marks whether this is the initial background deployment activation
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
        // Initial marks whether this is the initial background deployment activation
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
    await deactivateAllDeployedMods();
    return;
  }

  // Always get the freshest options slice from the local storage
  const { extensions: activatedModComponents } = await getModComponentState();

  // This is the "heartbeat". The old behavior was to only send if the user had at least one deployment activated.
  // Now we're always sending in order to help team admins understand any gaps between number of registered users
  // and amount of activity when using deployments
  const client = await maybeGetLinkedApiClient();
  if (client == null) {
    console.debug(
      "Skipping deployments update because the extension is not linked to the PixieBrix service",
    );
    return;
  }

  // In the case of errors, getMe() will throw, so we don't need to explicitly check the status
  const meApiResponse = await getMe();
  const meData = transformMeResponse(meApiResponse);

  const { isSnoozed, isUpdateOverdue, updatePromptTimestamp, timeRemaining } =
    selectUpdatePromptState(
      { settings },
      {
        now,
        enforceUpdateMillis: meData.enforceUpdateMillis,
      },
    );

  if (shouldReportDeployments) {
    reportEvent(Events.DEPLOYMENT_SYNC, {
      isSnoozed,
      isUpdateOverdue,
      updatePromptTimestamp,
      timeRemaining,
    });
  }

  // Ensure the user's flags and telemetry information is up-to-date
  void updateUserData(selectUserDataUpdate(meData));

  const { data: deployments } = await client.post<Deployment[]>(
    "/api/deployments/",
    {
      uid: await getUUID(),
      version: getExtensionVersion(),
      active: selectInstalledDeployments(activatedModComponents),
      campaignIds,
    },
    {
      // @since 1.8.10 -- API version 1.1 excludes the package config
      headers: getRequestHeadersByAPIVersion("1.1"),
    },
  );

  const isInitialDeploymentUpdate =
    !(await startupDeploymentUpdateLoaded.get());
  // Only set if POST /api/deployments/ is successful
  await startupDeploymentUpdateLoaded.set(true);

  if (shouldReportDeployments) {
    reportEvent(Events.DEPLOYMENT_LIST, {
      deployments: deployments.map((deployment) => deployment.id),
    });
  }

  // Always deactivate unassigned deployments
  await deactivateUnassignedDeployments(deployments);

  // Using the restricted-uninstall flag as a proxy for whether the user is a restricted user. The flag currently
  // corresponds to whether the user is a restricted user vs. developer
  const updatedDeployments = await selectUpdatedDeployments(deployments, {
    restricted: meApiResponse.flags?.includes("restricted-uninstall") ?? false,
  });

  if (shouldReportDeployments) {
    reportEvent(Events.DEPLOYMENT_UPDATE_LIST, {
      deployments: updatedDeployments.map((deployment) => deployment.id),
    });
  }

  if (
    isSnoozed &&
    meData.enforceUpdateMillis &&
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
    (meApiResponse.flags?.includes("restricted-version") ||
      meData.enforceUpdateMillis)
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

    if (isAxiosError(error) && Number(error.response?.status) >= 500) {
      // If our server is acting up, bail because opening the options page will cause a refetch, which will just
      // further increase server load. Try again on the next heart beat.
      return;
    }

    // Bail and open the main options page, which 1) fetches the latest bricks, and 2) will prompt the user to
    // manually activate the deployments via the banner.
    void browser.runtime.openOptionsPage();
    return;
  }

  // Extracted activateDeploymentsInBackground into a separate function because code only uses activatableDeployments
  await activateDeploymentsInBackground({
    // Excludes any deployments that fail to fetch. In those cases, the user will stay on the old deployment until
    // the next heartbeat/check.
    activatableDeployments:
      await fetchDeploymentModDefinitions(updatedDeployments),
    meApiResponse,
    options: { reloadMode: isInitialDeploymentUpdate ? "immediate" : "queue" },
  });
}

/**
 * Activate deployments in the background.
 *
 * Similar to activateDeployments, which activates deployments in the foreground.
 * @see activateDeployments
 */
async function activateDeploymentsInBackground({
  activatableDeployments,
  meApiResponse,
  options,
}: {
  activatableDeployments: ActivatableDeployment[];
  meApiResponse: components["schemas"]["Me"];
  options: ReloadOptions;
}): Promise<void> {
  // `clipboardWrite` is not strictly required to use the clipboard brick, so allow it to auto-activate.
  // Behind a feature flag in case it causes problems for enterprise customers.
  // Could use browser.runtime.getManifest().optional_permissions here, but that also technically supports the Origin
  // type so the types wouldn't match with checkDeploymentPermissions
  const optionalPermissions: Manifest.OptionalPermission[] =
    meApiResponse.flags?.includes("deployment-permissions-strict")
      ? []
      : ["clipboardWrite"];

  const deploymentRequirements = await Promise.all(
    activatableDeployments.map(async (activatableDeployment) => ({
      activatableDeployment,
      ...(await checkDeploymentPermissions({
        activatableDeployment,
        locate: findAllSanitizedIntegrationConfigs,
        optionalPermissions,
      })),
    })),
  );

  // Version to report to the server.
  const extensionVersionString = getExtensionVersion();
  const extensionVersion = parseSemVer(extensionVersionString);

  const deploymentsByActivationMethod = await Promise.all(
    deploymentRequirements.map(
      async ({ activatableDeployment, hasPermissions }) => ({
        activatableDeployment,
        autoActivate: await canAutoActivate({
          activatableDeployment,
          hasPermissions,
          extensionVersion,
        }),
      }),
    ),
  );

  const deploymentsToAutoActivate = deploymentsByActivationMethod
    .filter(({ autoActivate }) => autoActivate)
    .map(({ activatableDeployment }) => activatableDeployment);

  const deploymentsToManuallyActivate = deploymentsByActivationMethod
    .filter(({ autoActivate }) => !autoActivate)
    .map(({ activatableDeployment }) => activatableDeployment);

  let autoActivationError: boolean | undefined;

  if (deploymentsToAutoActivate.length > 0) {
    try {
      await activateDeployments(deploymentsToAutoActivate, options);
    } catch (error) {
      reportError(error);
      autoActivationError = true;
    }
  }

  if (deploymentsToManuallyActivate.length === 0) {
    void hideUpdatePromptUntilNextAvailableUpdate();
  }

  // We only want to call openOptionsPage a single time
  if (deploymentsToManuallyActivate.length > 0 || autoActivationError) {
    void browser.runtime.openOptionsPage();
  }
}

/**
 * There is a prompt in the UI shown to the user to encourage them to manually activate and/or update deployments,
 * partially controlled by updatePromptTimestamp. Set updatePromptTimestamp to null to hide the modal until
 * deployment updates are next available.
 *
 * - If there was a Browser Extension update, it would have been applied
 * - We don't currently separately track timestamps for showing an update modal for deployments vs. browser extension
 * upgrades. However, in enterprise scenarios where enforceUpdateMillis is set, the IT policy is generally such
 * that IT can't reset the extension.
 *
 * @see DeploymentModal
 */
async function hideUpdatePromptUntilNextAvailableUpdate() {
  const settings = await getSettingsState();
  const next = settingsSlice.reducer(
    settings,
    settingsSlice.actions.resetUpdatePromptTimestamp(),
  );
  await saveSettingsState(next);
}

function initDeploymentUpdater(): void {
  // Need to load the built-in bricks for permissions checks to work on initial startup
  registerBuiltinBricks();
  registerContribBricks();

  setInterval(syncDeployments, UPDATE_INTERVAL_MS);
  void hideUpdatePromptUntilNextAvailableUpdate();
  void syncDeployments();
}

export default initDeploymentUpdater;
