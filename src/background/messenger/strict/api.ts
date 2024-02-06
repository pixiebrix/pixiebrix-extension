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

/* Do not use `registerMethod` in this file */
import {
  backgroundTarget as bg,
  getMethod,
  getNotifier,
} from "webext-messenger";

export const showMySidePanel = getMethod("SHOW_MY_SIDE_PANEL", bg);
export const ensureContentScript = getMethod("INJECT_SCRIPT", bg);

export const dataStore = {
  get: getMethod("GET_DATA_STORE", bg),
  set: getMethod("SET_DATA_STORE", bg),
};
export const activatePartnerTheme = getMethod("ACTIVATE_PARTNER_THEME", bg);

export const traces = {
  addEntry: getNotifier("ADD_TRACE_ENTRY", bg),
  addExit: getNotifier("ADD_TRACE_EXIT", bg),
  clear: getMethod("CLEAR_TRACES", bg),
  clearAll: getNotifier("CLEAR_ALL_TRACES", bg),
};

export const captureTab = getMethod("CAPTURE_TAB", bg);
export const deleteCachedAuthData = getMethod("DELETE_CACHED_AUTH", bg);
export const getCachedAuthData = getMethod("GET_CACHED_AUTH", bg);
export const setToolbarBadge = getMethod("SET_TOOLBAR_BADGE", bg);
