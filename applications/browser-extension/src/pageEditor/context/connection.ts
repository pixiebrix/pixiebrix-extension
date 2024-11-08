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

import type { Target } from "webext-messenger";
import { expectContext } from "@/utils/expectContext";
import type { Nullishable } from "@/utils/nullishUtils";

// This is true enough for Page Editor purposes because we're editing the rendered frame:
// https://developer.chrome.com/blog/extension-instantnav
const TOP_LEVEL_FRAME_ID = 0;

/**
 * Error thrown when the Page Editor is not pointed to a tab.
 */
class NotInspectingTabError extends Error {
  override name = "NotInspectingTabError";
}

function getUrlParamTabId(): Nullishable<number> {
  const tabIdParam: Nullishable<string> = new URLSearchParams(
    location.search,
  ).get("tabId");
  return tabIdParam ? Number.parseInt(tabIdParam, 10) : null;
}

let currentTabId: Nullishable<number> =
  // This code might end up (unused) in non-devtools bundles, so use `?.` to avoid errors from undefined values
  globalThis.chrome?.devtools?.inspectedWindow?.tabId ?? getUrlParamTabId();

/**
 * Check if the given frame is being edited by the Page Editor. Currently, the Page Editor only supports
 * editing the top-level frame.
 * @param tabId the query tab id
 * @param frameId the query frame id
 */
export function isCurrentTopFrame({ tabId, frameId }: Target): boolean {
  // The pageEditor only cares for the top frame
  return frameId === TOP_LEVEL_FRAME_ID && tabId === currentTabId;
}

/**
 * Get the URL of the tab being inspected by the Page Editor.
 * @throws NotInspectingTabError if the Page Editor is not inspecting a tab.
 */
export async function getCurrentInspectedURL(): Promise<string> {
  expectContext("pageEditor");

  if (!currentTabId) {
    throw new NotInspectingTabError();
  }

  const tab = await browser.tabs.get(currentTabId);

  if (!tab.url) {
    throw new Error("PixieBrix does not have access to the inspected tab");
  }

  return tab.url;
}

/**
 * Message target for the tab being edited by the Page Editor.
 *
 * The Page Editor only supports editing the top-level frame.
 */
export const inspectedTab = {
  tabId: currentTabId ?? 0,
  // The top-level frame
  frameId: 0,
} satisfies Target;

/**
 * Messenger target for all frames on the tab being edited by the Page Editor.
 */
export const allFramesInInspectedTab = {
  tabId: inspectedTab.tabId,
  frameId: "allFrames",
} satisfies Target;

/**
 * Setter for updated the tab being inspected by the Page Editor. Does not verify the tab exists/is valid.
 * @param tabId the new tab id
 */
export function setInspectedTabId(tabId: number): void {
  currentTabId = tabId;
  inspectedTab.tabId = tabId;
  allFramesInInspectedTab.tabId = tabId;
}
