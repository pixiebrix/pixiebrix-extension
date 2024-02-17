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

const TOP_LEVEL_FRAME_ID = 0;

function getUrlParamTabId(): Nullishable<number> {
  const tabIdParam: Nullishable<string> = new URLSearchParams(
    location.search,
  ).get("tabId");
  return tabIdParam ? Number.parseInt(tabIdParam, 10) : null;
}

// This code might end up (unused) in non-dev bundles, so use `?.` to avoid errors from undefined values
let currentTabId: Nullishable<number> =
  globalThis.chrome?.devtools?.inspectedWindow?.tabId ?? getUrlParamTabId();

// The pageEditor only cares for the top frame
export function isCurrentTopFrame({ tabId, frameId }: Target): boolean {
  return frameId === TOP_LEVEL_FRAME_ID && tabId === currentTabId;
}

export class NotInspectingTabError extends Error {
  override name = "NotInspectingTabError";
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
  return tab.url;
}

/**
 * Message target for the tab being inspected by the devtools.
 *
 * The Page Editor only supports editing the top-level frame.
 */
export const inspectedTab = {
  tabId: currentTabId ?? 0,
  // The top-level frame
  frameId: 0,
} satisfies Target;

export const allFramesInThisTab = {
  tabId: inspectedTab.tabId,
  frameId: "allFrames",
} satisfies Target;

export function setInspectedTabId(tabId: number): void {
  currentTabId = tabId;
  inspectedTab.tabId = tabId;
  allFramesInThisTab.tabId = tabId;
}
