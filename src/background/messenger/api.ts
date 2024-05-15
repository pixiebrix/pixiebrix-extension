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

/* Do not use `registerMethod` in this file */
import {
  backgroundTarget as bg,
  getMethod,
  getNotifier,
} from "webext-messenger";

export const removeExtensionForEveryTab = getNotifier(
  "REMOVE_EXTENSION_EVERY_TAB",
  bg,
);

export const clearServiceCache = getMethod("CLEAR_SERVICE_CACHE", bg);

export const contextMenus = {
  preload: getMethod("PRELOAD_CONTEXT_MENUS", bg),
};

export const getUserData = getMethod("GET_USER_DATA", bg);

export const installStarterBlueprints = getMethod(
  "INSTALL_STARTER_BLUEPRINTS",
  bg,
);
