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

import type { RegistryId } from "@/types/registryTypes";
import type { ModVariablesDefinition } from "@/types/modDefinitionTypes";
import {
  StateNamespaces,
  SyncPolicies,
  type SyncPolicy,
} from "@/platform/state/stateTypes";
import { BusinessError } from "@/errors/businessErrors";
import { isEmpty, pickBy } from "lodash";
import { tryParseSessionStorageKey } from "@/platform/state/stateHelpers";
import type { Nullishable } from "@/utils/nullishUtils";
import { emptyModVariablesDefinitionFactory } from "@/utils/modUtils";
import type { Storage } from "webextension-polyfill";
import { dispatchStateChangeEvent } from "@/contentScript/stateController/stateEventHelpers";

const SCHEMA_POLICY_PROP = "x-sync-policy";

/**
 * Map from mod variable name to its synchronization policy.
 * Excludes variables with SyncPolicies.NONE.
 */
type VariableSyncPolicyMapping = Record<
  string,
  Exclude<SyncPolicy, typeof SyncPolicies.NONE>
>;

/**
 * Map from mod id to its variable synchronization policy.
 * @since 2.1.3
 */
export const modSyncPolicies = new Map<RegistryId, VariableSyncPolicyMapping>();

export function getSyncedVariableNames(modId: RegistryId) {
  const modPolicy = modSyncPolicies.get(modId) ?? {};

  const tabVariableNames = Object.keys(
    pickBy(modPolicy ?? {}, (x) => x === SyncPolicies.TAB),
  );
  const sessionVariableNames = Object.keys(
    pickBy(modPolicy ?? {}, (x) => x === SyncPolicies.SESSION),
  );
  const syncedVariableNames = [...tabVariableNames, ...sessionVariableNames];

  return {
    tab: tabVariableNames,
    session: sessionVariableNames,
    synced: syncedVariableNames,
  };
}

export function mapModVariablesToModSyncPolicy(
  variables: ModVariablesDefinition,
): VariableSyncPolicyMapping {
  return Object.fromEntries(
    Object.entries(variables.schema.properties ?? {})
      .map(([key, definition]) => {
        // eslint-disable-next-line security/detect-object-injection -- constant
        const variablePolicy = (definition as UnknownObject)[
          SCHEMA_POLICY_PROP
        ] as SyncPolicy | undefined;

        if (variablePolicy && variablePolicy !== SyncPolicies.NONE) {
          if (
            ![SyncPolicies.SESSION, SyncPolicies.TAB].includes(variablePolicy)
          ) {
            throw new BusinessError(
              `Unsupported sync policy: ${variablePolicy}`,
            );
          }

          return [
            key,
            variablePolicy as Exclude<SyncPolicy, typeof SyncPolicies.NONE>,
          ];
        }

        return null;
      })
      .filter((x) => x != null),
  ) as VariableSyncPolicyMapping;
}

// Keep as separate method so it's safe to call addListener multiple times with the listener
function onSessionStorageChange(
  change: Record<string, Storage.StorageChange>,
  areaName: string,
): void {
  if (areaName === "session") {
    for (const key of Object.keys(change)) {
      const slot = tryParseSessionStorageKey(key);

      if (slot) {
        dispatchStateChangeEvent({
          namespace: StateNamespaces.MOD,
          blueprintId: slot.modId,
        });
      }
    }
  }
}

/**
 * Register variables and their synchronization policy for a mod.
 * @param modId the mod registry id
 * @param variables the mod variables definition containing their synchronization policy. If nullish, a blank policy
 * is registered.
 * @see emptyModVariablesDefinitionFactory
 */
export function registerModVariables(
  modId: RegistryId,
  variables: Nullishable<ModVariablesDefinition>,
): void {
  const modSyncPolicy = mapModVariablesToModSyncPolicy(
    variables ?? emptyModVariablesDefinitionFactory(),
  );
  modSyncPolicies.set(modId, modSyncPolicy);

  // If any variables are set to sync, listen for changes to session storage to notify the mods running on this page
  if (!isEmpty(modSyncPolicy)) {
    browser.storage.onChanged.addListener(onSessionStorageChange);
  }
}
