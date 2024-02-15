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

/**
 * @file A wrapper around the browser.storage.managed that tries to smooth over its initialization quirks and provide
 * an interface for React's useExternalStore
 */

import { type ManagedStorageState } from "@/store/enterprise/managedStorageTypes";
import { isEmpty, once } from "lodash";
import { expectContext } from "@/utils/expectContext";
import pMemoize, { pMemoizeClear } from "p-memoize";
import { pollUntilTruthy } from "@/utils/promiseUtils";
import type { Nullishable } from "@/utils/nullishUtils";

// 2024-02-15: bumped to 4.5s because 2s was too short: https://github.com/pixiebrix/pixiebrix-extension/issues/7618
//   Privacy Badger uses 4.5s timeout, but thinks policy should generally be available within 2.5s. In installer.ts,
//   we check for app tabs to skip the linking wait if the user appears to be installing from the web store.
const MAX_MANAGED_STORAGE_WAIT_MILLIS = 4500;

/**
 * Interval for checking managed storage initialization that takes longer than MAX_MANAGED_STORAGE_WAIT_MILLIS seconds.
 */
let initializationInterval: Nullishable<ReturnType<typeof setTimeout>>;

/**
 * The managedStorageState, or undefined if it hasn't been initialized yet.
 */
let managedStorageSnapshot: Nullishable<ManagedStorageState>;

type ChangeListener = (state: ManagedStorageState) => void;

// TODO: Use `SimpleEventTarget` instead -- need to add functionality to clear all listeners for INTERNAL_reset
// eslint-disable-next-line local-rules/persistBackgroundData -- Functions
const changeListeners = new Set<ChangeListener>();

function notifyAllChangeListeners(
  managedStorageState: ManagedStorageState,
): void {
  for (const listener of changeListeners) {
    try {
      listener(managedStorageState);
    } catch {
      // NOP - don't let a single listener error prevent others from being notified
    }
  }
}

/**
 * Read managed storage immediately, returns {} if managed storage is unavailable/uninitialized.
 */
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

/**
 * Read managed storage immediately, returning undefined if not initialized or no policy is set.
 * @see readManagedStorageImmediately
 */
async function readPopulatedManagedStorage(): Promise<
  Nullishable<ManagedStorageState>
> {
  const values = await readManagedStorageImmediately();
  if (typeof values === "object" && !isEmpty(values)) {
    return values;
  }
}

/**
 * Watch for managed storage initialization that occurs after waitForInitialManagedStorage.
 *
 * We can't use `browser.storage.onChanged` because it doesn't fire on initialization.
 *
 * Required because other modules are using the values in managedStorageSnapshot vs. calling browser.storage.managed.get
 * directly.
 *
 * @see waitForInitialManagedStorage
 */
function watchStorageInitialization(): void {
  initializationInterval = setInterval(
    async () => {
      const values = await readPopulatedManagedStorage();
      if (values != null) {
        managedStorageSnapshot = values;
        clearInterval(initializationInterval);
        initializationInterval = undefined;
        notifyAllChangeListeners(managedStorageSnapshot);
      }
    },
    // Most likely there's no policy. So only check once every 2 seconds to not consume resources
    2000,
  );
}

// It's possible that managed storage is not available on the initial install event

// Privacy Badger does a looping check for managed storage
// - https://github.com/EFForg/privacybadger/blob/aeed0539603356a2825e7ce8472f6478abdc85fb/src/js/storage.js
// - https://github.com/EFForg/privacybadger/issues/2770#issuecomment-853329201
// - https://github.com/uBlockOrigin/uBlock-issues/issues/1660#issuecomment-880150676
// uBlock (still) contains a workaround to automatically reload the extension on initial install
// - https://github.com/gorhill/uBlock/commit/32bd47f05368557044dd3441dcaa414b7b009b39
const waitForInitialManagedStorage = pMemoize(async () => {
  // Returns undefined if the promise times out
  managedStorageSnapshot = await pollUntilTruthy<ManagedStorageState>(
    readPopulatedManagedStorage,
    {
      maxWaitMillis: MAX_MANAGED_STORAGE_WAIT_MILLIS,
    },
  );

  if (managedStorageSnapshot == null) {
    // Watch for delayed initialization
    watchStorageInitialization();
  }

  console.info("Found managed storage settings", {
    managedStorageState: managedStorageSnapshot,
  });

  // After timeout, assume there's no policy set, so assign an empty value
  managedStorageSnapshot ??= {};

  notifyAllChangeListeners(managedStorageSnapshot);

  return managedStorageSnapshot;
});

