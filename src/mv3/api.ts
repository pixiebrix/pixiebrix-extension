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

/** @file Temporary helpers useful for the MV3 transition */

import { type Tabs } from "webextension-polyfill";
import { once } from "lodash";

export const isMV3 = once((): boolean => {
  if (!chrome.runtime?.getManifest) {
    return false;
  }

  // Use optional chaining in case the chrome runtime is not available:
  // https://github.com/pixiebrix/pixiebrix-extension/issues/8273
  return chrome.runtime.getManifest().manifest_version === 3;
});
export const browserAction = globalThis.chrome?.action;
export type Tab = Tabs.Tab | chrome.tabs.Tab;
