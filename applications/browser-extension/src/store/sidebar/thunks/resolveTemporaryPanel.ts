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

import { type SubmitPanelAction } from "../../../bricks/errors";
import { resolveTemporaryPanel as resolveTemporaryPanelMessenger } from "../../../contentScript/messenger/api";
import { getConnectedTarget } from "../../../sidebar/connectedTarget";
import { type SidebarState } from "../../../types/sidebarTypes";
import { type UUID } from "../../../types/stringTypes";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { partition } from "lodash";

type ResolveTemporaryPanelReturn =
  | {
      resolvedEntry: SidebarState["temporaryPanels"][number];
      temporaryPanels: SidebarState["temporaryPanels"];
    }
  | undefined;

const resolveTemporaryPanel = createAsyncThunk<
  ResolveTemporaryPanelReturn,
  { nonce: UUID; action: SubmitPanelAction },
  { state: { sidebar: SidebarState } }
>("sidebar/resolveTemporaryPanel", async ({ nonce, action }, { getState }) => {
  console.log("resolveTemporaryPanel", { nonce, action });
  const { temporaryPanels } = getState().sidebar;

  const [[resolvedEntry], otherTemporaryPanels] = partition(
    temporaryPanels,
    (panel) => panel.nonce === nonce,
  );

  if (!resolvedEntry) {
    return;
  }

  await resolvePanel(nonce, action);

  return {
    resolvedEntry,
    temporaryPanels: otherTemporaryPanels,
  };
});

/**
 * Resolve a panel with an action and optional detail
 * @param nonce the panel nonce
 * @param action the action to resolve the panel with
 */
async function resolvePanel(
  nonce: UUID,
  action: Pick<SubmitPanelAction, "type" | "detail">,
): Promise<void> {
  const topLevelFrame = await getConnectedTarget();
  resolveTemporaryPanelMessenger(topLevelFrame, nonce, action);
}

export default resolveTemporaryPanel;
