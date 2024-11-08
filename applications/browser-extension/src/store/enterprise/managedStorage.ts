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

import { type ManagedStorageState } from "./managedStorageTypes";
import { isEmpty, once } from "lodash";
import { expectContext } from "../../utils/expectContext";
import pMemoize, { pMemoizeClear } from "p-memoize";
import { pollUntilTruthy } from "../../utils/promiseUtils";
import { SimpleEventTarget } from "../../utils/SimpleEventTarget";
import type { Nullishable } from "../../utils/nullishUtils";
import { mergeSignals, ReusableAbortController } from "abort-utils";
import { StorageItem } from "webext-storage";
import type { Timestamp } from "../../types/stringTypes";
import { PromiseCancelled } from "@/errors/genericErrors";
import { nowTimestamp } from "../../utils/timeUtils";

// 1.8.9: bumped to 4.5s because 2s was too short: https://github.com/pixiebrix/pixiebrix-extension/issues/7618
//   Privacy Badger uses 4.5s timeout, but thinks policy should generally be available within 2.5s. In installer.ts,
//   skip waiting for managed storage before linking the Extension if the user appears to be installing from the CWS.
const MAX_MANAGED_STORAGE_WAIT_MILLIS = 4500;

/**
 * The managedStorageState, or undefined if it hasn't been initialized yet.
 */
let managedStorageSnapshot: Nullishable<ManagedStorageState>;

// Used only for testing
const controller = new ReusableAbortController();

/**
 * The initialization timestamp of managed storage, or null/undefined if it hasn't been initialized yet for the
 * current browser session. Available from all extension contexts.
 *
 * Uses StorageItem instead of SessionValue in order to be available to all extension contexts. The background
 * script clears the timestamp on session startup. After the switchover to MV3 can use SessionValue directly.
 *
 * Introduced to avoid waiting MAX_MANAGED_STORAGE_WAIT_MILLIS on every page.
 *
 * @see initManagedStorageOncePerSession
 * @since 1.8.10
 * @internal
 */
export const initializationTimestamp = new StorageItem<Timestamp>(
  "managedStorageInitTimestamp",
);

/**
 * Event for managed storage state changes. Also emitted when managed storage is initialized.
 */
export const managedStorageStateChange =
  new SimpleEventTarget<ManagedStorageState>();

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
 * Clear the initializationTimestamp. For use in background script installer.
 *
 * After switchover to MV3, won't be required if we switch initializationTimestamp to in-memory session storage, because
 * session storage is automatically reset across browser sessions.
 */
export async function resetInitializationTimestamp(): Promise<void> {
  expectContext(
    "background",
    "Should only be called from background session initialization code",
  );
  await initializationTimestamp.remove();
}

/**
 * Background method to watch for managed storage initialization that takes longer than MAX_MANAGED_STORAGE_WAIT_MILLIS.
 *
 * We can't use `browser.storage.onChanged` because it doesn't fire on initialization.
 *
 * Required because other modules are using the values in managedStorageSnapshot vs. calling browser.storage.managed.get
 * directly, so we need to ensure `managedStorageSnapshot` contains the values of manages storage.
 *
 * @see waitForInitialManagedStorage
 */
