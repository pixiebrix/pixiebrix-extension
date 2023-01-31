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
import { getMethod, getNotifier } from "webext-messenger";

const target = { tabId: "this", page: "/sidebar.html" } as const;
const sidebarInThisTab = {
  renderPanels: getMethod("SIDEBAR_RENDER_PANELS", target),
  activatePanel: getMethod("SIDEBAR_ACTIVATE_PANEL", target),
  showForm: getMethod("SIDEBAR_SHOW_FORM", target),
  hideForm: getMethod("SIDEBAR_HIDE_FORM", target),
  pingSidebar: getMethod("SIDEBAR_PING", target),
  showTemporaryPanel: getMethod("SIDEBAR_SHOW_TEMPORARY_PANEL", target),
  updateTemporaryPanel: getNotifier("SIDEBAR_UPDATE_TEMPORARY_PANEL", target),
  hideTemporaryPanel: getMethod("SIDEBAR_HIDE_TEMPORARY_PANEL", target),
};

export default sidebarInThisTab;
