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
import { type RegistryId } from "@/types/registryTypes";
import { type Draft } from "immer";

/* eslint-disable security/detect-object-injection -- lots of immer-style code here dealing with Records */

/**
 * Remove a given mod's extra data from a redux state object
 * @param state The editor redux state
 * @param modId The id of the mod to remove
 */
export function removeModData(state: Draft<EditorState>, modId: RegistryId) {
  if (state.activeModId === modId) {
    state.activeModId = null;
  }

  if (state.expandedModId === modId) {
    state.expandedModId = null;
  }

  delete state.dirtyModOptionsById[modId];
  delete state.dirtyModMetadataById[modId];
  delete state.deletedModComponentFormStatesByModId[modId];
}

/* eslint-enable security/detect-object-injection */
