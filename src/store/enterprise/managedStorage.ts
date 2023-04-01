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

import { pollUntilTruthy } from "@/utils";
import { type ManagedStorageState } from "@/store/enterprise/managedStorageTypes";
import { isEmpty, once, remove } from "lodash";
import { expectContext } from "@/utils/expectContext";
import pMemoize, { pMemoizeClear } from "p-memoize";

const MAX_MANAGED_STORAGE_WAIT_MILLIS = 2000;

/**
 * The managedStorageState, or undefined if it hasn't been initialized yet.
 */
let managedStorageState: ManagedStorageState | undefined;
const listeners: Array<(state: ManagedStorageState) => void> = [];

function notifyAll(): void {
  for (const listener of listeners) {
    listener(managedStorageState);
  }
}

async function readManagedStorageImmediately(): Promise<ManagedStorageState> {
  try {
    // Get all managed storage values
    return await browser.storage.managed.get(null);
  } catch {
    // Handle Opera: https://github.com/pixiebrix/pixiebrix-extension/issues/4069
    // We don't officially support Opera, but to keep the error telemetry clean if someone installs on Opera
    return {};
  }
}

// It's possible that managed storage is not available on the initial install event
// Privacy Badger does a looping check for managed storage
// - https://github.com/EFForg/privacybadger/blob/aeed0539603356a2825e7ce8472f6478abdc85fb/src/js/storage.js
// - https://github.com/EFForg/privacybadger/issues/2770#issuecomment-853329201
// - https://github.com/uBlockOrigin/uBlock-issues/issues/1660#issuecomment-880150676
// uBlock (still) contains a workaround to automatically reload the extension on initial install
// - https://github.com/gorhill/uBlock/commit/32bd47f05368557044dd3441dcaa414b7b009b39
const waitForInitialManagedStorage = pMemoize(async () => {
  managedStorageState = await pollUntilTruthy<ManagedStorageState>(
    async () => {
      const values = await readManagedStorageImmediately();
      if (typeof values === "object" && !isEmpty(values)) {
        return values;
      }
    },
    {
      maxWaitMillis: MAX_MANAGED_STORAGE_WAIT_MILLIS,
    }
  );

  if (managedStorageState) {
    console.info("Read managed storage settings", {
      managedStorageState,
    });
  } else {
    console.info("No manual storage settings found", {
      managedStorageState,
    });
  }

  notifyAll();

  return managedStorageState;
});

/**
 * Read a single-value from enterprise managed storage.
 * @param key the key to read.
 */
export async function readManagedStorageByKey<
  K extends keyof ManagedStorageState
>(key: K): Promise<ManagedStorageState[K]> {
  expectContext("extension");

  if (managedStorageState != null) {
    // eslint-disable-next-line security/detect-object-injection -- type-checked key
    return managedStorageState[key];
  }

  initManagedStorage();
  const storage = (await waitForInitialManagedStorage()) ?? {};
  // eslint-disable-next-line security/detect-object-injection -- type-checked key
  return storage[key];
}

/**
 * Read a managed storage state from enterprise managed storage.
 */
export async function readManagedStorage(): Promise<ManagedStorageState> {
  expectContext("extension");

  if (managedStorageState != null) {
    return managedStorageState;
  }

  initManagedStorage();
  return (await waitForInitialManagedStorage()) ?? {};
}

/**
 * Get a synchronous snapshot of the managed storage state.
 * @see useSyncManagedStorage
 */
export function getSnapshot(): ManagedStorageState | undefined {
  expectContext("extension");

  return managedStorageState;
}

/**
 * Subscribe to changes in the managed storage state. In practice, this should only fire once because managed
 * storage is not mutable.
 * @param callback to receive the updated state.
 * @see useSyncManagedStorage
 */
export function subscribe(
  callback: (state: ManagedStorageState) => void
): () => void {
  expectContext("extension");

  listeners.push(callback);

  return () => {
    remove(listeners, (x) => x === callback);
  };
}

/**
 * Helper method for resetting the module for testing.
 */
export function INTERNAL_reset(): void {
  managedStorageState = undefined;
  listeners.splice(0, listeners.length);
  pMemoizeClear(waitForInitialManagedStorage);
}

/**
 * Initialize the managed storage state and listen for changes. Safe to call multiple times.
 */
export const initManagedStorage = once(() => {
  expectContext("extension");

  try {
    // https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/storage/onChanged
    // `browser.storage.managed.onChanged` might also exist, but it's not available in testing
    // See: https://github.com/clarkbw/jest-webextension-mock/issues/170
    browser.storage.onChanged.addListener(async (changes, area) => {
      if (area === "managed") {
        managedStorageState = await readManagedStorageImmediately();
        notifyAll();
      }
    });
  } catch (error) {
    // Handle Opera: https://github.com/pixiebrix/pixiebrix-extension/issues/4069
    console.warn(
      "Not listening for managed storage changes because managed storage is not supported",
      { error }
    );
  }

  void waitForInitialManagedStorage();
});
