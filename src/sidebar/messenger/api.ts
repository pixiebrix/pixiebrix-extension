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
  getMethod,
  getNotifier,
  getThisFrame,
  type PageTarget,
} from "webext-messenger";
import { isMV3 } from "@/mv3/api";
import type { Target } from "@/types/messengerTypes";

function bindToMethodTarget<T extends keyof MessengerMethods>(type: T) {
  return async (
    ...args: Parameters<MessengerMethods[T]>
  ): Promise<ReturnType<MessengerMethods[T]>> => {
    const { tabId } = await getThisFrame();

    const target: Target | PageTarget = isMV3()
      ? { page: `/sidebar.html?tabId=${tabId}` }
      : { tabId: "this", page: "/sidebar.html" };

    console.debug("bindToMethodTarget", { type, target, args });

    const method = getMethod(type, target);
    // @ts-expect-error -- :shrug: figure out types later
    return method(...args);
  };
}

function bindToNotifierTarget<T extends keyof MessengerMethods>(type: T) {
  return async (...args: Parameters<MessengerMethods[T]>): Promise<void> => {
    const { tabId } = await getThisFrame();

    const target: Target | PageTarget = isMV3()
      ? { page: `/sidebar.html?tabId=${tabId}` }
      : { tabId: "this", page: "/sidebar.html" };

    console.debug("bindToNotifierTarget", { type, target, args });

    const method = getNotifier(type);
    // @ts-expect-error -- :shrug: figure out types later
    method(target, ...args);
  };
}

const sidebarInThisTab = {
  renderPanels: bindToMethodTarget("SIDEBAR_RENDER_PANELS"),
  activatePanel: bindToMethodTarget("SIDEBAR_ACTIVATE_PANEL"),
  showForm: bindToMethodTarget("SIDEBAR_SHOW_FORM"),
  hideForm: bindToMethodTarget("SIDEBAR_HIDE_FORM"),
  pingSidebar: bindToMethodTarget("SIDEBAR_PING"),
  showTemporaryPanel: bindToMethodTarget("SIDEBAR_SHOW_TEMPORARY_PANEL"),
  updateTemporaryPanel: bindToNotifierTarget("SIDEBAR_UPDATE_TEMPORARY_PANEL"),
  hideTemporaryPanel: bindToMethodTarget("SIDEBAR_HIDE_TEMPORARY_PANEL"),
  showModActivationPanel: bindToMethodTarget("SIDEBAR_SHOW_ACTIVATE_RECIPE"),
  hideModActivationPanel: bindToMethodTarget("SIDEBAR_HIDE_ACTIVATE_RECIPE"),
};

export default sidebarInThisTab;
