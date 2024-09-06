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
import { cloneDeep, isEqual, merge } from "lodash";
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
import { SessionMap } from "@/mv3/SessionStorage";

/**
 * Map from mod component id to its private state.
 */
const framePrivateState = new Map<UUID, JsonObject>();

/**
 * Map from mod id to its mod state. Or null key for public page state.
 */
const frameModState = new Map<RegistryId | null, JsonObject>();

const syncedModState = new SessionMap<JsonObject>(
  "syncedModState",
  import.meta.url,
);

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

async function getModVariableState(modId: RegistryId): Promise<JsonObject> {
  // TODO: depending on performance, consider caching in memory to avoid unnecessary reads from storage and invalidate
  //  cache storage change events
  const synced = (await syncedModState.get(modId)) ?? {};
  const local = frameModState.get(modId) ?? {};

  // Prefer synced state over local state
  return {
    ...local,
    ...synced,
  };
}

function dispatchStateChangeEventOnChange({
  previous,
  next,
  namespace,
  modComponentRef: { modComponentId, modId },
}: {
  previous: unknown;
  next: unknown;
  namespace: StateNamespace;
  modComponentRef: Except<ModComponentRef, "starterBrickId">;
}) {
  if (!isEqual(previous, next)) {
    // For now, leave off the event data because state controller in the content script uses JavaScript/DOM
    // events, which is a public channel (the host site/other extensions can see the event).
    const detail = {
      namespace,
      extensionId: modComponentId,
      blueprintId: modId,
    } satisfies StateChangeEventDetail;

    console.debug("Dispatching statechange", detail);

    const event = new CustomEvent(STATE_CHANGE_JS_EVENT_TYPE, {
      detail,
      bubbles: true,
    });
    document.dispatchEvent(event);
  }
}

export async function setState({
  namespace,
  data,
  mergeStrategy,
  syncPolicy,
  modComponentRef,
}: {
  namespace: StateNamespace;
  data: JsonObject;
  mergeStrategy: MergeStrategy;
  syncPolicy: SyncPolicy;
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

      if (syncPolicy === SyncPolicies.ALL_TABS_FRAMES) {
        await syncedModState.set(modId, next);
      } else {
        frameModState.set(modId, next);
      }

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

export function TEST_resetState(): void {
  framePrivateState.clear();
  frameModState.clear();
}
