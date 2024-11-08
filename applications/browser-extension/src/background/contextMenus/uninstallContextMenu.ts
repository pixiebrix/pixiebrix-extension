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

import { makeMenuId } from "./makeMenuId";
import { type UUID } from "../../types/stringTypes";

/**
 * Uninstall the contextMenu UI for `modComponentId` from browser context menu on all tabs.
 *
 * Safe to call on non-context menu mod component ids.
 *
 * @returns true if the contextMenu was removed, or false if the contextMenu was not found.
 */
export async function uninstallContextMenu({
  modComponentId,
}: {
  modComponentId: UUID;
}): Promise<boolean> {
  try {
    await browser.contextMenus.remove(makeMenuId(modComponentId));
    console.debug(`Uninstalled context menu ${modComponentId}`);
    return true;
  } catch (error) {
    // Will throw if modComponentId doesn't refer to a context menu. The
    // callers don't have an easy way to check the type without having to
    // resolve the extensionPointId. So instead we'll just expect some of
    // the calls to fail.
    console.debug("Could not uninstall context menu %s", modComponentId, {
      error,
    });
    return false;
  }
}
