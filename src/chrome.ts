import {
  HTTP_REQUEST_POST,
  HTTP_REQUEST,
  NOTIFICATION_CREATE,
} from "@/messaging/constants";
// @ts-ignore: babel/plugin-transform-typescript doesn't support the import = syntax
import chromeNamespace from "chrome";

import isEmpty from "lodash/isEmpty";
import { AxiosRequestConfig } from "axios";

type RequestUpdateCheckStatus = chromeNamespace.runtime.RequestUpdateCheckStatus;
type NotificationOptions = chromeNamespace.notifications.NotificationOptions;

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
  readonly response: any;

  constructor(message: string, response: any) {
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

/**
 * Send a message from the web app to the Chrome extension.
 */
export function messageExtension(payload: unknown): Promise<unknown> {
  const extensionId = getChromeExtensionId();

  if (chrome.runtime == null) {
    throw new RuntimeNotFoundError(
      "chrome.runtime is undefined; is extension externally_connectable?"
    );
  } else if (isEmpty(extensionId)) {
    throw new Error("Could not find chrome extension id");
  }

  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(extensionId, payload, function (response) {
      if (chrome.runtime.lastError == null) {
        resolve(response);
      } else {
        reject(chrome.runtime.lastError.message);
      }
    });
  });
}

export async function getAuthToken(): Promise<string> {
  return new Promise((resolve) => {
    chrome.identity.getAuthToken({ interactive: true }, function (
      token: string
    ) {
      resolve(token);
    });
  });
}

export function readStorage(
  storageKey: string,
  storageType: StorageLocation = "local"
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    chrome.storage[storageType].get(storageKey, function (result) {
      if (chrome.runtime.lastError == null) {
        // console.trace(`Read ${storageKey} from storage`, result);
        resolve(result[storageKey]);
      } else {
        reject(chrome.runtime.lastError.message);
      }
    });
  });
}

export function readAllStorage(
  storageType: StorageLocation = "local"
): Promise<object> {
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
  value: any,
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

export function messageBackgroundScript(
  type: string,
  payload: object = {}
): Promise<any> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type, payload }, function (response) {
      if (chrome.runtime.lastError != null) {
        reject(chrome.runtime.lastError.message);
      } else if (
        typeof response === "object" &&
        response.hasOwnProperty("error") &&
        response.error
      ) {
        console.debug("Got error from background script", { response });
        switch (response.statusCode) {
          case 404: {
            reject(new NotFoundError("URL/resource was not found"));
            return;
          }
          case 403: {
            reject(
              new AuthenticationError(
                "Error authenticating with remote service"
              )
            );
            return;
          }
          default: {
            reject(new RequestError("Request error", response));
            return;
          }
        }
      } else {
        resolve(response);
      }
    });
    if (chrome.runtime.lastError != null) {
      reject(chrome.runtime.lastError.message);
    }
  });
}

/**
 * https://developer.chrome.com/extensions/notifications#method-create
 */
export async function sendNotification(
  notificationOptions: NotificationOptions
): Promise<{ id: any }> {
  return await messageBackgroundScript(
    NOTIFICATION_CREATE,
    notificationOptions
  );
}

/**
 * Make an HTTP request from the background page.
 * @param requestConfig https://github.com/axios/axios#request-config
 */
export async function safeRequest(
  requestConfig: AxiosRequestConfig
): Promise<unknown> {
  return await messageBackgroundScript(HTTP_REQUEST, requestConfig);
}

export async function safePOST(
  url: string,
  data: object,
  params: { [key: string]: string | string[] } = {}
): Promise<unknown> {
  return await messageBackgroundScript(HTTP_REQUEST_POST, {
    url,
    data,
    params,
  });
}
