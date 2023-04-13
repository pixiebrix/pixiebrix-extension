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
import { loadOptions, saveOptions } from "@/store/extensionsStorage";
import { type RecipeDefinition } from "@/types/recipeTypes";
import { forEachTab } from "@/background/activeTab";
import { queueReactivateTab } from "@/contentScript/messenger/api";
import { type ExtensionOptionsState } from "@/store/extensionsTypes";
import reportError from "@/telemetry/reportError";
import { debounce, uniq } from "lodash";
import { refreshRegistries } from "./refreshRegistries";
import { memoizeUntilSettled } from "@/utils";
import { type SanitizedAuth } from "@/types/contract";
import { getSharingType } from "@/hooks/auth";
import { getRequiredServiceIds } from "@/utils/recipeUtils";
import { type RegistryId } from "@/types/registryTypes";
import { type UUID } from "@/types/stringTypes";

const { reducer, actions } = extensionsSlice;

const PLAYGROUND_URL = "https://www.pixiebrix.com/playground";
const BLUEPRINT_INSTALLATION_DEBOUNCE_MS = 10_000;
const BLUEPRINT_INSTALLATION_MAX_MS = 60_000;

export async function getBuiltInServiceAuths(): Promise<SanitizedAuth[]> {
  const client = await maybeGetLinkedApiClient();
  if (client == null) {
    throw new Error(
      "getBuiltInServiceAuths was called, but the extension is not linked to a PixieBrix service."
    );
  }

  try {
    const { data: serviceAuths } = await client.get<SanitizedAuth[]>(
      "/api/services/shared/?meta=1"
    );

    return serviceAuths.filter((auth) => getSharingType(auth) === "built-in");
  } catch (error) {
    reportError(error);
    return [];
  }
}

export function getAllRequiredServiceIds(
  blueprints: RecipeDefinition[]
): RegistryId[] {
  const requiredServiceIds = blueprints.flatMap((blueprint) =>
    getRequiredServiceIds(blueprint)
  );
  return uniq(requiredServiceIds);
}

export async function getBuiltInAuthsByRequiredServiceIds(
  serviceIds: RegistryId[]
): Promise<Record<RegistryId, UUID>> {
  const builtInServiceAuths = await getBuiltInServiceAuths();

  return Object.fromEntries(
    serviceIds.map((serviceId) => {
      const builtInAuth = builtInServiceAuths.find(
        (auth) => auth.service.config.metadata.id === serviceId
      );

      if (!builtInAuth) {
        throw new Error(
          `No built-in auth found for service ${serviceId}. Check that starter mods have built-in configuration options for all required services.`
        );
      }

      return [serviceId, builtInAuth.id];
    })
  );
}

function installBlueprint(
  state: ExtensionOptionsState,
  blueprint: RecipeDefinition,
  services: Record<RegistryId, UUID>
): ExtensionOptionsState {
  return reducer(
    state,
    actions.installRecipe({
      recipe: blueprint,
      extensionPoints: blueprint.extensionPoints,
      services,
    })
  );
}

async function installBlueprints(
  blueprints: RecipeDefinition[]
): Promise<boolean> {
  let installed = false;
  if (blueprints.length === 0) {
    return installed;
  }

  const requiredServiceIds = getAllRequiredServiceIds(blueprints);
  const builtInServiceAuths = await getBuiltInAuthsByRequiredServiceIds(
    requiredServiceIds
  );

  let extensionsState = await loadOptions();
  for (const blueprint of blueprints) {
    const blueprintAlreadyInstalled = extensionsState.extensions.some(
      (extension) => extension._recipe?.id === blueprint.metadata.id
    );

    if (!blueprintAlreadyInstalled) {
      extensionsState = installBlueprint(
        extensionsState,
        blueprint,
        builtInServiceAuths
      );
      installed = true;
    }
  }

  await saveOptions(extensionsState);
  await forEachTab(queueReactivateTab);
  return installed;
}

async function getStarterBlueprints(): Promise<RecipeDefinition[]> {
  const client = await maybeGetLinkedApiClient();
  if (client == null) {
    console.debug(
      "Skipping starter blueprint installation because the extension is not linked to the PixieBrix service"
    );
    return [];
  }

  try {
    const { data: starterBlueprints } = await client.get<RecipeDefinition[]>(
      "/api/onboarding/starter-blueprints/",
      { params: { ignore_user_state: true } }
    );
    return starterBlueprints;
  } catch (error) {
    reportError(error);
    return [];
  }
}

/**
 * Installs starter blueprints and refreshes local registries from remote.
 * @returns true if any of the starter blueprints were installed
 */
const _installStarterBlueprints = async (): Promise<boolean> => {
  const starterBlueprints = await getStarterBlueprints();

  try {
    // Installing Starter Blueprints and pulling the updates from remote registries to make sure
    // that all the bricks used in starter blueprints are available
    const [installed] = await Promise.all([
      installBlueprints(starterBlueprints),
      refreshRegistries(),
    ]);

    return installed;
  } catch (error) {
    reportError(error);
    return false;
  }
};

export const debouncedInstallStarterBlueprints = debounce(
  memoizeUntilSettled(_installStarterBlueprints),
  BLUEPRINT_INSTALLATION_DEBOUNCE_MS,
  {
    leading: true,
    trailing: false,
    maxWait: BLUEPRINT_INSTALLATION_MAX_MS,
  }
);

function initStarterBlueprints(): void {
  browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (tab?.url?.startsWith(PLAYGROUND_URL)) {
      void debouncedInstallStarterBlueprints();
    }
  });
}

export default initStarterBlueprints;