/**
 * Initialize the managed storage state once and listen for changes. Safe to call multiple times.
 */
export const initManagedStorage = once(() => {
  expectContext("extension");

  try {
    // https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/storage/onChanged
    // `onChanged` is only called when the policy changes, not on initialization
    // `browser.storage.managed.onChanged` might also exist, but it's not available in testing
    // See: https://github.com/clarkbw/jest-webextension-mock/issues/170
    browser.storage.onChanged.addListener(async (changes, area) => {
      if (area === "managed") {
        // If browser.storage.onChanged fires, it means storage must already be initialized
        if (initializationInterval) {
          clearInterval(initializationInterval);
          initializationInterval = undefined;
        }

        managedStorageSnapshot = await readManagedStorageImmediately();
        notifyAllChangeListeners(managedStorageSnapshot);
      }
    });
  } catch (error) {
    // Handle Opera: https://github.com/pixiebrix/pixiebrix-extension/issues/4069
    console.warn(
      "Not listening for managed storage changes because managed storage is not supported",
      { error },
    );
  }

  void waitForInitialManagedStorage();
});

/**
 * Read a single-value from enterprise managed storage.
 *
 * If managed storage has not been initialized yet, waits up to MAX_MANAGED_STORAGE_WAIT_MILLIS for the data to be available.
 *
 * @param key the key to read.
 * @see MAX_MANAGED_STORAGE_WAIT_MILLIS
 */
export async function readManagedStorageByKey<
  K extends keyof ManagedStorageState,
>(key: K): Promise<ManagedStorageState[K]> {
  expectContext("extension");

  if (managedStorageSnapshot != null) {
    // Safe to read snapshot because snapshot is updated via change handler
    // eslint-disable-next-line security/detect-object-injection -- type-checked key
    return managedStorageSnapshot[key];
  }

  initManagedStorage();
  const storage = await waitForInitialManagedStorage();
  // eslint-disable-next-line security/detect-object-injection -- type-checked key
  return storage[key];
}

/**
 * Read a managed storage state from enterprise managed storage.
 *
 * If managed storage has not been initialized yet, waits up to MAX_MANAGED_STORAGE_WAIT_MILLIS for the data to
 * be available.
 *
 * @see MAX_MANAGED_STORAGE_WAIT_MILLIS
 */
export async function readManagedStorage(): Promise<ManagedStorageState> {
  expectContext("extension");

  if (managedStorageSnapshot != null) {
    return managedStorageSnapshot;
  }

  initManagedStorage();
  return waitForInitialManagedStorage();
}

/**
 * Get a _synchronous_ snapshot of the managed storage state.
 * @see useManagedStorageState
 * @see readManagedStorage
 */
export function getSnapshot(): Nullishable<ManagedStorageState> {
  expectContext("extension");

  return managedStorageSnapshot;
}

/**
 * Subscribe to changes in the managed storage state.
 *
 * @param callback to receive the updated state.
 * @see useManagedStorageState
 */
export function subscribe(
  callback: (state: ManagedStorageState) => void,
): () => void {
  expectContext("extension");

  changeListeners.add(callback);

  return () => {
    changeListeners.delete(callback);
  };
}

/**
 * Helper method for resetting the module for testing.
 */
export function INTERNAL_reset(): void {
  managedStorageSnapshot = undefined;
  changeListeners.clear();
  clearInterval(initializationInterval);
  initializationInterval = undefined;
  pMemoizeClear(waitForInitialManagedStorage);
}
