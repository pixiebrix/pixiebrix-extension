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

/**
 * @file This file MUST not have dependencies as it's meant to be tiny
 * and imported by browserActionInstantHandler.ts
 */

import { isMV3 } from "@/mv3/api";
import { hideSidebarPanel, showSidebarPanel } from "@/background/messenger/api";

if (!isMV3()) {
  throw new Error(
    "sidebarDomControllerLiteMv3.ts should not be imported in MV2",
  );
}

// TODO: drop constant. Is referenced by notify.tsx to calculate offset
export const SIDEBAR_WIDTH_CSS_PROPERTY = "--pb-sidebar-width";

// FIXME: fix to true for now so mods run. The device at the bottom of the file to keep in sync isn't working properly.
let sidePanelOpen = true;

/**
 * Return true if side panel is open. The PixieBrix sidebar might not be initialized yet.
 */
export function isSidebarFrameVisible(): boolean {
  // TODO: implement this. Used as performance optimization for determining whether or not to run sidebar mods.

  // This method will have to become async unless we listen and set a synchronous module variable.
  // Ideally it would stay synchronous so we don't have to refactor all the code that calls it.

  // Potential options:
  // - Can we use chrome.sidePanel.getOptions() to signal if it's open?
  // - Might be able to subscribe via https://stackoverflow.com/a/77106777/402560. But may need extra machinery
  //   to handle background worker restarts.
  return sidePanelOpen;
}

/** Removes the element; Returns false if no element was found */
export function removeSidebarFrame(): boolean {
  if (isSidebarFrameVisible()) {
    void hideSidebarPanel();
    return true;
  }

  return false;
}

/** Inserts the element; Returns false if it already existed */
export function insertSidebarFrame(): boolean {
  // FIXME: this loses the user gesture when called from DevTools (e.g., RenderPanel)
  // That could be this timing bug:
  // - https://stackoverflow.com/a/77213912
  // - https://bugs.chromium.org/p/chromium/issues/detail?id=1478648
  // Or, it could be that user gestures in DevTools don't count

  void showSidebarPanel();

  return true;
}

/**
 * Toggle the sidebar frame. Returns true if the sidebar is now visible, false otherwise.
 */
export function toggleSidebarFrame(): boolean {
  if (isSidebarFrameVisible()) {
    removeSidebarFrame();
    return false;
  }

  insertSidebarFrame();
  return true;
}

export function init(): void {
  console.debug("sidebarDomControllerLiteMv3:initialize");

  // FIXME: this doesn't see onConnect event from the sidebar
  chrome.runtime.onConnect.addListener((port) => {
    if (port.name === "sidepanel") {
      sidePanelOpen = true;

      port.onDisconnect.addListener(async () => {
        sidePanelOpen = false;
      });

      port.onMessage.addListener(async (message) => {
        // FIXME: filter out messages from side panels associated with other tabs
        if (message.type === "keepalive") {
          console.debug("sidebarDomControllerLiteMv3:keepalive", message);
          sidePanelOpen = !message.hidden;
        }
      });
    }
  });
}
