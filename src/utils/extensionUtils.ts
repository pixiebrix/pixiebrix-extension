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

import pTimeout from "p-timeout";
import { foreverPendingPromise } from "@/utils/promiseUtils";

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

export function getExtensionVersion(): string {
  return browser.runtime.getManifest().version;
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

export class RuntimeNotFoundError extends Error {
  override name = "RuntimeNotFoundError";
}
