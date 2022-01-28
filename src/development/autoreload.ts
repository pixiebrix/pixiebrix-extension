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

import { isChrome } from "webext-detect-page";

// In Chrome, `web-ext run` reloads the extension without reloading the manifest.
// This forces a full reload if the version hasn't changed since the last run.
if (
  process.env.ENVIRONMENT === "development" &&
  isChrome() &&
  "localStorage" in globalThis // MV3 doesn't support localStorage
) {
  const { version_name } = chrome.runtime.getManifest();

  if (localStorage.getItem("dev:last-version") === version_name) {
    // Removing the key ensures that it does not go into a reloading loop
    // by making the above condition false after the reload
    localStorage.removeItem("dev:last-version");
    chrome.runtime.reload();
  }

  // Chrome only calls this function if the extension is reloaded
  chrome.runtime.onInstalled.addListener(({ reason }) => {
    if (reason === "update") {
      localStorage.setItem("dev:last-version", version_name);
    }
  });
}
