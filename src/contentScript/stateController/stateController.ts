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
  type StateNamespace,
  StateNamespaces,
} from "@/platform/state/stateTypes";
import { getThisFrame } from "webext-messenger";
import { getSessionStorageKey } from "@/platform/state/stateHelpers";
import {
  getSyncedVariableNames,
  modSyncPolicies,
} from "@/contentScript/stateController/modVariablePolicyController";
import { dispatchStateChangeEvent } from "@/contentScript/stateController/stateEventHelpers";

/**
 * Map from mod component id to its private state.
 */
const framePrivateState = new Map<UUID, JsonObject>();

/**
 * Map from mod id to its mod state. Or null key for public page state.
 */
const frameModState = new Map<RegistryId | null, JsonObject>();

/**
 * Returns the current state of the mod variables according to the mod's variable synchronization policy.
 */
async function getModVariableState(modId: RegistryId): Promise<JsonObject> {
  const variableNames = getSyncedVariableNames(modId);

  let tabState = {};
  let sessionState = {};

  if (!isEmpty(variableNames.synced)) {
    const { tabId } = await getThisFrame();
    const sessionKey = getSessionStorageKey({ modId });
    const tabKey = getSessionStorageKey({ modId, tabId });

    const values = await browser.storage.session.get([tabKey, sessionKey]);

    // eslint-disable-next-line security/detect-object-injection -- key passed to .get
    tabState = pick(values[tabKey] ?? {}, variableNames.tab);
    // eslint-disable-next-line security/detect-object-injection -- key passed to .get
    sessionState = pick(values[sessionKey] ?? {}, variableNames.session);
  }

  const local = frameModState.get(modId) ?? {};

  return {
    ...omit(local, variableNames.synced),
    ...tabState,
    ...sessionState,
  };
}

async function updateModVariableState(
  modId: RegistryId,
  nextState: JsonObject,
): Promise<void> {
  const variableNames = getSyncedVariableNames(modId);

  frameModState.set(modId, omit(nextState, variableNames.synced));

  if (!isEmpty(variableNames.synced)) {
    const { tabId } = await getThisFrame();
    const sessionKey = getSessionStorageKey({ modId });
    const tabKey = getSessionStorageKey({ modId, tabId });

    await browser.storage.session.set({
      [tabKey]: pick(nextState, variableNames.tab),
      [sessionKey]: pick(nextState, variableNames.session),
    });
  }
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
    dispatchStateChangeEvent({
      namespace,
      extensionId: modComponentId,
      blueprintId: modId,
    });
  }
}

export async function setState({
  namespace,
  modComponentRef,
  data,
  mergeStrategy,
}: {
  namespace: StateNamespace;
  modComponentRef: Except<ModComponentRef, "starterBrickId">;
  data: JsonObject;
  mergeStrategy: MergeStrategy;
}) {
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
      await updateModVariableState(modId, next);
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

export async function TEST_resetStateController(): Promise<void> {
  framePrivateState.clear();
  frameModState.clear();
  modSyncPolicies.clear();
  await browser.storage.session.clear();
}
