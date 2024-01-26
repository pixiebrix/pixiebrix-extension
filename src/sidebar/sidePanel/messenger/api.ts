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
 * @file This file defines the public API for the sidePanel, with some
 * exceptions that use `expectContext`. It uses the `messenger/api.ts` name
 * to match that expectation and avoid lint issues.
 */

import { isMV3 } from "@/mv3/api";
import { isContentScript } from "webext-detect-page";
import { getSidebarTarget } from "@/utils/sidePanelUtils";
import { type PageTarget, getThisFrame } from "webext-messenger";

export async function getSidebarTargetForCurrentTab(): Promise<PageTarget> {
  // Do not use `expectContext("contentScript")` here because other contexts import this file transitively.

  if (!isMV3()) {
    return { tabId: "this", page: "/sidebar.html" };
  }

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