export async function watchForDelayedStorageInitialization(): Promise<void> {
  expectContext(
    "background",
    "Should only be called from background session initialization code",
  );

  let values = await readPopulatedManagedStorage();

  if (values != null) {
    // NOP - already initialized
    return;
  }

  // Abort on managed storage change, because change indicates that managed storage must be initialized
  const changeController = new AbortController();
  browser.storage.onChanged.addListener(async (_changes, area) => {
    if (area === "managed") {
      changeController.abort();
    }
  });

  try {
    values = await pollUntilTruthy(readPopulatedManagedStorage, {
      signal: mergeSignals(changeController.signal, controller.signal),
      // If `waitForInitialManagedStorage` didn't find a policy, then there's most likely no policy.
      // So only check once every 2.5 seconds to not consume resources
      intervalMillis: 2500,
    });
  } catch {
    // NOP - most likely was aborted. managedStorageSnapshot will get set by change handler
  }

  if (values != null) {
    managedStorageSnapshot = values;
    managedStorageStateChange.emit(managedStorageSnapshot);
  }
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
    // The extension has waited already this session in another context (typically the background worker)
    console.debug(
      "Managed storage has already been awaited in this session, reading managed storage immediately",
    );
    managedStorageSnapshot = await readManagedStorageImmediately();
  } else {
    console.debug(
      `Managed storage not awaited yet, polling for ${MAX_MANAGED_STORAGE_WAIT_MILLIS}ms`,
    );

    // Controller that observes initializationTimestamp to see if another context finished waiting in order
    // to quit waiting early. For example:
    // 1. Background worker starts waiting
    // 2. Extension Console starts waiting
    // 3. Background worker finishes waiting and sets initializationTimestamp
    // 4. Abort signal fires, enabling Extension Console to quit waiting early
    const initializedController = new AbortController();

    initializationTimestamp.onChanged(() => {
      initializedController.abort(new PromiseCancelled());
    }, initializedController.signal);

    try {
      managedStorageSnapshot = await pollUntilTruthy<
        Nullishable<ManagedStorageState>
      >(readPopulatedManagedStorage, {
        maxWaitMillis: MAX_MANAGED_STORAGE_WAIT_MILLIS,
        signal: mergeSignals(initializedController.signal, controller.signal),
      });

      if (managedStorageSnapshot == null) {
        // `pollUntilTruthy` returns undefined after maxWaitMillis. After timeout, assume there's no policy set
        console.info(
          "Managed storage initialization timed out, assuming no policy set",
        );
        managedStorageSnapshot = {};
      } else {
        console.debug("Found managed storage settings", {
          managedStorageSnapshot,
        });
      }
    } catch (error) {
      if (error instanceof PromiseCancelled) {
        managedStorageSnapshot = await readManagedStorageImmediately();
      } else {
        throw error;
      }
    }

    // Set timestamp so other callsites know they don't have to wait again. OK to set multiple times
    await initializationTimestamp.set(nowTimestamp());
  }

  managedStorageStateChange.emit(managedStorageSnapshot);

  return managedStorageSnapshot;
});

// Unlike initManagedStorage it's fine to use lodash `once` here because our test fakes don't support managed storage
// change events. If we are testing listener behavior, we'd need a way to remove the listener, etc.
const tryAddListenerOnce = once(() => {
  try {
    // https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/storage/onChanged
    // `onChanged` is only called when the policy changes, not on initialization
    // `browser.storage.managed.onChanged` might also exist, but it's not available in testing
    // See: https://github.com/clarkbw/jest-webextension-mock/issues/170
    browser.storage.onChanged.addListener(
      async (changes, area) => {
        if (area === "managed") {
          // If browser.storage.onChanged fires, it means storage must already be initialized
          managedStorageSnapshot = await readManagedStorageImmediately();
          managedStorageStateChange.emit(managedStorageSnapshot);
        }
      },
      // `browser.storage.onChanged` does not support an abort signal, despite what the Typescript types say
      // https://developer.chrome.com/docs/extensions/reference/api/storage#event-onChanged
      // { signal: controller.signal },
    );
  } catch (error) {
    // Handle Opera: https://github.com/pixiebrix/pixiebrix-extension/issues/4069
    console.warn("Managed storage is not supported in your browser", { error });
  }
});

/**
 * Initialize the managed storage state once and listen for changes. Safe to call multiple times.
 */
// Use pMemoize instead of use lodash `once` because there's no simple way to clear the state of lodash `once`. Using
// pMemoize here the method will re-run if there's an exception vs. returning the rejected promise
export const initManagedStorage = pMemoize(async () => {
  expectContext("extension");

  // `tryAddListenerOnce` wraps the listener code in `once` so it's not re-added if waitForInitialManagedStorage
  // throws an error. (initManagedStorage is not memoizing promise rejections with pMemoize)
  tryAddListenerOnce();

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
 * Helper method for resetting the module for testing.
 * @internal
 */
export async function INTERNAL_reset(): Promise<void> {
  controller.abortAndReset(new PromiseCancelled("Internal test cleanup"));
  managedStorageSnapshot = undefined;
  pMemoizeClear(initManagedStorage);
  pMemoizeClear(waitForInitialManagedStorage);
  await resetInitializationTimestamp();
}
