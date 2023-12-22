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

import extensionsSlice from "@/store/extensionsSlice";
import { maybeGetLinkedApiClient } from "@/services/apiClient";
import {
  getModComponentState,
  saveModComponentState,
} from "@/store/extensionsStorage";
import { type ModDefinition } from "@/types/modDefinitionTypes";
import { forEachTab } from "@/utils/extensionUtils";
import { queueReactivateTab } from "@/contentScript/messenger/api";
import { type ModComponentState } from "@/store/extensionsTypes";
import reportError from "@/telemetry/reportError";
import { debounce } from "lodash";
import { refreshRegistries } from "./refreshRegistries";
import { type RemoteIntegrationConfig } from "@/types/contract";
import { getSharingType } from "@/hooks/auth";
import { memoizeUntilSettled } from "@/utils/promiseUtils";
import { type IntegrationDependency } from "@/integrations/integrationTypes";
import getUnconfiguredComponentIntegrations from "@/integrations/util/getUnconfiguredComponentIntegrations";

// eslint-disable-next-line local-rules/noBackgroundModuleVariables -- no state; destructuring reduce and actions
const { reducer, actions } = extensionsSlice;

const PLAYGROUND_URL = "https://www.pixiebrix.com/welcome";
const MOD_INSTALLATION_DEBOUNCE_MS = 10_000;
const MOD_INSTALLATION_MAX_MS = 60_000;

export async function getBuiltInIntegrationConfigs(): Promise<
  RemoteIntegrationConfig[]
> {
  const client = await maybeGetLinkedApiClient();
  if (client == null) {
    return [];
  }

  try {
    const { data: integrationConfigs } = await client.get<
      RemoteIntegrationConfig[]
    >("/api/services/shared/?meta=1");

    return integrationConfigs.filter(
      (auth) => getSharingType(auth) === "built-in",
    );
  } catch (error) {
    reportError(error);
    return [];
  }
}

function installModInOptionsState(
  state: ModComponentState,
  modDefinition: ModDefinition,
  configuredDependencies: IntegrationDependency[],
): ModComponentState {
  return reducer(
    state,
    actions.installMod({
      modDefinition,
      configuredDependencies,
      screen: "starterMod",
      isReinstall: false,
    }),
  );
}

async function installMods(modDefinitions: ModDefinition[]): Promise<boolean> {
  let installed = false;
  if (modDefinitions.length === 0) {
    return installed;
  }

  const unconfiguredIntegrationDependencies =
    getUnconfiguredComponentIntegrations({
      extensionPoints: modDefinitions.flatMap((mod) => mod.extensionPoints),
    });

  const builtInIntegrationConfigs = await getBuiltInIntegrationConfigs();

  const builtInDependencies = unconfiguredIntegrationDependencies.map(
    (unconfiguredDependency) => {
      const builtInConfig = builtInIntegrationConfigs.find(
        (config) =>
          config.service.config.metadata.id ===
          unconfiguredDependency.integrationId,
      );

      if (!builtInConfig && !unconfiguredDependency.isOptional) {
        throw new Error(
          `No built-in config found for integration ${unconfiguredDependency.integrationId}. Check that starter mods have built-in configuration options for all required integrations.`,
        );
      }

      return {
        ...unconfiguredDependency,
        configId: builtInConfig?.id,
      };
    },
  );
  let optionsState = await getModComponentState();

  for (const modDefinition of modDefinitions) {
    const modAlreadyInstalled = optionsState.extensions.some(
      (mod) => mod._recipe?.id === modDefinition.metadata.id,
    );

    if (!modAlreadyInstalled) {
      optionsState = installModInOptionsState(
        optionsState,
        modDefinition,
        builtInDependencies,
      );
      installed = true;
    }
  }

  await saveModComponentState(optionsState);
  await forEachTab(queueReactivateTab);
  return installed;
}

async function getStarterMods(): Promise<ModDefinition[]> {
  const client = await maybeGetLinkedApiClient();
  if (client == null) {
    console.debug(
      "Skipping starter mod installation because the mod is not linked to the PixieBrix service",
    );
    return [];
  }

  try {
    const { data: starterMods } = await client.get<ModDefinition[]>(
      "/api/onboarding/starter-blueprints/",
      { params: { ignore_user_state: true } },
    );
    return starterMods;
  } catch (error) {
    reportError(error);
    return [];
  }
}

/**
 * Installs starter mods and refreshes local registries from remote.
 * @returns true if any of the starter mods were installed
 */
async function _installStarterMods(): Promise<boolean> {
  const starterMods = await getStarterMods();

  try {
    // Installing Starter Mods and pulling the updates from remote registries to make sure
    // that all the bricks used in starter mods are available
    const [installed] = await Promise.all([
      installMods(starterMods),
      refreshRegistries(),
    ]);

    return installed;
  } catch (error) {
    reportError(error);
    return false;
  }
}

export const debouncedInstallStarterMods = debounce(
  memoizeUntilSettled(_installStarterMods),
  MOD_INSTALLATION_DEBOUNCE_MS,
  {
    leading: true,
    trailing: false,
    maxWait: MOD_INSTALLATION_MAX_MS,
  },
);

function initStarterMods(): void {
  browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (tab?.url?.startsWith(PLAYGROUND_URL)) {
      void debouncedInstallStarterMods();
    }
  });
}

export default initStarterMods;
