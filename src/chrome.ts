/*
 * Copyright (C) 2021 PixieBrix, Inc.
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

import isEmpty from "lodash/isEmpty";
import pDefer from "p-defer";
import pTimeout from "p-timeout";
import { browser, Runtime } from "webextension-polyfill-ts";
import { forbidBackgroundPage } from "./utils/expectContext";

export const CHROME_EXTENSION_STORAGE_KEY = "chrome_extension_id";
const CHROME_EXTENSION_ID = process.env.CHROME_EXTENSION_ID;

type StorageLocation = "local" | "sync";

export class RequestError extends Error {
  readonly response: unknown;

  constructor(message: string, response: unknown) {
    super(message);
    this.name = "RequestError";
    this.response = response;
  }
}

export function isBrowserActionPanel(): boolean {
  const isExtensionContext =
    typeof chrome === "object" &&
    chrome &&
    typeof chrome.extension === "object";

  if (!isExtensionContext) {
    return false;
  }

  const url = new URL("action.html", location.origin);

  return url.pathname === location.pathname && url.origin === location.origin;
}

export function setChromeExtensionId(extensionId: string): void {
  if (isEmpty(extensionId)) {
    localStorage.removeItem(CHROME_EXTENSION_STORAGE_KEY);
  } else {
    localStorage.setItem(CHROME_EXTENSION_STORAGE_KEY, extensionId);
  }
}

export function getChromeExtensionId(): string {
  const manualKey = localStorage.getItem(CHROME_EXTENSION_STORAGE_KEY);
  return isEmpty(manualKey ?? "") ? CHROME_EXTENSION_ID : manualKey;
}

/**
 * Connect to the background page and throw real errors if the connection fails.
 * NOTE: To determine whether the connection was successful, the background page
 * needs to send one message back within a second.
 * */
export async function runtimeConnect(name: string): Promise<Runtime.Port> {
  forbidBackgroundPage();

  const { resolve, reject, promise: connectionPromise } = pDefer();

  const onDisconnect = () => {
    // If the connection fails, the error will only be available on this callback
    // TODO: Also handle port.error in Firefox https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/runtime/Port#type
    const message =
      chrome.runtime.lastError?.message ??
      "There was an error while connecting to the runtime";
    reject(new Error(message));
  };

  const port = browser.runtime.connect(null, { name });
  port.onMessage.addListener(resolve); // Any message is accepted
  port.onDisconnect.addListener(onDisconnect);

  try {
    // The timeout is to avoid hanging if the background isn't set up to respond immediately
    await pTimeout(
      connectionPromise,
      1000,
      "The background page hasn’t responded in time"
    );
    return port;
  } finally {
    port.onMessage.removeListener(resolve);
    port.onDisconnect.removeListener(onDisconnect);
  }
}

export class RuntimeNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RuntimeNotFoundError";
  }
}

/**
 * @deprecated use browser.storage directly
 */
export async function readStorage<T>(
  storageKey: string,
  storageType: StorageLocation = "local"
): Promise<T> {
  const result = await browser.storage[storageType].get(storageKey);
  return result[storageKey];
}

/**
 * @deprecated use browser.storage directly
 */
export async function setStorage(
  storageKey: string,
  value: string,
  storageType: StorageLocation = "local"
): Promise<void> {
  if (typeof value !== "string") {
    throw new TypeError("Expected string value");
  }

  await browser.storage[storageType].set({ [storageKey]: value });
}
