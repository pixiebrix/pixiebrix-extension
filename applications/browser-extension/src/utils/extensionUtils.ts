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

import pTimeout from "p-timeout";
import { foreverPendingPromise } from "@/utils/promiseUtils";
import { type Promisable } from "type-fest";
import { isScriptableUrl } from "webext-content-scripts";
import { type Runtime } from "webextension-polyfill";
import { type SemVerString } from "@/types/registryTypes";
import { normalizeSemVerString } from "@/types/semVerHelpers";

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
    browser.runtime.getManifest().commands?.[command]?.description;
  const hash = description ? `#:~:text=${encodeURIComponent(description)}` : "";
  await browser.tabs.create({
    url: SHORTCUTS_URL + hash,
  });
}

/**
 * Returns an absolute URL for a page in the Extension Console.
 *
 * Use as an alternative to `browser.runtime.getURL("options.html")`
 *
 * The Extension Console uses a hash router, e.g.:
 *
 *   chrome-extension://mpjjildhmpddojocokjkgmlkkkfjnepo/options.html#/workshop
 *
 * @param page an optional route to include in the link
 */
export function getExtensionConsoleUrl(page?: string): string {
  // eslint-disable-next-line no-restricted-syntax -- The rule points to this function
  const raw = browser.runtime.getURL("options.html");

  if (!page || ["", "/"].includes(page)) {
    return raw;
  }

  // Use URL() to escape the hash part of the URL correctly
  const url = new URL(raw);
  url.hash = page.startsWith("/") ? page : `/${page}`;
  return url.href;
}

/**
 * Gets the Extension version from the manifest and normalizes it to a valid semver string.
 * @since 1.8.13, the Extension version is a four part format x.x.x.x
 * This allows us to publish pre-release versions to the CWS, especially the BETA listing
 * Each version published in CWS must have a unique version number
 *
 * @see manifest.mjs:getVersion()
 *
 * TODO: Add linting rule to prefer getExtensionVersion over browser.runtime.getManifest().version
 *  @see https://github.com/pixiebrix/pixiebrix-extension/issues/8349
 *
 * @returns the version of the Extension in valid semver format (x.x.x)
 */
export function getExtensionVersion(): SemVerString {
  return normalizeSemVerString(browser.runtime.getManifest().version, {
    coerce: true,
  });
}

/** If no update is available and downloaded yet, it will return a string explaining why */
export async function reloadIfNewVersionIsReady(): Promise<Runtime.RequestUpdateCheckStatus> {
  const [status] = await browser.runtime.requestUpdateCheck();

  if (status === "update_available") {
    browser.runtime.reload();

    // This should be dead code
    await pTimeout(foreverPendingPromise, {
      message: "Extension did not reload as requested",
      milliseconds: 1000,
    });
  }

  return status;
}

export class RuntimeNotFoundError extends Error {
  override name = "RuntimeNotFoundError";
}

export async function getTabsWithAccess(): Promise<
  Array<{ tabId: number; url: string }>
> {
  const tabs = await browser.tabs.query({
    url: ["*://*/*"],
    discarded: false,
  });
  return (
    tabs
      .filter((tab) => isScriptableUrl(tab.url))
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- The type isn't tight enough for tabs.query()
      .map((tab) => ({ tabId: tab.id!, url: tab.url! }))
  );
}

/**
 * Runs a callback for each tab the extension has access to
 */
export async function forEachTab<
  TCallback extends (target: {
    tabId: number;
    url: string;
  }) => Promisable<unknown>,
>(
  callback: TCallback,
  options?: { exclude: number },
): Promise<Array<PromiseSettledResult<unknown>>> {
  const tabs = await getTabsWithAccess();

  if (tabs.length > 20) {
    console.warn("forEachTab called on more than 20");
  }

  const promises = tabs
    .filter(({ tabId }) => tabId !== options?.exclude)
    .map(({ tabId, url }) => callback({ tabId, url }));

  // TODO: Probably integrate `allSettled` error handling into
  // `forEachTab` to preserve its ease of use and the warning.
  // eslint-disable-next-line no-restricted-syntax -- Allowed for now
  return Promise.allSettled(promises);
}
