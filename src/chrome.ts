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

import { forbidContext } from "@/utils/expectContext";
import { type JsonValue } from "type-fest";
import { type UnknownObject } from "@/types";
import { foreverPendingPromise } from "@/utils";
import pTimeout from "p-timeout";

// eslint-disable-next-line prefer-destructuring -- It breaks EnvironmentPlugin
const CHROME_EXTENSION_ID = process.env.CHROME_EXTENSION_ID;
const CHROME_EXTENSION_STORAGE_KEY = "chrome_extension_id";

/**
 * A storage key managed manually (i.e., not using redux-persist).
 * @see ReduxStorageKey
 */
export type ManualStorageKey = string & {
  _manualStorageKeyBrand: never;
};

/**
 * A storage key managed by redux-persist. Should begin with the `persist:` prefix
 * @see ManualStorageKey
 */
export type ReduxStorageKey = string & {
  _reduxStorageKeyBrand: never;
};

// Used only in the app
export function setChromeExtensionId(extensionId = ""): void {
  forbidContext("extension");

  extensionId = extensionId.trim();
  if (extensionId) {
    localStorage.removeItem(CHROME_EXTENSION_STORAGE_KEY);
  } else {
    localStorage.setItem(CHROME_EXTENSION_STORAGE_KEY, extensionId);
  }
}

// Used only in the app
export function getChromeExtensionId(): string {
  forbidContext("extension");

  return (
    localStorage.getItem(CHROME_EXTENSION_STORAGE_KEY) ?? CHROME_EXTENSION_ID
  );
}

export function getExtensionVersion(): string {
  return browser.runtime.getManifest().version;
}

export class RuntimeNotFoundError extends Error {
  override name = "RuntimeNotFoundError";
}

/**
 * Read a value from Chrome storage.
 *
 * Does not support enterprise managed storage. Use `readManagedStorage` for that.
 *
 * @param storageKey the storage key
 * @param defaultValue default value to return if the key is not defined in storage. To distinguish between a missing
 * key and a value of `undefined`, pass a Symbol as the default value.
 * @param area the storage area
 * @see readManagedStorage
 */
export async function readStorage<T = unknown>(
  storageKey: ManualStorageKey,
  defaultValue?: T,
  area: "local" | "session" = "local"
): Promise<T | undefined> {
  // `browser.storage.local` is supposed to have a signature that takes an object that includes default values.
  // On Chrome 93.0.4577.63 that signature appears to return the defaultValue even when the value is set?
  // eslint-disable-next-line security/detect-object-injection -- type-checked
  const result: UnknownObject = await browser.storage[area].get(storageKey);

  if (Object.hasOwn(result, storageKey)) {
    // eslint-disable-next-line security/detect-object-injection -- Just checked with hasOwn
    return result[storageKey] as T;
  }

  return defaultValue;
}

export async function readReduxStorage<T extends JsonValue = JsonValue>(
  storageKey: ReduxStorageKey,
  defaultValue?: T
): Promise<T | undefined> {
  const value = await readStorage(storageKey as unknown as ManualStorageKey);
  if (typeof value === "string") {
    return JSON.parse(value);
  }

  if (value !== undefined) {
    console.warn("Expected JSON-stringified value for key %s", storageKey, {
      value,
    });
  }

  return defaultValue;
}

export async function setStorage(
  storageKey: ManualStorageKey,
  value: unknown,
  area: "local" | "session" = "local"
): Promise<void> {
  await browser.storage[area].set({ [storageKey]: value });
}

export async function setReduxStorage<T extends JsonValue = JsonValue>(
  storageKey: ReduxStorageKey,
  value: T
): Promise<void> {
  await browser.storage.local.set({ [storageKey]: JSON.stringify(value) });
}

export async function onTabClose(watchedTabId: number): Promise<void> {
  await new Promise<void>((resolve) => {
    const listener = (closedTabId: number) => {
      if (closedTabId === watchedTabId) {
        resolve();
        browser.tabs.onRemoved.removeListener(listener);
      }
    };

    browser.tabs.onRemoved.addListener(listener);
  });
}

/** If no update is available and downloaded yet, it will return a string explaining why */
export async function reloadIfNewVersionIsReady(): Promise<
  "throttled" | "no_update"
> {
  const status = await browser.runtime.requestUpdateCheck();
  if (status === "update_available") {
    browser.runtime.reload();

    // This should be dead code
    await pTimeout(foreverPendingPromise, {
      message: "Extension did not reload as requested",
      milliseconds: 1000,
    });
  }

  return status as "throttled" | "no_update";
}

export const SHORTCUTS_URL = "chrome://extensions/shortcuts";

type Command = "toggle-quick-bar";

/**
 * Open shortcuts tab, and automatically highlight/scroll to the specified command.
 * @param command the command to scroll to/highlight
 */
export async function openShortcutsTab({
  command = "toggle-quick-bar",
}: { command?: Command } = {}): Promise<void> {
  const description =
    // eslint-disable-next-line security/detect-object-injection -- type-checked
    browser.runtime.getManifest().commands[command]?.description;
  await browser.tabs.create({
    url: `${SHORTCUTS_URL}#:~:text=${encodeURIComponent(description)}`,
  });
}
