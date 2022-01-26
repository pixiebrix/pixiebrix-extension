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

/** @file This is a standalone background entry point that must run independendently of the rest of extension */

const { icons } = chrome.runtime.getManifest();
const inactiveIcons = {};
for (const [size, path] of Object.entries(icons)) {
  // eslint-disable-next-line security/detect-object-injection -- Safe
  inactiveIcons[size] = path.replace("icons", "icons/inactive");
}

(chrome.browserAction ?? chrome.action).setIcon({ path: inactiveIcons });
/* `activateBrowserActionIcon()` will later fix the icon if the file runs */
