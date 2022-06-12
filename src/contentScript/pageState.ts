/*
 * Copyright (C) 2022 PixieBrix, Inc.
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

import { RegistryId, UUID } from "@/core";
import { UnknownObject } from "@/types";
import { cloneDeep, merge } from "lodash";
import { BusinessError } from "@/errors/businessErrors";
import { JsonObject } from "type-fest";
import { expectContext } from "@/utils/expectContext";

const extensionState = new Map<UUID, UnknownObject>();

export type MergeStrategy = "shallow" | "replace" | "deep";

/**
 * The blueprint page state, or null for shared state
 */
const blueprintState = new Map<RegistryId | null, UnknownObject>();

function mergeState(
  previous: UnknownObject,
  update: UnknownObject,
  strategy: MergeStrategy
): UnknownObject {
  const cloned = cloneDeep(update);

  switch (strategy) {
    case "replace": {
      return cloned;
    }

    case "deep": {
      return merge(previous, cloned);
    }

    case "shallow": {
      return { ...previous, ...cloned };
    }

    default: {
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions -- dynamic check for never type
      throw new BusinessError(`Unknown merge strategy: ${strategy}`);
    }
  }
}

export function setPageState({
  namespace,
  data,
  mergeStrategy,
  extensionId,
  // Normalize undefined to null for lookup
  blueprintId = null,
}: {
  namespace: string;
  data: JsonObject;
  mergeStrategy: MergeStrategy;
  extensionId: UUID;
  blueprintId: RegistryId | null;
}) {
  expectContext("contentScript");

  switch (namespace) {
    case "shared": {
      const previous = blueprintState.get(null) ?? {};
      const next = mergeState(previous, data, mergeStrategy);
      blueprintState.set(null, next);
      return next;
    }

    case "blueprint": {
      const previous = blueprintState.get(blueprintId) ?? {};
      const next = mergeState(previous, data, mergeStrategy);
      blueprintState.set(blueprintId, next);
      return next;
    }

    case "extension": {
      if (extensionId == null) {
        throw new Error("Invalid context: extensionId not found");
      }

      const previous = extensionState.get(extensionId) ?? {};
      const next = mergeState(previous, data, mergeStrategy);
      extensionState.set(extensionId, next);
      return next;
    }

    default: {
      throw new BusinessError(`Invalid namespace: ${namespace}`);
    }
  }
}

export function getPageState({
  namespace,
  extensionId,
  // Normalize undefined to null for lookup
  blueprintId = null,
}: {
  namespace: string;
  extensionId: UUID;
  blueprintId: RegistryId | null;
}) {
  expectContext("contentScript");

  switch (namespace) {
    case "shared": {
      return blueprintState.get(null) ?? {};
    }

    case "blueprint": {
      return blueprintState.get(blueprintId) ?? {};
    }

    case "extension": {
      if (extensionId == null) {
        throw new Error("Invalid context: extensionId not found");
      }

      return extensionState.get(extensionId) ?? {};
    }

    default: {
      throw new BusinessError(`Invalid namespace: ${namespace}`);
    }
  }
}
