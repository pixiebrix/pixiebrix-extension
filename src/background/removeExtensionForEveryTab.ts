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

import {
  removePersistedModComponent,
  removeSidebars,
  removeDraftModComponents,
} from "@/contentScript/messenger/api";
import { forEachTab } from "@/utils/extensionUtils";
import { type UUID } from "@/types/stringTypes";
import { uninstallContextMenu } from "./contextMenus/uninstallContextMenu";
import { clearExtensionTraces } from "@/telemetry/trace";
import { clearLog } from "@/telemetry/logging";

export async function removeExtensionForEveryTab(
  extensionId: UUID,
): Promise<void> {
  console.debug("Remove extension for all tabs", { extensionId });

  await forEachTab(async ({ tabId }) => {
    const allFrames = { tabId, frameId: "allFrames" } as const;
    removePersistedModComponent(allFrames, extensionId);
    removeDraftModComponents(allFrames, { uuid: extensionId });
    await removeSidebars({ tabId }, [extensionId]);
  });
  await uninstallContextMenu({ extensionId });
  await clearExtensionTraces(extensionId);
  await clearLog({ extensionId });
}
