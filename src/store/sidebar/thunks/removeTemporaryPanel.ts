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

import { closeTemporaryPanel } from "@/contentScript/messenger/api";
import { getConnectedTarget } from "@/sidebar/connectedTarget";
import { type SidebarState } from "@/types/sidebarTypes";
import { type UUID } from "@/types/stringTypes";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { partition } from "lodash";

type RemoveTemporaryPanelReturn =
  | {
      removedEntry: SidebarState["temporaryPanels"][number];
      temporaryPanels: SidebarState["temporaryPanels"];
    }
  | undefined;

const removeTemporaryPanel = createAsyncThunk<
  RemoveTemporaryPanelReturn,
  UUID,
  { state: { sidebar: SidebarState } }
>("sidebar/removeTemporaryPanel", async (nonce, { getState }) => {
  const { temporaryPanels } = getState().sidebar;

  const [[removedEntry], otherTemporaryPanels] = partition(
    temporaryPanels,
    (panel) => panel.nonce === nonce,
  );

  if (!removedEntry) {
    return;
  }

  await closePanels([nonce]);

  return {
    removedEntry,
    temporaryPanels: otherTemporaryPanels,
  };
});

/**
 * Resolve panels without action/data.
 * @param nonces panel nonces
 */
async function closePanels(nonces: UUID[]): Promise<void> {
  const topLevelFrame = await getConnectedTarget();
  closeTemporaryPanel(topLevelFrame, nonces);
}

export default removeTemporaryPanel;
