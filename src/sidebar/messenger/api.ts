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
import { isMV3 } from "@/mv3/api";
import { isContentScript } from "webext-detect-page";
import {
  type PageTarget,
  getMethod,
  getNotifier,
  getThisFrame,
} from "webext-messenger";

export async function getSidebarInThisTab(): Promise<PageTarget> {
  if (!isMV3()) {
    return { tabId: "this", page: "/sidebar.html" };
  }

  if (!isContentScript()) {
    // Probably just other pages importing this file transitively, this is dead code
    return {
      page: "the sidebar API is only available from the content script",
    };
  }

  const frame = await getThisFrame();
  return {
    page: "/sidebar.html?tabId=" + frame.tabId,
  };
}

const target = getSidebarInThisTab();

const sidebarInThisTab = {
  renderPanels: getMethod("SIDEBAR_RENDER_PANELS", target),
  activatePanel: getMethod("SIDEBAR_ACTIVATE_PANEL", target),
  showForm: getMethod("SIDEBAR_SHOW_FORM", target),
  hideForm: getMethod("SIDEBAR_HIDE_FORM", target),
  /** @deprecated Deprecated only from the content script. Use this in the content script: import {pingSidebar} from '@/contentScript/sidebarController'; */
  pingSidebar: getMethod("SIDEBAR_PING", target),
  close: getNotifier("SIDEBAR_CLOSE", target),
  reload: getNotifier("SIDEBAR_RELOAD", target),
  showTemporaryPanel: getMethod("SIDEBAR_SHOW_TEMPORARY_PANEL", target),
  updateTemporaryPanel: getNotifier("SIDEBAR_UPDATE_TEMPORARY_PANEL", target),
  hideTemporaryPanel: getMethod("SIDEBAR_HIDE_TEMPORARY_PANEL", target),
  showModActivationPanel: getMethod("SIDEBAR_SHOW_ACTIVATE_RECIPE", target),
  hideModActivationPanel: getMethod("SIDEBAR_HIDE_ACTIVATE_RECIPE", target),
};

export default sidebarInThisTab;
