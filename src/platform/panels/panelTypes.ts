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

import type { PanelPayload, TemporaryPanelEntry } from "@/types/sidebarTypes";
import type { Location } from "@/types/starterBrickTypes";
import type { UUID } from "@/types/stringTypes";
import type { Placement } from "@/contentScript/popoverDom";
import type { Except, ValueOf } from "type-fest";
import { type Nullishable } from "@/utils/nullishUtils";

/**
 * @see RefreshTrigger
 */
// Match naming of the sidebar panel starter brick triggers
export const RefreshTriggers = {
  MANUAL: "manual",
  STATE_CHANGE: "statechange",
} as const;

/**
 * @see RefreshTriggers
 */
export type RefreshTrigger = ValueOf<typeof RefreshTriggers>;

export type TemporaryPanelEntryMetadata = Except<
  TemporaryPanelEntry,
  "type" | "nonce" | "payload"
>;

export type TemporaryPanelDefinition = {
  /**
   * The temporary panel entry.
   */
  panelEntryMetadata: TemporaryPanelEntryMetadata;
  /**
   * Factory function to generate the panel payload
   */
  getPayload: () => Promise<PanelPayload>;
  /**
   * The location to display the panel.
   */
  location: Location;
  /**
   * Target element for a popover.
   */
  target: HTMLElement | Document;
  /**
   * An optional abortSignal to cancel the panel.
   */
  signal?: AbortSignal;

  /**
   * An optional trigger to trigger a panel refresh.
   */
  refreshTrigger?: RefreshTrigger;

  /**
   * Handler when the user clicks outside the modal/popover.
   */
  onOutsideClick?: (nonce: UUID) => void;

  /**
   * Handler when the user clicks the close button on the modal/popover. If not provided, don't show the button.
   */
  onCloseClick?: Nullishable<(nonce: UUID) => void>;

  /**
   * Optional placement options for popovers.
   */
  popoverOptions?: {
    /**
     * The placement of the popover, default 'auto'
     */
    placement?: Placement;
  };
};
