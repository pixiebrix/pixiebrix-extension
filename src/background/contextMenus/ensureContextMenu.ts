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

import { makeMenuId } from "@/background/contextMenus/makeMenuId";
import { type SelectionMenuOptions } from "@/platform/platformTypes/contextMenuProtocol";
import { expectContext } from "@/utils/expectContext";
import { memoizeUntilSettled } from "@/utils/promiseUtils";
import chromeP from "webext-polyfill-kinda";
import { type Menus } from "webextension-polyfill";

/**
 * Register a context menu item on all tabs.
 */

async function _ensureContextMenu({
  modComponentId,
  contexts,
  title,
  documentUrlPatterns,
}: SelectionMenuOptions): Promise<void> {
  expectContext("background");

  if (!modComponentId) {
    throw new Error("extensionId is required");
  }

  const updateProperties = {
    type: "normal",
    title,
    // At least one context type must be specified
    // https://github.com/pixiebrix/pixiebrix-extension/issues/7100
    contexts: contexts?.length ? contexts : ["all"],
    documentUrlPatterns,
  } satisfies Menus.UpdateUpdatePropertiesType;

  const expectedMenuId = makeMenuId(modComponentId);
  try {
    // Try updating it first. It will fail if missing, so we attempt to create it instead
    await browser.contextMenus.update(expectedMenuId, updateProperties);
  } catch {
    // WARNING: Do not remove `chromeP`
    // The standard `contextMenus.create` does not return a Promise in any browser
    // https://github.com/w3c/webextensions/issues/188#issuecomment-1112436359
    // eslint-disable-next-line @typescript-eslint/await-thenable -- The types don't really match `chromeP`
    await chromeP.contextMenus.create({
      ...updateProperties,
      id: expectedMenuId,
    } as chrome.contextMenus.CreateProperties);
  }
}

export const ensureContextMenu = memoizeUntilSettled(_ensureContextMenu, {
  cacheKey: ([{ modComponentId }]) => modComponentId,
});
