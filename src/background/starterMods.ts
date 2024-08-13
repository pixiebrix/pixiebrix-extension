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

import modComponentSlice from "@/store/modComponents/modComponentSlice";
import sidebarSlice from "@/store/sidebar/sidebarSlice";
import {
  getLinkedApiClient,
  maybeGetLinkedApiClient,
} from "@/data/service/apiClient";
import {
  getModComponentState,
  saveModComponentState,
} from "@/store/modComponents/modComponentStorage";
import { type ModDefinition } from "@/types/modDefinitionTypes";
import { reloadModsEveryTab } from "@/contentScript/messenger/api";
import { type ModComponentState } from "@/store/modComponents/modComponentTypes";
import reportError from "@/telemetry/reportError";
import { debounce } from "lodash";
import { refreshRegistries } from "./refreshRegistries";
import type { Database } from "@/types/contract";
import { memoizeUntilSettled } from "@/utils/promiseUtils";
import { type IntegrationDependency } from "@/integrations/integrationTypes";
import getUnconfiguredComponentIntegrations from "@/integrations/util/getUnconfiguredComponentIntegrations";
import {
  getSidebarState,
  saveSidebarState,
} from "@/store/sidebar/sidebarStorage";
import {
  getAllModComponentDefinitionsWithType,
  getModComponentIdsForModComponentDefinitions,
} from "@/starterBricks/starterBrickModUtils";
import { selectModComponentsForMod } from "@/store/modComponents/modComponentSelectors";
import { type SidebarState } from "@/types/sidebarTypes";
import { getEventKeyForPanel } from "@/store/sidebar/eventKeyUtils";
import { type UUID } from "@/types/stringTypes";
import {
  PIXIEBRIX_INTEGRATION_ID,
  PIXIEBRIX_INTEGRATION_CONFIG_ID,
} from "@/integrations/constants";
import {
  autoCreateDatabaseOptionsArgsInPlace,
  makeDatabasePreviewName,
} from "@/activation/modOptionsHelpers";
import type { OptionsArgs } from "@/types/runtimeTypes";
import { isDatabasePreviewField } from "@/components/fields/schemaFields/fieldTypeCheckers";
import { isRequired } from "@/utils/schemaUtils";
import type { Schema } from "@/types/schemaTypes";
import { getBuiltInIntegrationConfigs } from "@/background/getBuiltInIntegrationConfigs";
import { StarterBrickTypes } from "@/types/starterBrickTypes";

// eslint-disable-next-line local-rules/persistBackgroundData -- no state; destructuring reducer and actions
const { reducer: extensionsReducer, actions: extensionsActions } =
  modComponentSlice;
// eslint-disable-next-line local-rules/persistBackgroundData -- no state; destructuring reduce and actions
const { reducer: sidebarReducer, actions: sidebarActions } = sidebarSlice;

const PLAYGROUND_URL = "https://www.pixiebrix.com/welcome";
const MOD_ACTIVATION_DEBOUNCE_MS = 10_000;
const MOD_ACTIVATION_MAX_MS = 60_000;

function activateModInOptionsState(
  state: ModComponentState,
  {
    modDefinition,
    configuredDependencies,
    optionsArgs,
  }: {
    modDefinition: ModDefinition;
    configuredDependencies: IntegrationDependency[];
    optionsArgs: OptionsArgs;
  },
): ModComponentState {
  return extensionsReducer(
    state,
    extensionsActions.activateMod({
      modDefinition,
      optionsArgs,
      configuredDependencies,
      screen: "starterMod",
      isReactivate: false,
    }),
  );
}

function closeSidebarTab(
  state: SidebarState,
  modComponentId: UUID,
): SidebarState {
  return sidebarReducer(
    state,
    sidebarActions.closeTab(getEventKeyForPanel(modComponentId)),
  );
}

function closeStarterModTabs({
  modDefinition,
  optionsState,
  sidebarState,
}: {
  modDefinition: ModDefinition;
  optionsState: ModComponentState;
  sidebarState: SidebarState;
}): SidebarState {
  const actionPanelDefinitions = getAllModComponentDefinitionsWithType(
    modDefinition,
    StarterBrickTypes.SIDEBAR_PANEL,
  );
  const activatedModComponents = selectModComponentsForMod(
    modDefinition.metadata.id,
  )({
    options: optionsState,
  });
  const actionPanelIds = getModComponentIdsForModComponentDefinitions(
    activatedModComponents,
    actionPanelDefinitions,
  );

  for (const actionPanelId of actionPanelIds) {
    sidebarState = closeSidebarTab(sidebarState, actionPanelId);
  }

  return sidebarState;
}

