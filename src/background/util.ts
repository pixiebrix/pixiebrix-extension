/*
 * Copyright (C) 2021 Pixie Brix, LLC
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

import { isBackgroundPage } from "webext-detect-page";
import { browser } from "webextension-polyfill-ts";
import { getAdditionalPermissions } from "webext-additional-permissions";
import { patternToRegex } from "webext-patterns";
import * as contentScriptProtocol from "@/contentScript/devTools";
import { isErrorObject, sleep } from "@/utils";

export type Target = {
  tabId: number;
  frameId: number;
  url: string;
};

export async function testTabPermissions(target: Target): Promise<boolean> {
  if (!isBackgroundPage()) {
    throw new Error(
      "hasTabPermissions can only be called from the background page"
    );
  }

  try {
    // can't use browser.permissions.contains for permissions because it doesn't seem to work with activeTab
    await browser.tabs.executeScript(target.tabId, {
      allFrames: false,
      frameId: target.frameId ?? 0,
      code: "true;",
      runAt: "document_start",
    });
    return true;
  } catch (error: unknown) {
    if (!isErrorObject(error) || !/Cannot access/.test(error.message)) {
      console.warn("testTabPermissions failed", { error });
    }
  }
  return false;
}

export async function waitReady(
  target: Target,
  { maxWaitMillis }: { maxWaitMillis: number }
): Promise<void> {
  const start = Date.now();
  do {
    const { ready } = await contentScriptProtocol.isInstalled(target);
    if (ready) {
      return;
    }
    await sleep(150);
  } while (Date.now() - start < maxWaitMillis);
  throw new Error(`contentScript not ready in ${maxWaitMillis}ms`);
}

/** Checks whether a URL has permanent permissions and therefore whether `webext-dynamic-content-scripts` already registered the scripts */
export async function isContentScriptRegistered(url: string): Promise<boolean> {
  const { permissions } = await getAdditionalPermissions({
    strictOrigins: false,
  });

  return patternToRegex(...permissions).test(url);
}

/** Checks whether a tab has the activeTab permission to inject scripts and CSS */
export async function isActiveTab(
  tabId: number,
  frameId = 0
): Promise<boolean> {
  return browser.tabs.insertCSS(tabId, { code: "@media {}", frameId }).then(
    () => true,
    () => false
  );
}

/**
 * Inject a contentScript into a page if the contentScript is not already available on the page
 * @param target the tab frame to inject the contentScript into
 * @param file the contentScript file
 * @return true if the content script was injected
 */
export async function injectContentScript(target: Target): Promise<boolean> {
  if (!isBackgroundPage()) {
    throw new Error(
      "injectContentScript can only be called from the background page"
    );
  }

  // Already has permanent access
  if (await isContentScriptRegistered(target.url)) {
    return;
  }

  // Has temporary access
  if (!(await isActiveTab(target.tabId, target.frameId))) {
    console.debug(
      `Skipping content script injection because no activeTab permissions for tab: ${target.tabId}`
    );
    return;
  }

  const { installed } = await contentScriptProtocol.isInstalled(target);

  if (!installed) {
    console.debug(
      `Injecting devtools contentScript for tab ${target.tabId}, frame ${
        target.frameId ?? 0
      }`
    );

    // inject in the top-level frame
    console.log("injectContentScript");

    await browser.tabs.executeScript(target.tabId, {
      frameId: target.frameId ?? 0,
      allFrames: false,
      file: "contentScript.js",
      runAt: "document_end",
    });

    return true;
  } else {
    console.debug(
      `contentScript already installed on tab ${target.tabId}, frame ${
        target.frameId ?? 0
      }`
    );
    return false;
  }
}

/**
 * Some pages are off-limits to extension. This function can find out if an error is due to this limitation.
 *
 * Example error messages:
 * Cannot access a chrome:// URL
 * Cannot access a chrome-extension:// URL of different extension
 * Cannot access contents of url "chrome-extension://mpjjildhmpddojocokjkgmlkkkfjnepo/options.html#/". Extension manifest must request permission to access this host.
 * The extensions gallery cannot be scripted.
 *
 * @param error
 * @returns
 */
export async function isPrivatePageError(error: unknown): Promise<boolean> {
  return (
    isErrorObject(error) &&
    /cannot be scripted|(chrome|about|extension):\/\//.test(error.message)
  );
}
