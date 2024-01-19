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
  type Target,
  type PageTarget,
  getMethod,
  getNotifier,
  getThisFrame,
} from "webext-messenger";

const target: Target | PageTarget = isMV3()
  ? { page: "/sidebar.html" }
  : { tabId: "this", page: "/sidebar.html" };

if (isContentScript() && isMV3()) {
  // Unavoidable race condition: we can't message the sidebar until we know the tabId.
  // TODO: Drop if this is ever implemented https://github.com/pixiebrix/webext-messenger/issues/193
  // eslint-disable-next-line promise/prefer-await-to-then
  void getThisFrame().then((frame) => {
    target.page += "?tabId=" + frame.tabId;
  });
}

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