function initialOptionsArgs(modDefinition: ModDefinition): OptionsArgs {
  const schema = modDefinition.options?.schema;
  return Object.fromEntries(
    Object.entries(schema?.properties ?? {})
      .filter(
        ([name, fieldSchema]) =>
          isDatabasePreviewField(fieldSchema) &&
          schema &&
          isRequired(schema, name),
      )
      .map(([name, fieldSchema]) => [
        name,
        makeDatabasePreviewName(modDefinition, fieldSchema as Schema, name),
      ]),
  );
}

async function activateMods(modDefinitions: ModDefinition[]): Promise<boolean> {
  if (modDefinitions.length === 0) {
    return false;
  }

  const unconfiguredIntegrationDependencies =
    getUnconfiguredComponentIntegrations({
      extensionPoints: modDefinitions.flatMap((mod) => mod.extensionPoints),
    });

  const builtInIntegrationConfigs = await getBuiltInIntegrationConfigs();

  // XXX: do we want to fail all starter mod activations if one starter mod is invalid?
  const builtInDependencies = unconfiguredIntegrationDependencies.map(
    (unconfiguredDependency) => {
      if (unconfiguredDependency.integrationId === PIXIEBRIX_INTEGRATION_ID) {
        // Don't use `pixiebrixIntegrationDependencyFactory` because the output key is not guaranteed to be the same
        return {
          ...unconfiguredDependency,
          configId: PIXIEBRIX_INTEGRATION_CONFIG_ID,
        };
      }

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
  let [optionsState, sidebarState] = await Promise.all([
    getModComponentState(),
    getSidebarState(),
  ]);

  const newMods = modDefinitions.filter(
    (modDefinition) =>
      !optionsState.activatedModComponents.some(
        (mod) => mod._recipe?.id === modDefinition.metadata.id,
      ),
  );

  // XXX: do we want to fail all starter mod activations if a DB fails to get created?
  const newModConfigs = await Promise.all(
    newMods.map(async (modDefinition) => {
      const optionsArgs = initialOptionsArgs(modDefinition);

      await autoCreateDatabaseOptionsArgsInPlace(
        modDefinition,
        optionsArgs,
        async (args) => {
          const client = await getLinkedApiClient();

          // If the starter mod has been previously activated, we need to use the existing database ID
          // Otherwise, we create a new database
          // See: https://github.com/pixiebrix/pixiebrix-extension/pull/8499
          const existingDatabases =
            await client.get<Database[]>("/api/databases/");
          const database = existingDatabases.data.find(
            ({ name }) => name === args.name,
          );
          if (database) {
            return database.id;
          }

          const response = await client.post<Database>("/api/databases/", {
            name: args.name,
          });
          return response.data.id;
        },
      );

      return {
        modDefinition,
        optionsArgs,
      };
    }),
  );

  for (const { modDefinition, optionsArgs } of newModConfigs) {
    optionsState = activateModInOptionsState(optionsState, {
      modDefinition,
      configuredDependencies: builtInDependencies,
      optionsArgs,
    });

    sidebarState = closeStarterModTabs({
      modDefinition,
      optionsState,
      sidebarState,
    });
  }

  await Promise.all([
    saveModComponentState(optionsState),
    saveSidebarState(sidebarState),
  ]);

  reloadModsEveryTab();

  return newModConfigs.length > 0;
}

async function getStarterMods(): Promise<ModDefinition[]> {
  const client = await maybeGetLinkedApiClient();
  if (client == null) {
    console.debug(
      "Skipping starter mod activation because the mod is not linked to the PixieBrix service",
    );
    return [];
  }

  try {
    const { data: starterMods } = await client.get<ModDefinition[]>(
      "/api/onboarding/starter-blueprints/",
    );
    return starterMods;
  } catch (error) {
    reportError(error);
    return [];
  }
}

/**
 * Activates starter mods and refreshes local registries from remote.
 * @returns true if any of the starter mods were activated
 */
async function _activateStarterMods(): Promise<boolean> {
  const starterMods = await getStarterMods();

  try {
    // Activating Starter Mods and pulling the updates from remote registries to make sure
    // that all the bricks used in starter mods are available
    const [activated] = await Promise.all([
      activateMods(starterMods),
      refreshRegistries(),
    ]);

    return activated;
  } catch (error) {
    reportError(error);
    return false;
  }
}

export const debouncedActivateStarterMods = debounce(
  memoizeUntilSettled(_activateStarterMods),
  MOD_ACTIVATION_DEBOUNCE_MS,
  {
    leading: true,
    trailing: false,
    maxWait: MOD_ACTIVATION_MAX_MS,
  },
);

function initStarterMods(): void {
  browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (tab?.url?.startsWith(PLAYGROUND_URL)) {
      void debouncedActivateStarterMods();
    }
  });
}

export default initStarterMods;
