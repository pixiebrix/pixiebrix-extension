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

/** @file This file contains utilities to deal with the sidePanel from other contexts */

import { getErrorMessage } from "../errors/errorHelpers";
import { forbidContext, isBrowserSidebarTopFrame } from "./expectContext";
import { type PageTarget, messenger, getThisFrame } from "webext-messenger";
import { isContentScript } from "webext-detect";
import { type ModComponentRef } from "@/types/modComponentTypes";

/**
 * Options for opening the side panel. E.g., the default panel to open.
 * @since 2.0.6
 */
type OpenSidePanelOptions = {
  initialModComponentRef?: ModComponentRef;
};

/**
 * Returns true if an error showing sidebar is due to a missing user gesture.
 */
export function isUserGestureRequiredError(error: unknown): boolean {
  return getErrorMessage(error).includes("user gesture");
}

export async function openSidePanel(
  tabId: number,
  options: OpenSidePanelOptions = {},
): Promise<void> {
  if (isBrowserSidebarTopFrame()) {
    console.warn(
      'The sidePanel called "openSidePanel". This should not happen.',
    );
    return;
  }

  forbidContext(
    "contentScript",
    "The content script doesn't have direct access to the `sidePanel` API. Call `showMySidePanel` instead",
  );

  await _openSidePanel(tabId, options);
}

async function _openSidePanel(
  tabId: number,
  options: OpenSidePanelOptions = {},
): Promise<void> {
  // Simultaneously enable and open the side panel.
  // If we wait too long before calling .open(), we will lose the "user gesture" permission
  // There is no way to know whether the side panel is open yet, so we call it regardless.
  void chrome.sidePanel.setOptions({
    tabId,
    enabled: true,
    // Very seldom, the side panel will not open if path is not set again here
    path: getSidebarPath(tabId, options),
  });

  try {
    await chrome.sidePanel.open({ tabId });
  } catch (error) {
    // In some cases, `openSidePanel` is called as a precaution and it might work if
    // it's still part of a user gesture.
    // If it's not, it will throw an error *even if the side panel is already open*.
    // The following code silences that error iff the side panel is already open.
    if (isUserGestureRequiredError(error) && (await isSidePanelOpen(tabId))) {
      // The `openSidePanel` call was not required in the first place, the error can be silenced
      // TODO: After switching to MV3, verify whether we drop that `openSidePanel` call
      return;
    }

    throw error;
  }
}

async function isSidePanelOpen(tabId: number): Promise<boolean> {
  forbidContext(
    "sidebar",
    "The sidebar shouldn't ask whether it's open. The code should be refactored to avoid this call.",
  );

  try {
    await messenger("SIDEBAR_PING", { retry: false }, getSidebarTarget(tabId));
    return true;
  } catch {
    return false;
  }
}

export function getSidebarPath(
  tabId: number,
  { initialModComponentRef }: OpenSidePanelOptions = {},
): string {
  const paramObj: Record<string, string> = {
    tabId: tabId.toString(),
  };

  if (initialModComponentRef) {
    paramObj.initialModComponentRef = JSON.stringify(initialModComponentRef);
  }

  return "/sidebar.html?" + new URLSearchParams(paramObj).toString();
}

export function getSidebarTarget(tabId: number): PageTarget {
  return {
    page: getSidebarPath(tabId),
  };
}

export async function getSidebarTargetForCurrentTab(): Promise<PageTarget> {
  // Do not use `expectContext("contentScript")` here because other contexts import this file transitively.

  if (!isContentScript()) {
    // The background imports the sidebar controller, which imports the API, which calls this function.
    // No messages are actually sent anywhere through this path.
    return {
      page: "Use `getSidebarTarget` instead of `getSidebarTargetForCurrentTab` in contexts other than the content script",
    };
  }

  const frame = await getThisFrame();
  return getSidebarTarget(frame.tabId);
}
