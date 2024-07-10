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

import { type EditorState } from "@/pageEditor/store/editor/pageEditorTypes";
import { clearModComponentTraces } from "@/telemetry/trace";
import { type UUID } from "@/types/stringTypes";
import { type Draft } from "immer";

/* eslint-disable security/detect-object-injection -- lots of immer-style code here dealing with Records */

/**
 * Remove a mod component form state from the Page Editor. This could result in deleting the mod component if
 * it is not saved to the cloud as a standalone mod.
 * @param state The redux state (slice)
 * @param uuid The id for the mod component to remove
 */
export function removeModComponentFormState(
  state: Draft<EditorState>,
  uuid: UUID,
) {
  if (state.activeModComponentId === uuid) {
    state.activeModComponentId = null;
  }

  // Some mod components in a mod may not have a corresponding mod component form state due to having never been selected
  // by the user in the UI. In this case, the mod component form state will not be in redux.
  const index = state.modComponentFormStates.findIndex((x) => x.uuid === uuid);
  if (index > -1) {
    state.modComponentFormStates.splice(index, 1);
  }

  delete state.dirty[uuid];
  delete state.brickPipelineUIStateById[uuid];

  const draftIndex = state.availableDraftModComponentIds.indexOf(uuid);
  if (draftIndex > -1) {
    // Mod component is available, remove from list of available ids
    state.availableDraftModComponentIds.splice(draftIndex, 1);
  }

  // Make sure we're not keeping any private data around from Page Editor sessions
  void clearModComponentTraces(uuid);
}

/* eslint-enable security/detect-object-injection */
