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

import { cancelTemporaryPanel } from "@/contentScript/messenger/api";
import { getConnectedTarget } from "@/sidebar/connectedTarget";
import { eventKeyForEntry } from "@/store/sidebar/eventKeyUtils";
import {
  type SidebarState,
  type TemporaryPanelEntry,
} from "@/types/sidebarTypes";
import { type UUID } from "@/types/stringTypes";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { partition } from "lodash";

type AddTemporaryPanelReturn = {
  temporaryPanels: SidebarState["temporaryPanels"];
  activeKey: SidebarState["activeKey"];
};

const addTemporaryPanel = createAsyncThunk<
  AddTemporaryPanelReturn,
  { panel: TemporaryPanelEntry },
  { state: { sidebar: SidebarState } }
>("sidebar/addTemporaryPanel", async ({ panel }, { getState }) => {
  const { temporaryPanels } = getState().sidebar;

  const [existingExtensionTemporaryPanels, otherTemporaryPanels] = partition(
    temporaryPanels,
    (x) => x.componentRef.extensionId === panel.componentRef.extensionId,
  );

  // Cancel all panels for the extension, except if there's a placeholder that was added in setInitialPanels
  await cancelPanels(
    existingExtensionTemporaryPanels
      .filter((x) => x.nonce !== panel.nonce)
      .map(({ nonce }) => nonce),
  );

  return {
    temporaryPanels: [...otherTemporaryPanels, panel],
    activeKey: eventKeyForEntry(panel),
  };
});

async function cancelPanels(nonces: UUID[]): Promise<void> {
  const topLevelFrame = await getConnectedTarget();
  cancelTemporaryPanel(topLevelFrame, nonces);
}

export default addTemporaryPanel;
