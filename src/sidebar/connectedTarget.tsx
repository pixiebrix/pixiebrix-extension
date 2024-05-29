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

import { expectContext, isBrowserSidebarTopFrame } from "@/utils/expectContext";
import { assertNotNullish } from "@/utils/nullishUtils";
import { once } from "lodash";
import { getTopLevelFrame, type TopLevelFrame } from "webext-messenger";
import { getTabUrl } from "webext-tools";

export function getConnectedTabIdForSidebarTopFrame(): number {
  expectContext("sidebar");

  if (location.pathname !== "/sidebar.html") {
    throw new Error(
      `getConnectedTabIdForSidebarTopFrame can only be called from the sidebar's top frame. The current location is ${location.href}.`,
    );
  }

  const tabId = new URLSearchParams(window.location.search).get("tabId");
  assertNotNullish(
    tabId,
    `No tabId argument was found on this page: ${window.location.href}`,
  );
  return Number(tabId);
}

export const getConnectedTabId = once(getConnectedTabIdForSidebarTopFrame);

/**
 * @returns the Target for the top level frame for the current tab
 * @context sidePanel, sidebar iframe, content script iframes
 */
// TODO: Drop support for "content script iframes" because it doesn't belong to `@/sidebar/connectedTarget`
// https://github.com/pixiebrix/pixiebrix-extension/pull/7354#discussion_r1461563961
export const getConnectedTarget: () => Promise<TopLevelFrame> =
  isBrowserSidebarTopFrame()
    ? async () => ({
        tabId: getConnectedTabIdForSidebarTopFrame(),
        frameId: 0,
      })
    : getTopLevelFrame;

export async function getConnectedTargetUrl(): Promise<string | undefined> {
  return getTabUrl(await getConnectedTarget());
}
