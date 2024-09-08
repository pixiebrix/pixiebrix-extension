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

import { type UUID } from "@/types/stringTypes";
import { type RegistryId } from "@/types/registryTypes";
import { cloneDeep, isEmpty, isEqual, merge, omit, pick } from "lodash";
import { BusinessError } from "@/errors/businessErrors";
import { type Except, type JsonObject } from "type-fest";
import { assertPlatformCapability } from "@/platform/platformContext";
import { assertNotNullish } from "@/utils/nullishUtils";
import { type ModComponentRef } from "@/types/modComponentTypes";
import {
  MergeStrategies,
  type MergeStrategy,
  STATE_CHANGE_JS_EVENT_TYPE,
  type StateChangeEventDetail,
  type StateNamespace,
  StateNamespaces,
  SyncPolicies,
  type SyncPolicy,
} from "@/platform/state/stateTypes";
import { type ModVariablesDefinition } from "@/types/modDefinitionTypes";
import { Storage } from "webextension-polyfill";
import StorageChange = Storage.StorageChange;
import { validateRegistryId } from "@/types/helpers";

const keyPrefix = "#modVariables/";

const SCHEMA_POLICY_PROP = "x-sync-policy";

/**
 * Map from mod variable name to it synchronization policy.
 *
 * Excludes variables with SyncPolicies.NONE.
 */
type ModSyncPolicy = Record<string, typeof SyncPolicies.SESSION>;

/**
 * Map from mod component id to its private state.
 */
// eslint-disable-next-line local-rules/persistBackgroundData -- content script state
const framePrivateState = new Map<UUID, JsonObject>();

/**
 * Map from mod id to its mod state. Or null key for public page state.
 */
// eslint-disable-next-line local-rules/persistBackgroundData -- content script state
const frameModState = new Map<RegistryId | null, JsonObject>();

// eslint-disable-next-line local-rules/persistBackgroundData -- content script state
const modSyncPolicies = new Map<RegistryId, ModSyncPolicy>();

function getSessionStorageKey(modId: RegistryId): string {
  return `${keyPrefix}${modId}`;
}

function mergeState(
  previous: JsonObject,
  update: JsonObject,
  strategy: MergeStrategy,
): JsonObject {
  const cloned = cloneDeep(update);

  switch (strategy) {
    case MergeStrategies.REPLACE: {
      return cloned;
    }

    case MergeStrategies.DEEP: {
      // `merge` mutates the first argument, so we clone it first
      return merge(cloneDeep(previous), cloned);
    }

    case MergeStrategies.SHALLOW: {
      return { ...previous, ...cloned };
    }

    default: {
      const exhaustiveCheck: never = strategy;
      throw new BusinessError(`Unknown merge strategy: ${exhaustiveCheck}`);
    }
  }
}

/**
 * Returns the current state of the mod variables according to the mod's variable synchronization policy.
 */
async function getModVariableState(modId: RegistryId): Promise<JsonObject> {
  const modPolicy = modSyncPolicies.get(modId);
  const syncedVariableNames = Object.keys(modPolicy ?? {});

  let synced = {};

  if (!isEmpty(modPolicy)) {
    const key = getSessionStorageKey(modId);
    // Skip call if there are no synchronized variables
    const value = await browser.storage.session.get(key);
    // eslint-disable-next-line security/detect-object-injection -- key passed to .get
    synced = value[key] ?? {};
  }

  const local = frameModState.get(modId) ?? {};

  return {
    ...omit(local, syncedVariableNames),
    ...pick(synced, syncedVariableNames),
  };
}

async function updateModState(
  modId: RegistryId,
  nextState: JsonObject,
): Promise<void> {
  const modPolicy = modSyncPolicies.get(modId);
  const syncedVariableNames = Object.keys(modPolicy ?? {});

  frameModState.set(modId, omit(nextState, syncedVariableNames));

  if (!isEmpty(modPolicy)) {
    const key = getSessionStorageKey(modId);
    const synced = pick(nextState, syncedVariableNames);
    await browser.storage.session.set({ [key]: synced });
  }
}

function dispatchStateChangeEventOnChange({
  previous,
  next,
  namespace,
  modComponentRef: { modComponentId, modId },
}: {
  previous: JsonObject;
  next: JsonObject;
  namespace: StateNamespace;
  modComponentRef: Except<ModComponentRef, "starterBrickId">;
}) {
  const modPolicy = modSyncPolicies.get(modId);
  const syncedVariableNames = Object.keys(modPolicy ?? {});

  if (
    !isEqual(
      pick(previous, syncedVariableNames),
      pick(next, syncedVariableNames),
    )
  ) {
    // Skip firing because it will be fired by the session storage listener
    return;
  }

  if (!isEqual(previous, next)) {
    // For now, leave off the event data because state controller in the content script uses JavaScript/DOM
    // events, which is a public channel (the host site/other extensions can see the event).
    const detail = {
      namespace,
      extensionId: modComponentId,
      blueprintId: modId,
    } satisfies StateChangeEventDetail;

    console.debug("Dispatching statechange", detail);

    document.dispatchEvent(
      new CustomEvent(STATE_CHANGE_JS_EVENT_TYPE, {
        detail,
        bubbles: true,
      }),
    );
  }
}

