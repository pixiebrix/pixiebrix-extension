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

import { type TemporaryPanelEntry } from "@/types/sidebarTypes";
import { expectContext } from "@/utils/expectContext";
import panelInThisTab from "@/bricks/transformers/temporaryInfo/messenger/api";
import { type UUID } from "@/types/stringTypes";
import { type Except } from "type-fest";
import { getTimedSequence } from "@/types/helpers";

/**
 * Update a modal/popover panel.
 *
 * For sidebar panels, see updateTemporarySidebarPanel.
 *
 * @param entry the new panel content
 * @see updateTemporarySidebarPanel
 */
export function updateTemporaryOverlayPanel(
  entry: Except<TemporaryPanelEntry, "type">,
): void {
  expectContext("contentScript");

  panelInThisTab.updateTemporaryPanel(getTimedSequence(), {
    type: "temporaryPanel",
    ...entry,
  });
}

export function setTemporaryOverlayPanel(args: {
  frameNonce: UUID;
  panelNonce: UUID;
}): void {
  expectContext("contentScript");

  panelInThisTab.setTemporaryPanelNonce(getTimedSequence(), args);
}
