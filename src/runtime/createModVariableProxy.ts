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

import { type UnknownObject } from "@/types/objectTypes";
import { expectContext } from "@/utils/expectContext";
import { getPageState } from "@/contentScript/pageState";
import { type RegistryId } from "@/types/registryTypes";
import { once } from "lodash";

/**
 * Variable for accessing the mod Page State.
 */
const MOD_VARIABLE_REFERENCE = "@mod";

/**
 * A symbol to detect if an object has been wrapped in the mod variable proxy.
 */
const MOD_PROXY_SYMBOL = Symbol("ProxySymbol");

/**
 * Returns true if the context has been enriched with a mod variable.
 * @param ctxt the context
 */
export function isModVariableContext(ctxt: unknown): ctxt is UnknownObject {
  // eslint-disable-next-line security/detect-object-injection -- symbol
  return (
    typeof ctxt === "object" &&
    Boolean(
      (ctxt as Record<typeof MOD_PROXY_SYMBOL, unknown>)[MOD_PROXY_SYMBOL]
    )
  );
}

/**
 * Create the context for Nunjucks that resolves the same page state as the original proxied context.
 * Required because Nunjucks needs the keys to be enumerable.
 * @param originalProxy the original proxied context
 * @param modifiedContext the altered context
 */
export function createNunjucksContext<
  T extends Record<string | symbol | number, unknown>
>({
  originalProxy,
  modifiedContext,
}: {
  originalProxy: unknown;
  modifiedContext: T;
}): T {
  if (
    !isModVariableContext(originalProxy) ||
    isModVariableContext(modifiedContext) ||
    typeof modifiedContext !== "object"
  ) {
    return modifiedContext;
  }

  // eslint-disable-next-line security/detect-object-injection, @typescript-eslint/no-explicit-any -- constant name
  (modifiedContext as any)[MOD_VARIABLE_REFERENCE] =
    originalProxy[MOD_VARIABLE_REFERENCE];

  return modifiedContext;
}

/**
 * Returns a proxy that provides access to the mod Page State if there's not already `@mod` variable in the context.
 *
 * The `@mod` variable is only directly accessible; it does not appear during enumeration.
 *
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy
 * @since 1.7.34
 * @param {Object} originalContext - The original context
 * @param {RegistryId} blueprintId - The mod ID, or null if not in a mod
 * @param {boolean} enumerable - true if the "@mod" variable should be available during enumeration
 */
function createModVariableProxy<T extends UnknownObject = UnknownObject>(
  originalContext: T,
  {
    blueprintId,
    enumerable = false,
  }: { blueprintId: RegistryId | null; enumerable?: boolean }
): T {
  expectContext("contentScript");

  if (isModVariableContext(originalContext)) {
    return originalContext;
  }

  // Lazily get the page state and ensure consistent view for all fields
  const getPageStateOnce = once(() =>
    getPageState({
      namespace: "blueprint",
      blueprintId,
      // `extensionId` is not used because namespace is `blueprint`
      extensionId: undefined,
    })
  );

  return new Proxy(originalContext, {
    get(target, prop) {
      // For backward compatability, don't overwrite `@mod` if it's already in the context
      if (
        !(MOD_VARIABLE_REFERENCE in target) &&
        prop === MOD_VARIABLE_REFERENCE
      ) {
        return getPageStateOnce();
      }

      if (prop === MOD_PROXY_SYMBOL) {
        return true;
      }

      return Reflect.get(target, prop);
    },

    has(target, prop) {
      return prop === MOD_VARIABLE_REFERENCE || Reflect.has(target, prop);
    },

    // Nunjucks appears to require ownKeys to exist to work properly
    ownKeys(target: never): ArrayLike<string | symbol> {
      if (MOD_VARIABLE_REFERENCE in target || !enumerable) {
        return Reflect.ownKeys(target);
      }

      return [...Reflect.ownKeys(target), MOD_VARIABLE_REFERENCE];
    },

    getOwnPropertyDescriptor(
      target: UnknownObject,
      prop: string | symbol
    ): PropertyDescriptor | undefined {
      if (
        !(MOD_VARIABLE_REFERENCE in target) &&
        prop === MOD_VARIABLE_REFERENCE
      ) {
        // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/defineProperty
        return { configurable: true, enumerable, writable: false };
      }

      return Reflect.getOwnPropertyDescriptor(target, prop);
    },
  });
}

export default createModVariableProxy;
