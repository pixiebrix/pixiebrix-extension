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
import { type JsonObject, type ValueOf } from "type-fest";
import { assertPlatformCapability } from "@/platform/platformContext";
import { assertNotNullish, type Nullishable } from "@/utils/nullishUtils";

export const MergeStrategies = {
  SHALLOW: "shallow",
  REPLACE: "replace",
  DEEP: "deep",
} as const;

export type MergeStrategy = ValueOf<typeof MergeStrategies>;

export const StateNamespaces = {
  MOD: "blueprint",
  PRIVATE: "extension",
  PUBLIC: "shared",
} as const;

export type StateNamespace = ValueOf<typeof StateNamespaces>;

const privateState = new Map<UUID, JsonObject>();

/**
 * The blueprint page state, or null for shared state
 */
const modState = new Map<RegistryId | null, JsonObject>();

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

function dispatchStageChangeEventOnChange({
  previous,
  next,
  namespace,
  extensionId,
  blueprintId,
}: {
  previous: unknown;
  next: unknown;
  namespace: string;
  extensionId: Nullishable<UUID>;
  blueprintId: Nullishable<RegistryId>;
}) {
  if (!isEqual(previous, next)) {
    // For now, leave off the event data because we're using a public channel
    const detail = {
      namespace,
      extensionId,
      blueprintId,
    };

    console.debug("Dispatching statechange", detail);

    const event = new CustomEvent("statechange", { detail, bubbles: true });
    document.dispatchEvent(event);
  }
}

export function setState({
  namespace,
  data,
  mergeStrategy,
  modComponentId,
  // Normalize undefined to null for lookup
  modId = null,
}: {
  namespace: StateNamespace;
  data: JsonObject;
  mergeStrategy: MergeStrategy;
  modComponentId: Nullishable<UUID>;
  modId: Nullishable<RegistryId>;
}) {
  assertPlatformCapability("state");

  const notifyOnChange = (previous: JsonObject, next: JsonObject) => {
    dispatchStageChangeEventOnChange({
      previous,
      next,
      namespace,
      extensionId: modComponentId,
      blueprintId: modId,
    });
  };

  switch (namespace) {
    case StateNamespaces.PUBLIC: {
      const previous = modState.get(null) ?? {};
      const next = mergeState(previous, data, mergeStrategy);
      modState.set(null, next);
      notifyOnChange(previous, next);
      return next;
    }

    case StateNamespaces.MOD: {
      const previous = modState.get(modId) ?? {};
      const next = mergeState(previous, data, mergeStrategy);
      modState.set(modId, next);
      notifyOnChange(previous, next);
      return next;
    }

    case StateNamespaces.PRIVATE: {
      assertNotNullish(
        modComponentId,
        "Invalid context: extensionId not found",
      );
      const previous = privateState.get(modComponentId) ?? {};
      const next = mergeState(previous, data, mergeStrategy);
      privateState.set(modComponentId, next);
      notifyOnChange(previous, next);
      return next;
    }

    default: {
      const exhaustiveCheck: never = namespace;
      throw new BusinessError(`Invalid namespace: ${exhaustiveCheck}`);
    }
  }
}

export function getState({
  namespace,
  modComponentId,
  // Normalize undefined to null for lookup
  modId = null,
}: {
  namespace: StateNamespace;
  modComponentId: Nullishable<UUID>;
  modId: Nullishable<RegistryId>;
}): JsonObject {
  assertPlatformCapability("state");

  switch (namespace) {
    case StateNamespaces.PUBLIC: {
      return modState.get(null) ?? {};
    }

    case StateNamespaces.MOD: {
      return modState.get(modId) ?? {};
    }

    case StateNamespaces.PRIVATE: {
      assertNotNullish(
        modComponentId,
        "Invalid context: extensionId not found",
      );
      return privateState.get(modComponentId) ?? {};
    }

    default: {
      const exhaustiveCheck: never = namespace;
      throw new BusinessError(`Invalid namespace: ${exhaustiveCheck}`);
    }
  }
}

export function TEST_resetState(): void {
  privateState.clear();
  modState.clear();
}
