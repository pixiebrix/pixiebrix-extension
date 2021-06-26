/*
 * Copyright (C) 2020 Pixie Brix, LLC
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import isEmpty from "lodash/isEmpty";
import { browser, Runtime } from "webextension-polyfill-ts";
import {
  isBackgroundPage,
  isContentScript,
  isOptionsPage,
} from "webext-detect-page";

type RequestUpdateCheckStatus = chrome.runtime.RequestUpdateCheckStatus;

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

export function isDevtoolsPage(): boolean {
  const isExtensionContext =
    typeof chrome === "object" &&
    chrome &&
    typeof chrome.extension === "object";

  if (!isExtensionContext || !chrome?.runtime?.getManifest) {
    return false;
  }

  // make sure dev tools are installed
  const { devtools_page } = chrome.runtime.getManifest();
  if (typeof devtools_page !== "string") {
    return false;
  }

  const url = new URL("devtoolsPanel.html", location.origin);

  return url.pathname === location.pathname && url.origin === location.origin;
}

export function isExtensionContext(): boolean {
  return (
    isContentScript() ||
    isOptionsPage() ||
    isBackgroundPage() ||
    isDevtoolsPage()
  );
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

/** Connect to the extension runtime and throw proper errors if it fails */
export async function runtimeConnect(name: string): Promise<Runtime.Port> {
  return new Promise((resolve, reject) => {
    const port = chrome.runtime.connect({ name });

    // If the connection fails, the error will only be available on this callback
    port.onDisconnect.addListener(() => {
      // TODO: Also handle port.error in Firefox https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/runtime/Port#type
      const message =
        chrome.runtime.lastError?.message ??
        "There was an error while connecting to the runtime";
      reject(new Error(message));
    });

    // If onDisconnect hasn't been called by now, we assume the connection succeeded. There's no port.onConnect
    setTimeout(resolve, 0, port);
  });
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

// https://developer.chrome.com/extensions/runtime#method-requestUpdateCheck
export function requestUpdateCheck(): Promise<RequestUpdateCheckStatus> {
  return new Promise((resolve, reject) => {
    chrome.runtime.requestUpdateCheck(function (
      status: RequestUpdateCheckStatus
    ) {
      if (chrome.runtime.lastError == null) {
        resolve(status);
      } else {
        reject(chrome.runtime.lastError.message);
      }
    });
  });
}