export async function setState({
  namespace,
  data,
  mergeStrategy,
  modComponentRef,
}: {
  namespace: StateNamespace;
  data: JsonObject;
  mergeStrategy: MergeStrategy;
  modComponentRef: Except<ModComponentRef, "starterBrickId">;
}): Promise<JsonObject> {
  assertPlatformCapability("state");

  const { modComponentId, modId } = modComponentRef;

  const notifyOnChange = (previous: JsonObject, next: JsonObject) => {
    dispatchStateChangeEventOnChange({
      previous,
      next,
      namespace,
      modComponentRef,
    });
  };

  switch (namespace) {
    case StateNamespaces.PUBLIC: {
      const previous = frameModState.get(null) ?? {};
      const next = mergeState(previous, data, mergeStrategy);
      frameModState.set(null, next);
      notifyOnChange(previous, next);
      return next;
    }

    case StateNamespaces.MOD: {
      const previous = await getModVariableState(modId);
      const next = mergeState(previous, data, mergeStrategy);

      await updateModState(modId, next);

      notifyOnChange(previous, next);
      return next;
    }

    case StateNamespaces.PRIVATE: {
      assertNotNullish(
        modComponentId,
        "Invalid context: mod component id not found",
      );
      const previous = framePrivateState.get(modComponentId) ?? {};
      const next = mergeState(previous, data, mergeStrategy);
      framePrivateState.set(modComponentId, next);
      notifyOnChange(previous, next);
      return next;
    }

    default: {
      const exhaustiveCheck: never = namespace;
      throw new BusinessError(`Invalid namespace: ${exhaustiveCheck}`);
    }
  }
}

export async function getState({
  namespace,
  modComponentRef: { modComponentId, modId },
}: {
  namespace: StateNamespace;
  modComponentRef: Except<ModComponentRef, "starterBrickId">;
}): Promise<JsonObject> {
  assertPlatformCapability("state");

  switch (namespace) {
    case StateNamespaces.PUBLIC: {
      return frameModState.get(null) ?? {};
    }

    case StateNamespaces.MOD: {
      return getModVariableState(modId);
    }

    case StateNamespaces.PRIVATE: {
      assertNotNullish(
        modComponentId,
        "Invalid context: mod component id not found",
      );
      return framePrivateState.get(modComponentId) ?? {};
    }

    default: {
      const exhaustiveCheck: never = namespace;
      throw new BusinessError(`Invalid namespace: ${exhaustiveCheck}`);
    }
  }
}

function mapModVariablesToModSyncPolicy(
  variables: ModVariablesDefinition,
): ModSyncPolicy {
  return Object.fromEntries(
    Object.entries(variables.schema.properties ?? {})
      .map(([key, definition]) => {
        // eslint-disable-next-line security/detect-object-injection -- constant
        const variablePolicy = (definition as UnknownObject)[
          SCHEMA_POLICY_PROP
        ] as SyncPolicy | undefined;

        if (variablePolicy && variablePolicy !== SyncPolicies.NONE) {
          if (variablePolicy !== SyncPolicies.SESSION) {
            throw new BusinessError(
              `Unsupported sync policy: ${variablePolicy}`,
            );
          }

          return [key, variablePolicy] satisfies [string, SyncPolicy];
        }

        return null;
      })
      .filter((x) => x != null),
  );
}

// Keep as separate method so it's safe to call addListener multiple times with the listener
function onSessionStorageChange(
  change: Record<string, StorageChange>,
  areaName: string,
): void {
  if (areaName === "session") {
    for (const key of Object.keys(change)) {
      if (key.startsWith(keyPrefix)) {
        const modId = validateRegistryId(key.slice(keyPrefix.length));

        const detail = {
          namespace: StateNamespaces.MOD,
          blueprintId: modId,
        } satisfies StateChangeEventDetail;

        console.debug("Dispatching statechange", detail);

        document.dispatchEvent(
          new CustomEvent(STATE_CHANGE_JS_EVENT_TYPE, {
            detail,
            bubbles: true,
          }),
        );
      }
    }
  }
}

/**
 * Register variables and their synchronization policy for a mod.
 * @param modId the mod registry id
 * @param variables the mod variables definition containing their synchronization policy
 */
export function registerModVariables(
  modId: RegistryId,
  variables: ModVariablesDefinition,
): void {
  const modSyncPolicy = mapModVariablesToModSyncPolicy(variables);
  modSyncPolicies.set(modId, modSyncPolicy);

  // If any variables are set to sync, listen for changes to session storage to notify the mods running on this page
  if (!isEmpty(modSyncPolicy)) {
    browser.storage.onChanged.addListener(onSessionStorageChange);
  }
}

export function TEST_resetState(): void {
  framePrivateState.clear();
  frameModState.clear();
}
