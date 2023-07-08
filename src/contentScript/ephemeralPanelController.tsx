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

import { type TemporaryPanelEntry } from "@/types/sidebarTypes";
import { expectContext } from "@/utils/expectContext";
import panelInThisTab from "@/blocks/transformers/temporaryInfo/messenger/api";
import { type UUID } from "@/types/stringTypes";
import { type Except } from "type-fest";

/**
 * Sequence number for ensuring render requests are handled in order
 */
let renderSequenceNumber = 0;

/**
 * Update a modal/popover panel.
 *
 * For sidebar panels, see updateTemporarySidebarPanel.
 *
 * @param entry the new panel content
 * @see updateTemporarySidebarPanel
 */
export function updateTemporaryOverlayPanel(
  entry: Except<TemporaryPanelEntry, "type">
): void {
  expectContext("contentScript");

  const sequence = renderSequenceNumber++;
  panelInThisTab.updateTemporaryPanel(sequence, {
    type: "temporaryPanel",
    ...entry,
  });
}

export function setTemporaryOverlayPanel(args: {
  frameNonce: UUID;
  panelNonce: UUID;
}): void {
  expectContext("contentScript");

  const sequence = renderSequenceNumber++;
  panelInThisTab.setTemporaryPanelNonce(sequence, args);
}
