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

import apiVersionOptions, {
  type ApiVersionOptions,
} from "@/runtime/apiVersionOptions";
import { pickBy } from "lodash";
import { type ApiVersion } from "@/types/runtimeTypes";
import {
  assertPlatformCapability,
  getPlatform,
} from "@/platform/platformContext";
import { type ModComponentRef } from "@/types/modComponentTypes";
import { type Except } from "type-fest";
import { StateNamespaces } from "@/platform/state/stateTypes";

/**
 * Variable for accessing the mod Page State.
 */
export const MOD_VARIABLE_REFERENCE = "@mod";

/**
 * A tag to detect if the context slice is bound to the mod variable.
 */
// Can't use a Proxy/Symbol because we need to be able to serialize the context for the messenger
const MOD_VARIABLE_TAG = "__modState";

// Mod variable reference optional because it's not added if runtime version does not support it
type ExtendedContext<T extends UnknownObject = UnknownObject> = T & {
  [MOD_VARIABLE_REFERENCE]?: UnknownObject;
};

/**
 * Test helper to spread the mod variable into the context if the runtime version supports it.
 */
export function extraEmptyModStateContext(version: ApiVersion): UnknownObject {
  if (apiVersionOptions(version).extendModVariable) {
    return {
      [MOD_VARIABLE_REFERENCE]: {
        [MOD_VARIABLE_TAG]: true,
      },
    };
  }

  return {};
}

/**
 * Returns true if the context has been enriched with a mod variable.
 */
export function isModVariableContext<T extends UnknownObject = UnknownObject>(
  ctxt: unknown,
): ctxt is ExtendedContext<T> {
  if (typeof ctxt !== "object") {
    return false;
  }

  // eslint-disable-next-line security/detect-object-injection -- constant
  const modVariable = (ctxt as ExtendedContext)[MOD_VARIABLE_REFERENCE];
  if (modVariable == null || typeof modVariable !== "object") {
    return false;
  }

  return Object.hasOwn(modVariable, MOD_VARIABLE_TAG);
}

/**
 * Context with tags excluded
 */
export function contextAsPlainObject<T extends UnknownObject = UnknownObject>(
  context: T,
): T {
  return {
    ...context,
    [MOD_VARIABLE_REFERENCE]: pickBy(
      // eslint-disable-next-line security/detect-object-injection -- constant
      (context as ExtendedContext)[MOD_VARIABLE_REFERENCE] ?? {},
      (value, key) => key !== MOD_VARIABLE_TAG,
    ),
  };
}

/**
 * Returns an extended state with a `@mod` variable provided.
 * @since 1.7.34
 * @param originalContext The original context
 * @param modId The mod ID, if there is one
 * @param update If true, the mod variable will be updated with the latest state
 * @param options The runtime version API options
 */
function extendModVariableContext<T extends UnknownObject = UnknownObject>(
  originalContext: T,
  {
    modComponentRef,
    update = false,
    options,
  }: {
    modComponentRef: Except<ModComponentRef, "starterBrickId">;
    update?: boolean;
    options: Pick<ApiVersionOptions, "extendModVariable">;
  },
): ExtendedContext<T> {
  assertPlatformCapability("state");

  // For backward compatability, don't overwrite for older versions of the runtime. It should generally be safe, but
  // there may be some edge cases especially with implicit data flow.
  if (!options.extendModVariable) {
    return originalContext;
  }

  // For backward compatability, don't overwrite `@mod` if it's shadowed by a local variable
  if (
    Object.hasOwn(originalContext, MOD_VARIABLE_REFERENCE) &&
    !isModVariableContext(originalContext)
  ) {
    return originalContext as ExtendedContext<T>;
  }

  // Already extended. Return the original context so that a consistent snapshot of the snap is provided to all readers
  if (!update && isModVariableContext(originalContext)) {
    return originalContext;
  }

  // Eagerly grab the state. It's fast/synchronous since it's in memory in the same JS context.
  // Previously, we had considered using a proxy to lazily load the state. However, eagerly reading is simpler.
  // Additionally, in the future to pass the context to the sandbox we'd have to always load the state anyway.
  const modState = getPlatform().state.getState({
    namespace: StateNamespaces.MOD,
    modComponentRef,
  });

  return {
    ...originalContext,
    [MOD_VARIABLE_REFERENCE]: {
      ...modState,
      [MOD_VARIABLE_TAG]: true,
    },
  };
}

export default extendModVariableContext;
