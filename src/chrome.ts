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

type RequestUpdateCheckStatus = chrome.runtime.RequestUpdateCheckStatus;

export const CHROME_EXTENSION_STORAGE_KEY = "chrome_extension_id";
const CHROME_EXTENSION_ID = process.env.CHROME_EXTENSION_ID;

type StorageLocation = "local" | "sync";

export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthenticationError";
  }
}

export class RequestError extends Error {
  readonly response: unknown;

  constructor(message: string, response: unknown) {
    super(message);
    this.name = "RequestError";
    this.response = response;
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
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
  if (!isEmpty(manualKey ?? "")) {
    return manualKey;
  } else if (!CHROME_EXTENSION_ID) {
    throw new Error("CHROME_EXTENSION_ID not configured during build");
  } else {
    return CHROME_EXTENSION_ID;
  }
}

export class RuntimeNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RuntimeNotFoundError";
  }
}

export async function getAuthToken(): Promise<string> {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive: true }, function (
      token: string
    ) {
      if (chrome.runtime.lastError == null) {
        resolve(token);
      } else {
        reject(chrome.runtime.lastError.message);
      }
    });
  });
}

export function readStorage<T>(
  storageKey: string,
  storageType: StorageLocation = "local"
): Promise<T> {
  return new Promise((resolve, reject) => {
    chrome.storage[storageType].get(storageKey, function (result) {
      if (chrome.runtime.lastError == null) {
        resolve(result[storageKey]);
      } else {
        reject(chrome.runtime.lastError.message);
      }
    });
  });
}

export function readAllStorage(
  storageType: StorageLocation = "local"
): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    chrome.storage[storageType].get(null, function (result) {
      if (chrome.runtime.lastError == null) {
        resolve(result);
      } else {
        reject(chrome.runtime.lastError.message);
      }
    });
  });
}

export function setStorage(
  storageKey: string,
  value: string,
  storageType: StorageLocation = "local"
): Promise<void> {
  if (typeof value !== "string") {
    throw new Error("Expected string value");
  }
  return new Promise((resolve, reject) => {
    chrome.storage[storageType].set({ [storageKey]: value }, function () {
      if (chrome.runtime.lastError != null) {
        reject(chrome.runtime.lastError.message);
      } else {
        // console.trace(`Stored ${storageKey}`, value);
        resolve();
      }
    });
  });
}

export function openOptions(): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.runtime.openOptionsPage(function () {
      if (chrome.runtime.lastError == null) {
        resolve();
      } else {
        reject(chrome.runtime.lastError.message);
      }
    });
  });
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

export function containsPermissions(
  permissions?: string[],
  origins?: string[]
): Promise<boolean> {
  return new Promise((resolve, reject) => {
    chrome.permissions.contains(
      {
        permissions,
        origins,
      },
      (result) => {
        if (chrome.runtime.lastError != null) {
          reject(chrome.runtime.lastError.message);
        } else {
          resolve(result);
        }
      }
    );
  });
}

export function requestPermissions(
  permissions?: string[],
  origins?: string[]
): Promise<boolean> {
  return new Promise((resolve, reject) => {
    chrome.permissions.request(
      {
        permissions,
        origins,
      },
      (granted) => {
        if (chrome.runtime.lastError != null) {
          reject(chrome.runtime.lastError.message);
        } else {
          resolve(granted);
        }
      }
    );
  });
}
