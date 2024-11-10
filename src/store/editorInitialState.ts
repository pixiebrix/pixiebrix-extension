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
  type EditorStateEphemeral,
  type EditorState,
  type EditorStateSynced,
} from "@/pageEditor/store/editor/pageEditorTypes";

/**
 * We use `Required` to protect against accidentally making a key optional in EditorStateEphemeral
 * All keys are necessary to properly set the blacklist in persistEditorConfig
 */
export const initialEphemeralState: Required<EditorStateEphemeral> = {
  copiedBrick: null,
  error: null,
  selectionSeq: 0,
  visibleModal: null,
  availableActivatedModComponentIds: [],
  isPendingAvailableActivatedModComponents: false,
  availableDraftModComponentIds: [],
  isPendingDraftModComponents: false,
  isVariablePopoverVisible: false,
} as const;

/**
 * We use `Required` to protect against accidentally making a key optional in EditorStateSynced
 * The initialSyncedState is used to reset the synced state during EditorStateMigratedV<N>
 * migrations, so every key must have an initial value
 */
export const initialSyncedState: Required<EditorStateSynced> = {
  activeModComponentId: null,
  activeModId: null,
  expandedModId: null,
  brickPipelineUIStateById: {},
  isDataPanelExpanded: true,
  isModListingPanelExpanded: true,
  findOptionsByModId: {},
} as const;

export const initialState: EditorState = {
  ...initialEphemeralState,
  ...initialSyncedState,
  modComponentFormStates: [],
  dirty: {},
  dirtyModMetadataById: {},
  dirtyModOptionsDefinitionById: {},
  dirtyModVariablesDefinitionById: {},
  dirtyModOptionsArgsById: {},
  deletedModComponentFormStateIdsByModId: {},
  isDimensionsWarningDismissed: false,
} as const;
