/*
 * Copyright (C) 2022 PixieBrix, Inc.
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

import { getErrorMessage } from "@/errors/errorHelpers";
import { uncaughtErrorHandlers } from "@/telemetry/reportUncaughtErrors";

let counter = 0;
let timer: NodeJS.Timeout;

function updateBadge(errorMessage: string | null): void {
  void chrome.browserAction.setTitle({
    title: errorMessage ?? "Unknown error (no error message provided)",
  });
  void chrome.browserAction.setBadgeText({
    text: counter ? String(counter) : undefined,
  });
  void chrome.browserAction.setBadgeBackgroundColor({ color: "#F00" });
}

function backgroundErrorsBadge(_: unknown, error: unknown) {
  counter++;
  // Show the last error as tooltip
  updateBadge(getErrorMessage(error));

  // Reset the counter after a minute of inactivity
  clearTimeout(timer);
  timer = setTimeout(() => {
    counter = 0;
    updateBadge(null); // Resets it
  }, 60_000);
}

if (process.env.ENVIRONMENT === "development") {
  uncaughtErrorHandlers.push(backgroundErrorsBadge);
}
