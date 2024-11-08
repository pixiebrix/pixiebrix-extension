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

import { getErrorMessage, onUncaughtError } from "@/errors/errorHelpers";
import { browserAction } from "@/mv3/api";

let counter = 0;
let timer: NodeJS.Timeout;

/** @param errorMessage The message to display or `null` to reset the badge */
function updateBadge(errorMessage: string | null): void {
  if (errorMessage) {
    void browserAction.setTitle({
      title: errorMessage,
    });
    void browserAction.setBadgeBackgroundColor({ color: "#F00" });
  }

  void browserAction.setBadgeText({
    text: counter ? String(counter) : "",
  });
}

function showBadgeOnBackgroundErrors(error: Error): void {
  counter++;
  if (counter > 20) {
    // If the dev tools is already open, this will pause the execution of the script
    // automatically before the browser hangs and makes it difficult to manually pause.
    // https://github.com/pixiebrix/pixiebrix-extension/issues/7430
    // eslint-disable-next-line no-debugger -- This whole file is not part of the production build
    debugger;
  }

  // Show the last error as tooltip
  updateBadge(getErrorMessage(error));

  // Reset the counter after some inactivity
  clearTimeout(timer);
  timer = setTimeout(() => {
    counter = 0;
    updateBadge(null); // Resets it
  }, 15_000);
}

if (process.env.ENVIRONMENT === "development") {
  onUncaughtError(showBadgeOnBackgroundErrors);
}
