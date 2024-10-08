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
import { getErrorMessage } from "@/errors/errorHelpers";
import { restrict } from "@/auth/featureFlagStorage";
import { RestrictedFeatures } from "@/auth/featureFlags";
import { API_PATHS } from "@/data/service/urlPaths";
import { selectModInstanceMap } from "@/store/modComponents/modInstanceSelectors";
import { mapModInstanceToActivatedModComponents } from "@/store/modComponents/modInstanceUtils";

// eslint-disable-next-line local-rules/persistBackgroundData -- no state; destructuring reducer and actions
const { reducer: modComponentReducer, actions: modComponentActions } =
  modComponentSlice;
// eslint-disable-next-line local-rules/persistBackgroundData -- no state; destructuring reduce and actions
const { reducer: sidebarReducer, actions: sidebarActions } = sidebarSlice;

const WELCOME_URL = "https://www.pixiebrix.com/welcome";
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
  return modComponentReducer(
    state,
    modComponentActions.activateMod({
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

function closeWelcomeModTabs({
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

  const modInstance = selectModInstanceMap({
    options: optionsState,
  }).get(modDefinition.metadata.id);

  if (modInstance) {
    const actionPanelIds = getModComponentIdsForModComponentDefinitions(
      mapModInstanceToActivatedModComponents(modInstance),
      actionPanelDefinitions,
    );

    for (const actionPanelId of actionPanelIds) {
      sidebarState = closeSidebarTab(sidebarState, actionPanelId);
    }
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

export type ActivateModsResult = {
  /**
   * Total number of available welcome mods
   */
  welcomeModCount: number;

  /**
   * Number of welcome mods skpped because they are already activated
   */
  skippedModCount?: number;

  /**
   * Number of welcome mods that were rejected because of errors, should always be 0 currently
   */
  rejectedModCount?: number;

  /**
   * Number of welcome mods that were successfully activated
   */
  resolvedModCount?: number;

  /**
   * Error message if any
   */
  error?: string;
};

async function activateMods(
  modDefinitions: ModDefinition[],
): Promise<ActivateModsResult> {
  if (modDefinitions.length === 0) {
    return {
      welcomeModCount: 0,
    };
  }

  const unconfiguredIntegrationDependencies =
    getUnconfiguredComponentIntegrations({
      extensionPoints: modDefinitions.flatMap((mod) => mod.extensionPoints),
    });

  const builtInIntegrationConfigs = await getBuiltInIntegrationConfigs();

  // XXX: do we want to fail all welcome mod activations if one welcome mod is invalid?
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
          `No built-in config found for integration ${unconfiguredDependency.integrationId}. Check that welcome mods have built-in configuration options for all required integrations.`,
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
        (mod) => mod.modMetadata.id === modDefinition.metadata.id,
      ),
  );

  // XXX: do we want to fail all welcome mod activations if a DB fails to get created?
  const newModConfigs = await Promise.all(
    newMods.map(async (modDefinition) => {
      const optionsArgs = initialOptionsArgs(modDefinition);

      await autoCreateDatabaseOptionsArgsInPlace(
        modDefinition,
        optionsArgs,
        async (args) => {
          const client = await getLinkedApiClient();

          // If the welcome mod has been previously activated, we need to use the existing database ID
          // Otherwise, we create a new database
          // See: https://github.com/pixiebrix/pixiebrix-extension/pull/8499
          const existingDatabases = await client.get<Database[]>(
            API_PATHS.DATABASES,
          );
          const database = existingDatabases.data.find(
            ({ name }) => name === args.name,
          );
          if (database) {
            return database.id;
          }

          const response = await client.post<Database>(API_PATHS.DATABASES, {
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

    sidebarState = closeWelcomeModTabs({
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

  return {
    welcomeModCount: modDefinitions.length,
    skippedModCount: modDefinitions.length - newMods.length,
    rejectedModCount: newModConfigs.length - newMods.length,
    resolvedModCount: newModConfigs.length,
  };
}

async function getWelcomeMods(): Promise<ModDefinition[]> {
  const client = await maybeGetLinkedApiClient();
  if (client == null) {
    console.debug(
      "Skipping welcome mod activation because the mod is not linked to the PixieBrix service",
    );
    return [];
  }

  try {
    const { data: welcomeMods } = await client.get<ModDefinition[]>(
      API_PATHS.ONBOARDING_STARTER_BLUEPRINTS,
    );
    return welcomeMods;
  } catch (error) {
    reportError(error);
    return [];
  }
}

/**
 * Activates welcome mods and refreshes local registries from remote.
 * @returns true if any of the welcome mods were activated
 */
async function _activateWelcomeMods(): Promise<ActivateModsResult> {
  const welcomeMods = await getWelcomeMods();

  if (await restrict(RestrictedFeatures.MARKETPLACE)) {
    return {
      welcomeModCount: welcomeMods.length,
      error:
        "Your team's policy does not permit you to activate marketplace mods. Contact your team admin for assistance",
    };
  }

  try {
    // Activating Welcome Mods and pulling the updates from remote registries to make sure
    // that all the bricks used in welcome mods are available
    const [activated] = await Promise.all([
      activateMods(welcomeMods),
      refreshRegistries(),
    ]);

    return activated;
  } catch (error) {
    reportError(error);
    return {
      welcomeModCount: welcomeMods.length,
      error: getErrorMessage(error),
    };
  }
}

export const debouncedActivateWelcomeMods = debounce(
  memoizeUntilSettled(_activateWelcomeMods),
  MOD_ACTIVATION_DEBOUNCE_MS,
  {
    leading: true,
    trailing: false,
    maxWait: MOD_ACTIVATION_MAX_MS,
  },
);

function initWelcomeMods(): void {
  browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (tab?.url?.startsWith(WELCOME_URL)) {
      void debouncedActivateWelcomeMods();
    }
  });
}

export default initWelcomeMods;
