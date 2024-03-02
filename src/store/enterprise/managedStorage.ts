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
import { SimpleEventTarget } from "@/utils/SimpleEventTarget";
import type { Nullishable } from "@/utils/nullishUtils";
import { RepeatableAbortController } from "abort-utils";
import { StorageItem } from "webext-storage";
import type { Timestamp } from "@/types/stringTypes";
import { PromiseCancelled } from "@/errors/genericErrors";

// 1.8.9: bumped to 4.5s because 2s was too short: https://github.com/pixiebrix/pixiebrix-extension/issues/7618
//   Privacy Badger uses 4.5s timeout, but thinks policy should generally be available within 2.5s. In installer.ts,
//   skip waiting for managed storage before linking the Extension if the user appears to be installing from the CWS.
const MAX_MANAGED_STORAGE_WAIT_MILLIS = 4500;

/**
 * Interval for checking managed storage initialization that takes longer than MAX_MANAGED_STORAGE_WAIT_MILLIS seconds.
 */
let initializationInterval: ReturnType<typeof setTimeout> | undefined;

/**
 * The managedStorageState, or undefined if it hasn't been initialized yet.
 */
let managedStorageSnapshot: Nullishable<ManagedStorageState>;

// Used only for testing
const controller = new RepeatableAbortController();

/**
 * The initialization timestamp of managed storage, or null/undefined if it hasn't been initialized yet for the
 * current browser session. Introduced to avoid waiting MAX_MANAGED_STORAGE_WAIT_MILLIS on every page.
 *
 * Currently, using StorageItem because it's compatible with MV2 and MV3. After the switchover to MV3 can use
 * in-memory session storage directly.
 *
 * @since 1.8.10
 */
const initializationTimestamp = new StorageItem<Timestamp>(
  "managedStorageInitTimestamp",
);

const manageStorageStateChanges = new SimpleEventTarget<ManagedStorageState>();

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
export async function watchDelayedStorageInitialization(): Promise<void> {
  expectContext("background");

  const values = await readPopulatedManagedStorage();

  if (values != null) {
    // Already initialized
    return;
  }

  // Use setInterval instead of pollUntilTruthy to clear on browser.storage.onChanged. pollUntilTruthy doesn't
  // currently directly support an abort signal.
  initializationInterval = setInterval(
    async () => {
      const values = await readPopulatedManagedStorage();
      if (values != null) {
        managedStorageSnapshot = values;

        if (initializationInterval) {
          clearInterval(initializationInterval);
          initializationInterval = undefined;
        }

        manageStorageStateChanges.emit(managedStorageSnapshot);
      }
    },
    // Most likely there's no policy. So only check once every 2.5 seconds to not consume resources
    2500,
  );
}

// It's possible that managed storage is not available on the initial installation event

// Privacy Badger does a looping check for managed storage
// - https://github.com/EFForg/privacybadger/blob/aeed0539603356a2825e7ce8472f6478abdc85fb/src/js/storage.js
// - https://github.com/EFForg/privacybadger/issues/2770#issuecomment-853329201
// - https://github.com/uBlockOrigin/uBlock-issues/issues/1660#issuecomment-880150676
// uBlock (still) contains a workaround to automatically reload the extension on initial install
// - https://github.com/gorhill/uBlock/commit/32bd47f05368557044dd3441dcaa414b7b009b39
const waitForInitialManagedStorage = pMemoize(async () => {
  if (await initializationTimestamp.get()) {
    // The extension has waited already this session, so don't wait again
    console.debug("Managed storage already initialized this session");
    managedStorageSnapshot = (await readManagedStorageImmediately()) ?? {};
  } else {
    console.debug(
      `Managed storage not initialized yet, polling for ${MAX_MANAGED_STORAGE_WAIT_MILLIS}ms`,
    );
    const waitController = new AbortController();
    // Skip polling if it becomes initialized while waiting
    initializationTimestamp.onChanged(
      waitController.abort,
      waitController.signal,
    );

    try {
      managedStorageSnapshot = await pollUntilTruthy<
        Nullishable<ManagedStorageState>
      >(readPopulatedManagedStorage, {
        maxWaitMillis: MAX_MANAGED_STORAGE_WAIT_MILLIS,
        signal: waitController.signal,
      });

      // `pollUntilTruthy` returns undefined after maxWaitMillis. After timeout, assume there's no policy set,
      // so assign an empty value
      managedStorageSnapshot ??= {};

      console.info("Found managed storage settings", {
        managedStorageSnapshot,
      });
    } catch (error) {
      if (error instanceof PromiseCancelled) {
        managedStorageSnapshot = (await readManagedStorageImmediately()) ?? {};
      } else {
        throw error;
      }
    }

    // Set timestamp so other callsites know they don't have to wait again
    await initializationTimestamp.set(new Date().toISOString() as Timestamp);
  }

  manageStorageStateChanges.emit(managedStorageSnapshot);

  return managedStorageSnapshot;
});

/**
 * Initialize the managed storage state once and listen for changes. Safe to call multiple times.
 */
export const initManagedStorage = once(async () => {
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
        manageStorageStateChanges.emit(managedStorageSnapshot);
      }
    });
  } catch (error) {
    // Handle Opera: https://github.com/pixiebrix/pixiebrix-extension/issues/4069
    console.warn(
      "Not listening for managed storage changes because managed storage is not supported",
      { error },
    );
  }

  await waitForInitialManagedStorage();
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

  void initManagedStorage();
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

  void initManagedStorage();
  return waitForInitialManagedStorage();
}

/**
 * Returns true if managed storage has been initialized.
 * @see waitForInitialManagedStorage
 */
export function isInitialized(): boolean {
  return managedStorageSnapshot != null;
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

  manageStorageStateChanges.add(callback);

  return () => {
    manageStorageStateChanges.remove(callback);
  };
}

/**
 * Clear the initializationTimestamp. For use in onStartup in the background script.
 *
 * After switchover to MV3, won't be required if we switch initializationTimestamp to in-memory session storage, because
 * that's automatically reset across browser sessions.
 */
export async function resetInitializationTimestamp(): Promise<void> {
  expectContext("background");
  await initializationTimestamp.remove();
}

/**
 * Helper method for resetting the module for testing.
 */
export async function INTERNAL_reset(): Promise<void> {
  controller.abortAndReset();
  managedStorageSnapshot = undefined;

  clearInterval(initializationInterval);
  initializationInterval = undefined;

  pMemoizeClear(waitForInitialManagedStorage);
  await resetInitializationTimestamp();
}
