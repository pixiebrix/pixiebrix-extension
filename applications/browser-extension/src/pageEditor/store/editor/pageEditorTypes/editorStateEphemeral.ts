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

import { type BrickConfig } from "@/bricks/types";
import { type SimpleErrorObject } from "@/errors/errorHelpers";
import { type ModalDefinition } from "@/pageEditor/store/editor/pageEditorTypes";
import { type UUID } from "@/types/stringTypes";

/**
 * Page Editor Slice state that should not be persisted using redux-persist.
 * Prefer `null` to `undefined` to require the keys in initialEphemeralState
 * All keys are necessary to properly set the blacklist in persistEditorConfig
 *
 * @see EditorStateMigratedV<N>
 * @see EditorStateSynced
 * @see initialEphemeralState
 * @see persistEditorConfig
 */
export type EditorStateEphemeral = {
  /**
   * A clipboard-style-copy of a brick ready to paste into a brick pipeline
   */
  copiedBrick: BrickConfig | null;

  /**
   * A serialized error that has occurred in the page editor
   */
  error: SimpleErrorObject | null;

  /**
   * A sequence number that changes whenever a new element is selected.
   *
   * Can use as a React component key to trigger a re-render
   */
  selectionSeq: number;

  /**
   * Which modal are we showing, if any?
   */
  visibleModal: ModalDefinition | null;

  /**
   * The available activated mod components for the current tab
   */
  availableActivatedModComponentIds: UUID[];

  /**
   * The availableActivatedModComponentIds are being calculated
   */
  isPendingAvailableActivatedModComponents: boolean;

  /**
   * The available draft mod components for the current tab
   */
  availableDraftModComponentIds: UUID[];

  /**
   * The availableDraftModComponentIds are being calculated
   */
  isPendingDraftModComponents: boolean;
  /**
   * Is the variable popover visible?
   * @since 1.7.34
   */
  isVariablePopoverVisible: boolean;
};
